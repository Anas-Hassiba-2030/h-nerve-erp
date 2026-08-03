// lib/voac/runStore.live.ts — the DB twin of runStore.ts.
//
// Thin on purpose. Every decision lives in the pure core; this file only
// translates a validated payload into a row. If you find yourself adding an
// `if` here, it probably belongs in runStore.ts where it can be unit-tested.
//
// Uses the scoped `prisma` client, so tenant isolation is applied by the
// middleware rather than re-implemented per call site (docs/ISOLATION.md).
//
// NOTE ON D1: there are no interactive transactions on Cloudflare D1 —
// `$transaction` callbacks run WITHOUT atomicity. So nothing here relies on a
// multi-statement rollback. Runs and steps are append-only, and the one place
// order matters (finishing a run) is a single UPDATE.

import { prisma } from "@/lib/db/db";
import {
  startRun,
  rollupRun,
  finalRunStatus,
  canDecide,
  canRecordOutcome,
  type StartRunRequest,
  type StepKind,
  type RunStatus,
  type DecisionRequest,
} from "./runStore";
import { defaultRosterFor, serializeRoster } from "./roles";

/**
 * Open a run. A refused run is still written — status "REFUSED" with the
 * reason in `error` — so "the agent declined" is answerable from the ledger
 * instead of being invisible.
 */
export async function openRun(req: StartRunRequest) {
  const decision = startRun(req);
  const run = await prisma.agentRun.create({ data: decision.payload });
  return decision.ok
    ? { ok: true as const, run, estimatedLlmCalls: decision.estimatedLlmCalls }
    : { ok: false as const, run, reason: decision.reason };
}

export type AppendStepInput = {
  tenantId: string;
  runId: string;
  roleId: string;
  kind: StepKind;
  input: string;
  output?: string | null;
  parentStepId?: string | null;
  score?: number | null;
  scoredBy?: "human" | "rubric" | "self" | null;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  error?: string | null;
};

/**
 * Append a step. `seq` is derived from the current count under the same
 * parent, so ordering survives equal timestamps — D1 timestamps are coarse
 * enough that two steps in the same millisecond is routine.
 */
export async function appendStep(input: AppendStepInput) {
  const seq = await prisma.agentStep.count({
    where: { runId: input.runId, parentStepId: input.parentStepId ?? null },
  });

  return prisma.agentStep.create({
    data: {
      tenantId: input.tenantId,
      runId: input.runId,
      parentStepId: input.parentStepId ?? null,
      seq,
      roleId: input.roleId,
      kind: input.kind,
      input: input.input,
      output: input.output ?? null,
      score: input.score ?? null,
      scoredBy: input.scoredBy ?? null,
      tokensIn: input.tokensIn ?? 0,
      tokensOut: input.tokensOut ?? 0,
      latencyMs: input.latencyMs ?? 0,
      error: input.error ?? null,
    },
  });
}

/** Close a run, rolling its totals up from the steps actually recorded. */
export async function closeRun(
  runId: string,
  opts: { budgetExhausted?: boolean; stub?: boolean; llmCalls?: number } = {},
): Promise<{ status: RunStatus }> {
  const steps = await prisma.agentStep.findMany({
    where: { runId },
    select: { tokensIn: true, tokensOut: true, latencyMs: true, score: true, error: true },
  });

  const totals = rollupRun(steps);
  const status = finalRunStatus(totals, opts);

  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status,
      tokensIn: totals.tokensIn,
      tokensOut: totals.tokensOut,
      latencyMs: totals.latencyMs,
      llmCalls: opts.llmCalls ?? totals.steps,
      endedAt: new Date(),
    },
  });

  return { status };
}

export type ProposalInput = {
  tenantId: string;
  runId: string;
  companyId: string | null;
  counterpartyCompanyId?: string | null;
  title: string;
  rationale: string;
  estimatedValueJod?: number | null;
};

/**
 * Record a proposal. This is the ONLY thing the VOAC writes that a human acts
 * on — the read-mostly boundary made durable. No domain table is touched here
 * or anywhere else in this pillar.
 */
export async function createProposal(input: ProposalInput) {
  return prisma.agentProposal.create({
    data: {
      tenantId: input.tenantId,
      runId: input.runId,
      companyId: input.companyId,
      counterpartyCompanyId: input.counterpartyCompanyId ?? null,
      title: input.title,
      rationale: input.rationale,
      estimatedValueJod: input.estimatedValueJod ?? null,
      status: "PENDING",
    },
  });
}

/**
 * A human accepts or rejects. Guarded by the pure core: a proposal cannot be
 * decided twice, and a decision must name its owner.
 */
export async function decideProposal(proposalId: string, req: DecisionRequest) {
  const existing = await prisma.agentProposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });
  if (!existing) return { ok: false as const, reason: "Proposal not found." };

  const guard = canDecide({ status: existing.status as never }, req);
  if (!guard.ok) return { ok: false as const, reason: guard.reason };

  const updated = await prisma.agentProposal.update({
    where: { id: proposalId },
    data: {
      status: req.status,
      decidedById: req.decidedById,
      decidedAt: new Date(),
      decisionNote: req.note ?? null,
    },
  });
  return { ok: true as const, proposal: updated };
}

/**
 * Record what actually happened, 30–60 days later.
 *
 * This is the only non-circular reward signal the system has: a self-assessed
 * score measures the grader, not the business. Guarded so an outcome cannot be
 * attached to a proposal nobody acted on.
 */
export async function recordOutcome(proposalId: string, realizedValueJod: number) {
  const existing = await prisma.agentProposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });
  if (!existing) return { ok: false as const, reason: "Proposal not found." };

  const guard = canRecordOutcome({ status: existing.status as never });
  if (!guard.ok) return { ok: false as const, reason: guard.reason };

  const updated = await prisma.agentProposal.update({
    where: { id: proposalId },
    data: { realizedValueJod, realizedAt: new Date() },
  });
  return { ok: true as const, proposal: updated };
}

/**
 * Fetch a company's roster, creating the sector default on first use.
 *
 * Defaulting rather than erroring is deliberate: a company that has never been
 * configured should still have a working VOAC, and an empty roster is a valid
 * outcome for a sector with no roles defined yet.
 */
export async function ensureRoster(args: { tenantId: string; companyId: string; sector: string }) {
  const existing = await prisma.voacRoster.findFirst({
    where: { tenantId: args.tenantId, companyId: args.companyId },
  });
  if (existing) return existing;

  return prisma.voacRoster.create({
    data: {
      tenantId: args.tenantId,
      companyId: args.companyId,
      roleIds: serializeRoster(defaultRosterFor(args.sector)),
    },
  });
}

/** How many proposals this tenant has put in front of humans since `since`. */
export async function proposalsUsedSince(tenantId: string, since: Date): Promise<number> {
  return prisma.agentProposal.count({
    where: { tenantId, createdAt: { gte: since } },
  });
}
