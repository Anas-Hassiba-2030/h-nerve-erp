// =====================================================================
//  Brain.ts — the master orchestrator of the H-Nerve intelligence layer.
//
//  THIS IS THE FILE TO REFERENCE WHEN ASKING TO "IMPROVE THE BRAIN".
//  Path: lib/brain/Brain.ts
//
//  H-Nerve is a generic ERP intelligence platform. The Brain is its
//  central nervous system: a causal graph of every business entity, a
//  what-if simulator over that graph, a council of domain agents that
//  reason about decisions, a narrator that explains everything in plain
//  language, a planner that turns insights into ordered action plans, a
//  long-term memory of past situations, and a self-reflective meta layer
//  that tunes the brain's own behavior over time.
//
//  Each subsystem lives in its own file under lib/brain/. This file is
//  the conductor: it composes them, exposes the public API, and is the
//  single import path the rest of the app should reach for.
//
//  This is a SKELETON. Implementations land in their own files as the
//  20-phase plan in docs/PHASES-INTELLIGENCE.md is executed.
// =====================================================================

import type { CausalGraph } from "./graph";
import type { Simulator } from "./simulator";
import type { Council } from "./council";
import type { Narrator } from "./narrator";
import type { Planner } from "./planner";
import type { MemoryLake } from "./memory";
import type { FeedbackLoop } from "./feedback";
import type { MetaBrain } from "./meta";

// ─────────────────────────────────────────────────────────────────────
// Public types — every subsystem speaks these
// ─────────────────────────────────────────────────────────────────────

export type BrainContext = {
  orgId: string;          // multi-tenant scope
  userId: string | null;  // who's asking
  locale: "ar" | "en";
  now: Date;
  industryPacks: string[]; // ["HOSPITALITY", "DAIRY", "AGRI", "EDU"]
};

export type BrainQuestion =
  | { kind: "explain";  target: { entity: string; id: string } }
  | { kind: "simulate"; perturbation: { entity: string; id: string; field: string; to: any } }
  | { kind: "plan";     goal: string }
  | { kind: "council";  topic: string; subgraph?: string[] }
  | { kind: "recall";   situation: string }
  | { kind: "reflect";  window: "day" | "week" | "month" };

export type BrainAnswer = {
  summary: string;             // 1-2 sentence headline
  narrative: string;           // editorial paragraph
  confidence: number;          // 0..1
  citations: BrainCitation[];  // every claim is sourced
  actions?: BrainAction[];     // optional next steps
  trace?: BrainTrace;          // why the brain answered this way (XAI)
};

export type BrainCitation = {
  kind: "metric" | "memory" | "agent" | "graph" | "external";
  ref: string;
  weight: number;
};

export type BrainAction = {
  id: string;
  label: { ar: string; en: string };
  module: string;
  href?: string;
  serverAction?: string;
  estimatedImpact?: { metric: string; delta: number };
};

export type BrainTrace = {
  inputs: string[];
  steps: { agent: string; thought: string; ms: number }[];
  totalMs: number;
};

// ─────────────────────────────────────────────────────────────────────
// Brain — composition root
// ─────────────────────────────────────────────────────────────────────

export class Brain {
  constructor(
    private readonly graph: CausalGraph,
    private readonly simulator: Simulator,
    private readonly council: Council,
    private readonly narrator: Narrator,
    private readonly planner: Planner,
    private readonly memory: MemoryLake,
    private readonly feedback: FeedbackLoop,
    private readonly meta: MetaBrain,
  ) {}

  /**
   * The single entry point for the rest of the app.
   * Routes the question to the right subsystem(s), then runs the answer
   * through the narrator so every response is editorial-quality prose.
   */
  async ask(ctx: BrainContext, q: BrainQuestion): Promise<BrainAnswer> {
    throw new Error("Brain.ask not yet wired — see docs/PHASES-INTELLIGENCE.md");
  }

  /**
   * Run a quick health check of the brain itself.
   * Returns the meta layer's current self-assessment.
   */
  async introspect(ctx: BrainContext) {
    return this.meta.report(ctx);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Factory — call this from server-side code to get a Brain instance
// ─────────────────────────────────────────────────────────────────────

export function makeBrain(): Brain {
  // Stubs — phases 1-10 wire the real implementations.
  const stub: any = new Proxy({}, { get: () => async () => { throw new Error("brain subsystem not wired"); } });
  return new Brain(stub, stub, stub, stub, stub, stub, stub, stub);
}
