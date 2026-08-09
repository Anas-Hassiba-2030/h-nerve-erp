// lib/voac/driver.live.ts — the VOAC execution driver.
//
// This is the piece that makes the company actually run. It deliberately owns
// almost no intelligence of its own: it SEQUENCES existing machinery and
// records what happened.
//
//   • `parallel` topology  → src/lib/brain/council.live.ts (`council().convene`)
//   • every other topology → src/lib/brain/orchestrator.ts (`runToolLoop`)
//
// Reusing those two is the whole point. The council already runs five voices in
// parallel with a moderator, persists its transcript, and handles stub mode;
// re-implementing debate here would produce a second, worse council that drifts
// from the first. The driver's job is the ledger, the budget and the gate.
//
// EXECUTION MODEL: request-scoped, persisting each step as it goes. That is a
// deliberate first cut — because every step is durable the moment it happens,
// moving to a cron/queue driver later is a change of caller, not a rewrite.
//
// COST: three independent brakes, checked in this order —
//   1. the topology's own hop ceiling (refused before any token is spent),
//   2. the per-tenant LLM budget (src/lib/brain/llmBudget.ts),
//   3. the roster's daily proposal cap (src/lib/voac/budget.ts) — which limits
//      what reaches a HUMAN, not what the model may think about.
//
// The Brain's read-mostly boundary holds: nothing here writes to a domain
// table. It writes AgentRun / AgentStep / AgentProposal and stops.

import { runToolLoop } from "@/lib/brain/orchestrator";
import { flowSpecFor, llmNodeCount } from "./flowGraph";
import { runFlow, plannedLlmCalls } from "./flowGraph.live";
import { council } from "@/lib/brain/council.live";
import { checkTenantLlmBudget, consumeTenantLlmBudget } from "@/lib/brain/llmBudget";
import { log } from "@/lib/utils/logger";
import { getRole, skillDocFor, GROUP_BROKER_ID } from "./roles";
import { openRun, appendStep, closeRun, createProposal, ensureRoster, proposalsUsedSince } from "./runStore.live";
import { clipToBudget, type ProposalCandidate } from "./budget";
import { extractProposals, stripProposalBlock, PROPOSAL_OUTPUT_CONTRACT } from "./proposals";
import type { Topology } from "./topology";
import type { RunStatus, StepKind } from "./runStore";

export type RunVoacInput = {
  tenantId: string;
  /** null = the Group Broker. */
  companyId: string | null;
  roleId: string;
  objective: string;
  topology?: Topology;
  hops?: number;
  humanOptIn?: boolean;
  locale?: "ar" | "en";
  /** Company ids the council may reason over (Group Broker cross-company work). */
  scopeCompanyIds?: string[];
  /** Sector, used to lazily create the roster on first run. */
  sector?: string;
};

export type RunVoacResult = {
  runId: string;
  status: RunStatus;
  /** Prose for the human. Never the raw JSON envelope. */
  narrative: string;
  proposalsCreated: number;
  proposalsSuppressed: number;
  /** True when no API key is configured — the brain's stub mode. */
  stub: boolean;
  refusedReason?: string;
};

/**
 * A graph node's kind, as the ledger records it.
 *
 * `grade` maps to "verify" because that is exactly what it is — a check of the
 * draft against the facts. `reason` gets its own kind rather than borrowing
 * "plan": a trace that calls the thinking "planning" reads as a run that
 * planned twice and never thought.
 */
const STEP_KIND_FOR_NODE: Record<string, StepKind> = {
  tool: "tool",
  reason: "reason",
  grade: "verify",
  narrate: "narrate",
};

/** Roster cap lookup, defaulting conservatively when no roster row exists. */
async function dailyCapFor(tenantId: string, companyId: string | null, sector?: string): Promise<number> {
  if (!companyId || !sector) return 5;
  try {
    const roster = await ensureRoster({ tenantId, companyId, sector });
    return roster.dailyProposalCap;
  } catch {
    // A roster lookup failure must not take down the run — the cap simply
    // falls back to the conservative default. Fewer proposals is the safe
    // direction to fail in.
    return 5;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Run one VOAC role against one objective, end to end.
 *
 * Always returns; never throws. A failure is a row with status FAILED and the
 * error recorded, because an exception that unwinds past this point leaves the
 * ledger claiming a run is still RUNNING forever.
 */
export async function runVoac(input: RunVoacInput): Promise<RunVoacResult> {
  const locale = input.locale ?? "ar";
  const role = getRole(input.roleId);

  // Resolve the topology HERE rather than reading it back off the created row,
  // because the graph has to exist before openRun in order to declare its true
  // hop count. `hops` used to be a flat default of 2, which meant the ceiling
  // in topology.ts gated a number nobody derived from the work — a chain
  // costing three model passes still claimed two. A graph knows exactly.
  // (Same resolution order as startRun: explicit → role default → route.)
  const topology = (input.topology ?? role?.defaultTopology ?? "route") as Topology;
  const spec = flowSpecFor(topology, role?.tools ?? []);
  const hops = input.hops ?? (spec ? llmNodeCount(spec) : 2);

  // ---- 1. Open the run (validates scope, topology, hop ceiling) ----------
  const opened = await openRun({
    tenantId: input.tenantId,
    companyId: input.companyId,
    roleId: input.roleId,
    objective: input.objective,
    topology,
    hops,
    humanOptIn: input.humanOptIn,
  });

  const runId = opened.run.id;

  if (!opened.ok) {
    // Refusals are already persisted with status REFUSED by openRun.
    return {
      runId,
      status: "REFUSED",
      narrative: "",
      proposalsCreated: 0,
      proposalsSuppressed: 0,
      stub: false,
      refusedReason: opened.reason,
    };
  }

  const skill = skillDocFor(input.roleId);
  const system = `${skill?.body ?? ""}\n\n${PROPOSAL_OUTPUT_CONTRACT}`.trim();

  // ---- 2. Per-tenant LLM budget -----------------------------------------
  // A graph knows EXACTLY how many calls it will make before it makes the
  // first one, so it can be refused up front instead of stopping halfway with
  // a half-formed answer already paid for. The loop path can only claim one.
  const planned = spec ? plannedLlmCalls(spec) : 1;
  const budget = checkTenantLlmBudget(input.tenantId);
  const overspends = budget.cap > 0 && budget.used + planned > budget.cap;
  if (!budget.allowed || overspends) {
    await appendStep({
      tenantId: input.tenantId,
      runId,
      roleId: input.roleId,
      kind: "plan",
      input: input.objective,
      output: `Refused before spending: this shape needs ${planned} call(s) and the tenant has ${Math.max(0, budget.cap - budget.used)} left (${budget.used}/${budget.cap}).`,
      error: "BUDGET_EXHAUSTED",
    });
    await closeRun(runId, { budgetExhausted: true });
    return {
      runId, status: "BUDGET_EXHAUSTED", narrative: "", proposalsCreated: 0,
      proposalsSuppressed: 0, stub: false,
      refusedReason: `Tenant LLM budget exhausted (${budget.used}/${budget.cap}; this run needs ${planned}).`,
    };
  }

  let replyText = "";
  let stub = false;
  let llmCalls = 0;

  try {
    await appendStep({
      tenantId: input.tenantId, runId, roleId: input.roleId, kind: "plan",
      input: input.objective,
      output: `Topology ${topology}; skill ${skill?.id ?? "none"}@${skill?.version ?? "unknown"}.`,
    });

    // Wall-clock per phase. closeRun rolls step latency up to the run, so a
    // step that records nothing leaves the run claiming 0 ms — which is how a
    // cost-accounting field ends up looking implemented while reporting
    // nothing. Measured here because it is the only layer that spans the call.
    const startedMs = Date.now();

    if (topology === "parallel") {
      // ---- Debate path: reuse the council verbatim -----------------------
      // Competing objectives (two companies' P&Ls) is exactly what the council
      // was built for. Do not reimplement it here.
      const session = await council().convene(
        input.objective,
        [],
        input.scopeCompanyIds?.length ? { companyIds: input.scopeCompanyIds } : undefined,
        locale,
      );
      llmCalls = session.voices.length + 1;
      stub = session.sources?.engine === "stub";

      for (const voice of session.voices) {
        await appendStep({
          tenantId: input.tenantId, runId, roleId: voice.agentId ?? input.roleId,
          kind: voice.position === "moderate" ? "verify" : "debate",
          input: input.objective,
          output: voice.thesis,
          // The council's own confidence is a SELF-assessment. Recorded, and
          // marked as such, so it can never be mistaken for a human score.
          score: null,
          scoredBy: "self",
        });
      }

      replyText = session.synthesis.recommendation;
      await appendStep({
        tenantId: input.tenantId, runId, roleId: input.roleId, kind: "narrate",
        input: "synthesis",
        output: replyText,
        latencyMs: Date.now() - startedMs,
      });
    } else if (spec) {
      // ---- Graph path: a predetermined shape, run stage by stage ----------
      // The tools are chosen by flowGraph.ts before the run starts, not by the
      // model mid-loop. That is what lets a weak (or local) model still produce
      // a grounded answer: it never has to emit tool_use to make progress.
      const flow = await runFlow({
        spec,
        objective: input.objective,
        system,
        locale,
        // Persist each node the instant it lands, so a crash mid-graph still
        // leaves a readable partial trace instead of one silent gap.
        onNode: async (n) => {
          await appendStep({
            tenantId: input.tenantId,
            runId,
            roleId: input.roleId,
            kind: STEP_KIND_FOR_NODE[n.node.kind],
            input: `${n.stageIndex}·${n.stageId} — ${n.input}`.slice(0, 900),
            output: n.output?.slice(0, 4000) ?? null,
            error: n.error,
            latencyMs: n.latencyMs,
          });
        },
      });

      stub = flow.stub;
      llmCalls = flow.llmCalls;
      replyText = flow.text;

      if (flow.emptyAnswer) {
        // The graph ran and produced nothing readable. Recording that as a
        // success would file it next to runs that answered, and nobody would
        // ever go looking.
        await appendStep({
          tenantId: input.tenantId, runId, roleId: input.roleId, kind: "verify",
          input: "graph result",
          output: null,
          error: `The graph completed ${flow.nodes.length} node(s) but the final answer was empty.`,
          latencyMs: Date.now() - startedMs,
        });
      }
    } else {
      // ---- Tool-loop path: reuse the orchestrator ------------------------
      // Reached only by orchestrate/autonomous — the shapes whose subtasks are
      // discovered at runtime, where a predetermined graph would be a lie
      // about the plan.
      const loop = await runToolLoop({
        system,
        question: input.objective,
        priorTurns: [],
      });
      stub = loop.stub;
      llmCalls = loop.rounds;
      replyText = loop.text;

      for (const call of loop.toolCalls) {
        await appendStep({
          tenantId: input.tenantId, runId, roleId: input.roleId, kind: "tool",
          input: `${call.name}(${JSON.stringify(call.input).slice(0, 900)})`,
          output: JSON.stringify(call.output).slice(0, 4000),
        });
      }

      // An empty final answer AFTER the tools ran is not success. The loop can
      // exhaust its rounds mid-investigation and return no synthesis; recording
      // that as SUCCEEDED puts a run with no answer next to runs that produced
      // one, and nobody goes looking. Caught live: 3 tools executed, reply
      // empty, status SUCCEEDED, narrative "(no answer produced)".
      const noAnswer = !loop.stub && !replyText.trim();

      await appendStep({
        tenantId: input.tenantId, runId, roleId: input.roleId, kind: "narrate",
        input: input.objective,
        // Stub mode is NOT a step error — it is the absence of a model, and it
        // is carried on the run's status instead. Recording it as an error here
        // would make every key-less run look like a defect.
        output: loop.stub ? "(stub mode — no model configured)" : replyText || "(no answer produced)",
        latencyMs: Date.now() - startedMs,
        error: noAnswer
          ? `The tool loop finished after ${loop.rounds} round(s) with no final answer.`
          : null,
      });
    }

    // One tick per call actually made, not one per run. A council costs six
    // calls and a graph costs two or three; charging each of them a single
    // tick made the daily cap read far tighter than it enforced.
    if (!stub) {
      for (let i = 0; i < Math.max(1, llmCalls); i++) consumeTenantLlmBudget(input.tenantId);
    }
  } catch (err) {
    // A thrown driver leaves the ledger claiming RUNNING forever. Record, then
    // close — never let the exception escape past the run's own bookkeeping.
    log.error("voac.driver: run failed", { runId, roleId: input.roleId, err: String(err) });
    await appendStep({
      tenantId: input.tenantId, runId, roleId: input.roleId, kind: "verify",
      input: input.objective, output: null, error: String(err).slice(0, 900),
    });
    const closed = await closeRun(runId, { llmCalls, stub });
    return {
      runId, status: closed.status, narrative: "", proposalsCreated: 0,
      proposalsSuppressed: 0, stub, refusedReason: "The run failed; see the recorded step.",
    };
  }

  // ---- 3. Extract proposals, honestly ------------------------------------
  const extracted = extractProposals(replyText);
  if (extracted.parseError && !stub) {
    // Recorded, not hidden: a role that stopped honouring its output contract
    // is a real regression, and it is invisible if this is swallowed.
    await appendStep({
      tenantId: input.tenantId, runId, roleId: input.roleId, kind: "verify",
      input: "proposal extraction", output: extracted.parseError,
    });
  }

  // ---- 4. The human gate: rank, cap, persist ----------------------------
  const cap = await dailyCapFor(input.tenantId, input.companyId, input.sector);
  const usedToday = await proposalsUsedSince(input.tenantId, startOfToday());

  const candidates: (ProposalCandidate & { idx: number })[] = extracted.proposals.map((p, idx) => ({
    id: `p${idx}`,
    idx,
    title: p.title,
    estimatedValueJod: p.estimatedValueJod,
    confidence: p.confidence,
  }));

  const decision = clipToBudget(candidates, { dailyCap: cap, usedToday });

  let created = 0;
  for (const s of decision.surfaced) {
    const p = extracted.proposals[s.idx];
    await createProposal({
      tenantId: input.tenantId,
      runId,
      companyId: input.companyId,
      counterpartyCompanyId: p.counterparty ?? null,
      title: p.title,
      rationale: p.rationale,
      estimatedValueJod: p.estimatedValueJod ?? null,
      confidence: p.confidence,
    });
    created += 1;
  }

  if (decision.suppressed.length > 0) {
    // Suppressed proposals are NOT persisted as PENDING — they would clutter
    // the very queue the cap exists to protect. But the fact that they existed,
    // and why they were held back, is recorded on the run.
    await appendStep({
      tenantId: input.tenantId, runId, roleId: input.roleId, kind: "verify",
      input: `proposal budget (cap ${cap}, used ${usedToday})`,
      output: decision.suppressed.map((s) => `• ${s.title} — ${s.reason}`).join("\n"),
    });
  }

  const closed = await closeRun(runId, { llmCalls, stub });

  return {
    runId,
    status: closed.status,
    narrative: stripProposalBlock(replyText),
    proposalsCreated: created,
    proposalsSuppressed: decision.suppressed.length,
    stub,
  };
}

/**
 * Convenience entry for the cross-company case: the Group Broker, group-scoped,
 * over an explicit set of companies.
 */
export async function runGroupBroker(args: {
  tenantId: string;
  objective: string;
  companyIds: string[];
  locale?: "ar" | "en";
}): Promise<RunVoacResult> {
  return runVoac({
    tenantId: args.tenantId,
    companyId: null,
    roleId: GROUP_BROKER_ID,
    objective: args.objective,
    scopeCompanyIds: args.companyIds,
    locale: args.locale,
  });
}
