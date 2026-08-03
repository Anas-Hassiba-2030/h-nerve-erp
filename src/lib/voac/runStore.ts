// lib/voac/runStore.ts — the pure core of VOAC run recording.
//
// Everything here is a decision ABOUT a row: what payload to write, what a run
// totals up to, whether a status transition is legal, whether a proposal may be
// decided. No Prisma, no clock, no request context — the DB twin is
// runStore.live.ts (same split as memory.ts / memory.live.ts).
//
// The split matters because these are exactly the rules that go wrong quietly:
// a run left RUNNING forever, a proposal decided twice, a total that silently
// counts a failed step as a success. Each one is cheap to unit-test and
// expensive to debug in production.

import { assertTopologyAllowed, estimateLlmCalls, type Topology } from "./topology";
import { GROUP_BROKER_ID, getRole, skillVersionFor } from "./roles";

/**
 * AgentRun.status values.
 *
 * "STUB" is its own status rather than being folded into FAILED or SUCCEEDED.
 * A run with no API key configured did not fail — the bookkeeping worked
 * perfectly and there was simply no model behind it. Calling that FAILED sends
 * someone hunting a bug that does not exist; calling it SUCCEEDED puts an empty
 * answer into the ledger dressed as a real one.
 */
export type RunStatus =
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "BUDGET_EXHAUSTED"
  | "REFUSED"
  | "STUB";

/** AgentStep.kind values. */
export type StepKind = "plan" | "tool" | "debate" | "verify" | "narrate";

/** AgentProposal.status values. */
export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type StartRunRequest = {
  tenantId: string;
  /** null = the Group Broker (cross-company). */
  companyId: string | null;
  roleId: string;
  objective: string;
  /** Defaults to the role's own default topology. */
  topology?: Topology;
  hops: number;
  humanOptIn?: boolean;
};

export type RunPayload = {
  tenantId: string;
  companyId: string | null;
  roleId: string;
  topology: Topology;
  objective: string;
  status: RunStatus;
  skillVersion: string;
  error: string | null;
};

export type StartRunResult =
  | { ok: true; payload: RunPayload; estimatedLlmCalls: number }
  /** A refusal is still a ROW — status "REFUSED" — never a silent throw.
   *  A run that was refused and a run that never happened must be
   *  distinguishable when someone asks why the agent said nothing. */
  | { ok: false; payload: RunPayload; reason: string };

/**
 * Validate and build the AgentRun row for a new run.
 *
 * Refuses (rather than throws) on: an unknown role, a company-scoped run for
 * the Group Broker, a Group-scoped run for a company role, a topology that
 * needs human opt-in without it, and a hop count over the topology's ceiling.
 */
export function startRun(req: StartRunRequest): StartRunResult {
  const role = getRole(req.roleId);
  const topology = req.topology ?? role?.defaultTopology ?? "route";

  const base: RunPayload = {
    tenantId: req.tenantId,
    companyId: req.companyId,
    roleId: req.roleId,
    topology,
    objective: req.objective,
    status: "REFUSED",
    skillVersion: skillVersionFor(req.roleId),
    error: null,
  };

  const refuse = (reason: string): StartRunResult => ({
    ok: false,
    payload: { ...base, status: "REFUSED", error: reason },
    reason,
  });

  if (!role) return refuse(`Unknown role "${req.roleId}".`);
  if (!req.objective.trim()) return refuse("A run needs an objective.");
  if (!req.tenantId) return refuse("A run needs a tenantId — an unscoped run cannot be isolated.");

  // The Group Broker belongs to the group, never to one company; a company
  // role always belongs to a company. Mixing the two produces rows that no
  // query can interpret — a "company-scoped group broker" is meaningless.
  if (req.roleId === GROUP_BROKER_ID && req.companyId !== null) {
    return refuse("The Group Broker is group-scoped — its runs must carry companyId = null.");
  }
  if (req.roleId !== GROUP_BROKER_ID && req.companyId === null) {
    return refuse(`Role "${req.roleId}" is company-scoped and needs a companyId.`);
  }

  const allowed = assertTopologyAllowed(topology, { hops: req.hops, humanOptIn: req.humanOptIn });
  if (!allowed.allowed) return refuse(allowed.reason);

  return {
    ok: true,
    payload: { ...base, status: "RUNNING" },
    estimatedLlmCalls: estimateLlmCalls(topology, req.hops),
  };
}

export type StepTotals = {
  steps: number;
  failedSteps: number;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  /** Mean of SCORED steps only. Null when nothing was scored. */
  meanScore: number | null;
  scoredSteps: number;
};

export type RollupStep = {
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  score?: number | null;
  error?: string | null;
};

/**
 * Total a run from its steps.
 *
 * Unscored steps are EXCLUDED from the mean rather than counted as zero —
 * treating "nobody graded this" as "this was terrible" is how a training
 * signal quietly becomes noise.
 */
export function rollupRun(steps: RollupStep[]): StepTotals {
  const totals: StepTotals = {
    steps: steps.length,
    failedSteps: 0,
    tokensIn: 0,
    tokensOut: 0,
    latencyMs: 0,
    meanScore: null,
    scoredSteps: 0,
  };

  let scoreSum = 0;
  for (const s of steps) {
    totals.tokensIn += s.tokensIn ?? 0;
    totals.tokensOut += s.tokensOut ?? 0;
    totals.latencyMs += s.latencyMs ?? 0;
    if (s.error) totals.failedSteps += 1;
    if (typeof s.score === "number" && Number.isFinite(s.score)) {
      scoreSum += s.score;
      totals.scoredSteps += 1;
    }
  }

  if (totals.scoredSteps > 0) totals.meanScore = scoreSum / totals.scoredSteps;
  return totals;
}

/**
 * The terminal status a finished run should carry.
 *
 * A run with a failed step is FAILED even if later steps recovered — the
 * ledger records what happened, not the tidiest reading of it.
 */
export function finalRunStatus(
  totals: StepTotals,
  opts: { budgetExhausted?: boolean; stub?: boolean } = {},
): RunStatus {
  // Budget first: it is the reason the run stopped, and it outranks whatever
  // partial state the steps happen to be in.
  if (opts.budgetExhausted) return "BUDGET_EXHAUSTED";
  // Stub before failure: with no model configured there is nothing that COULD
  // have succeeded, so step-level errors are not evidence of a defect.
  if (opts.stub) return "STUB";
  if (totals.steps === 0) return "FAILED";
  if (totals.failedSteps > 0) return "FAILED";
  return "SUCCEEDED";
}

/** Legal AgentRun status transitions. Anything else is a bug worth catching. */
export function canTransition(from: RunStatus, to: RunStatus): boolean {
  if (from === "RUNNING") return to !== "RUNNING";
  // Terminal states are terminal. A finished run must never be reopened —
  // rewriting history is precisely what an audit trail exists to prevent.
  return false;
}

export type DecidableProposal = {
  status: ProposalStatus;
};

export type DecisionRequest = {
  status: Extract<ProposalStatus, "ACCEPTED" | "REJECTED">;
  decidedById: string;
  note?: string;
};

/**
 * Guard a human decision on a proposal.
 *
 * `decidedById` is mandatory: liability sits with the person who clicked, and
 * a decision whose owner cannot be named is worse than no decision at all.
 */
export function canDecide(
  proposal: DecidableProposal,
  req: DecisionRequest,
): { ok: true } | { ok: false; reason: string } {
  if (proposal.status !== "PENDING") {
    return { ok: false, reason: `Proposal is already ${proposal.status} and cannot be decided again.` };
  }
  if (!req.decidedById) {
    return { ok: false, reason: "A decision must name the human who made it." };
  }
  if (req.status !== "ACCEPTED" && req.status !== "REJECTED") {
    return { ok: false, reason: `"${req.status}" is not a decision a human makes.` };
  }
  return { ok: true };
}

/**
 * Guard recording a realized outcome.
 *
 * Only ACCEPTED proposals have a realized value — measuring the outcome of a
 * proposal nobody acted on would fabricate the one signal in this system that
 * is not circular.
 */
export function canRecordOutcome(
  proposal: DecidableProposal,
): { ok: true } | { ok: false; reason: string } {
  if (proposal.status !== "ACCEPTED") {
    return {
      ok: false,
      reason: `Only an ACCEPTED proposal has a realized outcome; this one is ${proposal.status}.`,
    };
  }
  return { ok: true };
}
