// lib/voac/topology.ts — which orchestration shape fires for which work.
//
// Six patterns, from Anthropic's "Building Effective Agents" taxonomy:
//   chain      — prompt chaining: fixed steps, each checks the last
//   route      — classify first, then hand to one specialist
//   parallel   — run at once, merge or vote
//   orchestrate— a planner decides the subtasks at runtime, workers execute
//   evaluate   — generate → grade → revise until it passes
//   autonomous — no fixed path; the agent decides when it is done
//
// docs/VAOC.md §2 already maps task types to patterns for the BUILD-TIME
// company. This module is the runtime executable form of that same table —
// one substrate, not a second doctrine.
//
// Pure and dependency-free on purpose: the selector is the piece most likely
// to be wrong, so it must be the piece easiest to unit-test.

/** The six orchestration shapes. String union, not an enum — D1 has no enums. */
export type Topology =
  | "chain"
  | "route"
  | "parallel"
  | "orchestrate"
  | "evaluate"
  | "autonomous";

/**
 * The shape of a task — NOT its size. A one-line task with genuinely
 * competing objectives needs more machinery than a large but independent
 * fan-out. Size picks the budget; shape picks the topology.
 */
export type TaskShape = {
  /** Step N consumes step N-1's output. "Conceptually separate" is NOT this. */
  dependentSteps: boolean;
  /** The work splits into parts that do not interact. */
  independentSubtasks: boolean;
  /** Those parts can be enumerated before any work starts. */
  subtasksKnownUpFront: boolean;
  /** Parties with conflicting goals must be reconciled (the cross-company case). */
  competingObjectives: boolean;
  /** The output can be graded by a critic and improved on a second pass. */
  revisableOutput: boolean;
  /** No known stopping condition; the agent must decide when it is finished. */
  openEnded: boolean;
};

export type TopologyMeta = {
  id: Topology;
  labelEn: string;
  labelAr: string;
  /** Hard ceiling on hops. Compound-error discipline: ~95% per step is ~60%
   *  over ten steps, so no topology is allowed to grow an unbounded chain. */
  maxHops: number;
  /** Rough LLM-call multiplier vs. a single call — used for budgeting. */
  costMultiplier: number;
  /** True when the pattern must never start without a human explicitly asking.
   *  Only `autonomous` qualifies: it is the one shape with no predetermined
   *  stopping point, which is exactly the shape you cannot budget for. */
  requiresHumanOptIn: boolean;
};

export const TOPOLOGIES: Record<Topology, TopologyMeta> = {
  chain: {
    id: "chain",
    labelEn: "Prompt chain",
    labelAr: "سلسلة متتابعة",
    maxHops: 4,
    costMultiplier: 3,
    requiresHumanOptIn: false,
  },
  route: {
    id: "route",
    labelEn: "Routing",
    labelAr: "توجيه",
    maxHops: 2,
    costMultiplier: 2,
    requiresHumanOptIn: false,
  },
  parallel: {
    id: "parallel",
    labelEn: "Parallel + vote",
    labelAr: "تفرّع متوازٍ وتصويت",
    maxHops: 2,
    costMultiplier: 6,
    requiresHumanOptIn: false,
  },
  orchestrate: {
    id: "orchestrate",
    labelEn: "Orchestrator + workers",
    labelAr: "منسّق وعمّال",
    maxHops: 3,
    costMultiplier: 8,
    requiresHumanOptIn: false,
  },
  evaluate: {
    id: "evaluate",
    labelEn: "Evaluator loop",
    labelAr: "حلقة تقييم",
    maxHops: 6,
    costMultiplier: 5,
    requiresHumanOptIn: false,
  },
  autonomous: {
    id: "autonomous",
    labelEn: "Autonomous",
    labelAr: "ذاتي التشغيل",
    maxHops: 12,
    costMultiplier: 20,
    requiresHumanOptIn: true,
  },
};

export type TopologyChoice = {
  topology: Topology;
  /** Why this shape won — surfaced in the UI so a manager can disagree. */
  reason: string;
};

/**
 * Pick the topology for a task shape.
 *
 * The cascade is ordered most-constrained-first and is deliberately total:
 * every TaskShape resolves, and the fallback is the CHEAPEST pattern, not the
 * most powerful one. Reaching for `orchestrate` by default is how a two-call
 * task becomes an eight-call task that is no more correct.
 */
export function chooseTopology(shape: TaskShape): TopologyChoice {
  // A true data dependency beats everything: you cannot parallelize a step
  // that needs the previous step's answer, however tempting the fan-out looks.
  if (shape.dependentSteps) {
    return {
      topology: "chain",
      reason: "Each step consumes the previous step's output — a real dependency, so the work is sequential.",
    };
  }

  // Conflicting objectives are the council's case: let the positions be argued
  // in parallel and synthesized, rather than letting one voice quietly win.
  // This is the ONLY shape the cross-company broker should use, because that
  // is exactly what "two managers' P&Ls disagree" is.
  if (shape.competingObjectives) {
    return {
      topology: "parallel",
      reason: "Objectives conflict, so positions are argued in parallel and reconciled instead of one voice deciding alone.",
    };
  }

  if (shape.independentSubtasks) {
    return shape.subtasksKnownUpFront
      ? {
          topology: "parallel",
          reason: "The subtasks are independent and known in advance — run them at once and merge.",
        }
      : {
          topology: "orchestrate",
          reason: "The subtasks are independent but only discoverable at runtime — a planner decides them, workers execute.",
        };
  }

  if (shape.revisableOutput) {
    return {
      topology: "evaluate",
      reason: "The output can be graded and improved, so a critic loop is worth the extra passes.",
    };
  }

  if (shape.openEnded) {
    return {
      topology: "autonomous",
      reason: "No predetermined stopping point — requires explicit human opt-in before it may run.",
    };
  }

  return {
    topology: "route",
    reason: "A single specialist can answer this — classify once and hand it over. Cheapest controllable shape.",
  };
}

/**
 * Gate a chosen topology before it executes.
 *
 * Two things can block a run: a pattern that needs human opt-in and did not
 * get it, and a hop count above the pattern's ceiling. Both return a reason
 * rather than throwing — a refused run is a row in AgentRun with
 * status "REFUSED", not an exception that vanishes into a log.
 */
export function assertTopologyAllowed(
  topology: Topology,
  opts: { hops: number; humanOptIn?: boolean },
): { allowed: true } | { allowed: false; reason: string } {
  const meta = TOPOLOGIES[topology];
  if (!meta) return { allowed: false, reason: `Unknown topology "${topology}".` };

  if (meta.requiresHumanOptIn && !opts.humanOptIn) {
    return {
      allowed: false,
      reason: `Topology "${topology}" has no predetermined stopping point and requires explicit human opt-in.`,
    };
  }

  if (opts.hops > meta.maxHops) {
    return {
      allowed: false,
      reason: `Topology "${topology}" allows at most ${meta.maxHops} hops; ${opts.hops} were requested.`,
    };
  }

  if (opts.hops < 1) {
    return { allowed: false, reason: "A run needs at least one hop." };
  }

  return { allowed: true };
}

/**
 * Expected LLM calls for a run — used to refuse work that cannot be afforded
 * BEFORE the first token is spent, rather than discovering it at call 40.
 */
export function estimateLlmCalls(topology: Topology, hops: number): number {
  const meta = TOPOLOGIES[topology];
  if (!meta) return 0;
  return Math.max(1, Math.round(meta.costMultiplier * Math.max(1, Math.min(hops, meta.maxHops)) / 2));
}
