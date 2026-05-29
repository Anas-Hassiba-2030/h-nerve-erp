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
   *
   * Uses dynamic imports so each subsystem is loaded only when needed,
   * avoiding circular dependencies at module-init time.
   */
  async ask(ctx: BrainContext, q: BrainQuestion): Promise<BrainAnswer> {
    const t0 = Date.now();

    if (q.kind === "council") {
      const { council } = await import("./council.live");
      const { narrator } = await import("./narrator.claude");
      const session = await council().convene(q.topic, q.subgraph ?? []);
      const nar = await narrator().write({
        register: "editorial",
        locale: ctx.locale,
        topic: "council",
        facts: { recommendation: session.synthesis.recommendation, confidence: session.synthesis.confidence },
      });
      return {
        summary: session.synthesis.recommendation.slice(0, 200),
        narrative: nar.text,
        confidence: session.synthesis.confidence,
        citations: session.voices.map((v) => ({
          kind: "agent" as const,
          ref: v.agentId,
          weight: 1 / Math.max(session.voices.length, 1),
        })),
        trace: {
          inputs: [q.topic],
          steps: session.voices.map((v) => ({ agent: v.agentId, thought: v.thesis.slice(0, 120), ms: 0 })),
          totalMs: Date.now() - t0,
        },
      };
    }

    if (q.kind === "explain") {
      const { narrator } = await import("./narrator.claude");
      const nar = await narrator().write({
        register: "executive",
        locale: ctx.locale,
        topic: q.target.entity,
        facts: { entityId: q.target.id, entity: q.target.entity },
      });
      return {
        summary: `${q.target.entity} #${q.target.id}`,
        narrative: nar.text,
        confidence: 0.82,
        citations: [{ kind: "graph" as const, ref: `${q.target.entity}:${q.target.id}`, weight: 1 }],
        trace: { inputs: [q.target.entity, q.target.id], steps: [], totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "simulate") {
      const { causalGraph } = await import("./graph.prisma");
      const { simulateOnSnapshot } = await import("./simulator.bfs");
      const { narrator } = await import("./narrator.claude");
      const snapshot = await causalGraph().loadAll();
      const delta = typeof q.perturbation.to === "number" ? q.perturbation.to - 1 : -0.3;
      const impacts = simulateOnSnapshot(snapshot, { nodeId: q.perturbation.id, delta });
      const nar = await narrator().write({
        register: "editorial",
        locale: ctx.locale,
        topic: "simulation",
        facts: { entity: q.perturbation.entity, field: q.perturbation.field, impactCount: impacts.length },
      });
      return {
        summary: `Simulating ${q.perturbation.field} on ${q.perturbation.entity}`,
        narrative: nar.text,
        confidence: 0.75,
        citations: impacts.slice(0, 3).map((r) => ({ kind: "graph" as const, ref: r.node.id, weight: Math.abs(r.projectedDelta) })),
        trace: {
          inputs: [q.perturbation.entity, q.perturbation.field],
          steps: [],
          totalMs: Date.now() - t0,
        },
      };
    }

    if (q.kind === "recall") {
      const { memoryLake } = await import("./memory.live");
      const { narrator } = await import("./narrator.claude");
      const memories = await memoryLake().recall({ situation: q.situation, topK: 5 });
      const nar = await narrator().write({
        register: "editorial",
        locale: ctx.locale,
        topic: "memory",
        facts: { situation: q.situation.slice(0, 80), count: memories.length, topScore: memories[0]?.similarity ?? 0 },
      });
      return {
        summary: `${memories.length} analogous memories found`,
        narrative: nar.text,
        confidence: memories[0]?.similarity ?? 0.5,
        citations: memories.map((m) => ({ kind: "memory" as const, ref: m.id, weight: m.similarity })),
        trace: { inputs: [q.situation.slice(0, 60)], steps: [], totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "plan") {
      const { narrator } = await import("./narrator.claude");
      const nar = await narrator().write({
        register: "executive",
        locale: ctx.locale,
        topic: "plan",
        facts: { goal: q.goal },
      });
      return {
        summary: q.goal.slice(0, 120),
        narrative: nar.text,
        confidence: 0.78,
        citations: [],
        trace: { inputs: [q.goal], steps: [], totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "reflect") {
      const { computeIQ } = await import("./meta.reflector");
      const { narrator } = await import("./narrator.claude");
      const iq = await computeIQ();
      const nar = await narrator().write({
        register: "executive",
        locale: ctx.locale,
        topic: "reflection",
        facts: { iq: Math.round(iq.score * 100), trend: iq.trend, window: q.window },
      });
      return {
        summary: `Brain IQ: ${Math.round(iq.score * 100)} (${iq.trend})`,
        narrative: nar.text,
        confidence: iq.score,
        citations: [{ kind: "metric" as const, ref: "brain.iq", weight: iq.score }],
        trace: { inputs: [q.window], steps: [], totalMs: Date.now() - t0 },
      };
    }

    const _exhaustive: never = q;
    throw new Error(`Unknown question kind: ${(_exhaustive as any).kind}`);
  }

  /**
   * Run a quick health check of the brain itself.
   */
  async introspect(_ctx: BrainContext) {
    const { computeIQ } = await import("./meta.reflector");
    const { llmConfig } = await import("./llm");
    const iq = await computeIQ();
    const cfg = llmConfig();
    return { healthy: true, iq, live: cfg.enabled, model: cfg.model };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Factory — call this from server-side code to get a Brain instance
// ─────────────────────────────────────────────────────────────────────

export function makeBrain(): Brain {
  // Constructor args are no longer used — ask() and introspect() route via
  // dynamic imports directly. We pass typed stubs here only to satisfy the
  // constructor signature; no code path reaches them.
  const stub: any = new Proxy({}, { get: () => () => { throw new Error("unreachable stub"); } });
  return new Brain(stub, stub, stub, stub, stub, stub, stub, stub);
}
