// =====================================================================
//  Brain.ts — the central orchestrator of the H-Nerve intelligence layer.
//
//  THIS IS THE FILE TO REFERENCE WHEN ASKING TO "IMPROVE THE BRAIN".
//  Path: lib/brain/Brain.ts
//
//  H-Nerve is a generic ERP intelligence platform. The Brain is its
//  central nervous system: a causal graph of every business entity, a
//  what-if simulator over that graph, a council of domain agents, a
//  narrator that explains in plain language, a planner that turns
//  insight into ordered actions, a long-term episodic memory, and a
//  self-reflective meta layer that scores and tunes the brain over time.
//
//  ask() is the single entry point. It ROUTES each question to the right
//  subsystem(s) and COMPOSES their REAL outputs into one editorial
//  answer. Subsystems are loaded via dynamic import so each is pulled in
//  only when a question needs it (this also avoids circular-import
//  init-order problems).
//
//  Boundary: the Brain is READ-MOSTLY. ask() never writes domain data.
//  The `plan` kind drafts a plan in memory (draftPlanFromGoal) but does
//  NOT persist it — persistence goes through the server actions under
//  app/(app)/plans/actions.ts. Keep it that way.
//
//  (B1, 2026-06: this file was previously a Proxy-stub skeleton whose
//  `plan`/`explain` branches only narrated. It now composes the live
//  subsystems. See docs/proposals/BRAIN-INFRA-AUDIT-2026-06.md.)
// =====================================================================

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
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Resolve a domain {entity, id} to a causal-graph node id.
 *
 * The graph seeder (`seedGraph.ts`) keys every node as
 * `bn_${kind.toLowerCase()}_${refId}` via its `nid()` helper. The Brain
 * must use the same convention to find a node, otherwise graph lookups
 * silently miss. An id that is already a `bn_…` node id is passed through
 * unchanged (callers that already hold a node id stay correct).
 */
export function graphNodeId(entity: string, id: string): string {
  if (id.startsWith("bn_")) return id;
  return `bn_${entity.toLowerCase()}_${id}`;
}

// ─────────────────────────────────────────────────────────────────────
// Brain — composition root
// ─────────────────────────────────────────────────────────────────────

export class Brain {
  /**
   * The single entry point for the rest of the app.
   * Routes the question to the right subsystem(s), composes their real
   * outputs, then runs the result through the narrator so every response
   * is editorial-quality prose.
   */
  async ask(ctx: BrainContext, q: BrainQuestion): Promise<BrainAnswer> {
    const t0 = Date.now();
    const steps: BrainTrace["steps"] = [];
    const step = (agent: string, thought: string, since: number) =>
      steps.push({ agent, thought, ms: Date.now() - since });

    if (q.kind === "council") {
      const { council } = await import("./council.live");
      const { narrator } = await import("./narrator.claude");
      let sStart = Date.now();
      const session = await council().convene(q.topic, q.subgraph ?? []);
      step("council", `convened ${session.voices.length} voices`, sStart);
      sStart = Date.now();
      const nar = await narrator().write({
        register: "editorial",
        locale: ctx.locale,
        topic: "council",
        facts: { recommendation: session.synthesis.recommendation, confidence: session.synthesis.confidence },
      });
      step("narrator", "wrote editorial synthesis", sStart);
      return {
        summary: session.synthesis.recommendation.slice(0, 200),
        narrative: nar.text,
        confidence: session.synthesis.confidence,
        citations: session.voices.map((v) => ({
          kind: "agent" as const,
          ref: v.agentId,
          weight: 1 / Math.max(session.voices.length, 1),
        })),
        trace: { inputs: [q.topic], steps, totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "explain") {
      const { causalGraph } = await import("./graph.prisma");
      const { narrator } = await import("./narrator.claude");
      const nodeId = graphNodeId(q.target.entity, q.target.id);

      // Pull the real causal neighborhood so the explanation is grounded
      // in how this entity actually connects to the rest of the business.
      // Degrade gracefully if the graph isn't populated yet.
      let neighbors: { id: string; label: string }[] = [];
      const gStart = Date.now();
      try {
        const ns = await causalGraph().neighbors(nodeId, 1);
        neighbors = ns.slice(0, 6).map((n) => ({ id: n.id, label: n.label }));
      } catch {
        /* graph not seeded — fall back to a narration with no connections */
      }
      step("graph", `loaded ${neighbors.length} causal neighbors`, gStart);

      const nStart = Date.now();
      const nar = await narrator().write({
        register: "executive",
        locale: ctx.locale,
        topic: q.target.entity,
        facts: {
          entity: q.target.entity,
          entityId: q.target.id,
          connections: neighbors.map((n) => n.label),
          connectionCount: neighbors.length,
        },
      });
      step("narrator", "wrote executive explanation", nStart);

      return {
        summary: `${q.target.entity} #${q.target.id}`,
        narrative: nar.text,
        confidence: neighbors.length > 0 ? 0.85 : 0.7,
        citations: [
          { kind: "graph" as const, ref: nodeId, weight: 1 },
          ...neighbors.map((n) => ({
            kind: "graph" as const,
            ref: n.id,
            weight: 1 / Math.max(neighbors.length, 1),
          })),
        ],
        trace: { inputs: [q.target.entity, q.target.id], steps, totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "simulate") {
      const { causalGraph } = await import("./graph.prisma");
      const { simulateOnSnapshot } = await import("./simulator.bfs");
      const { narrator } = await import("./narrator.claude");
      const sStart = Date.now();
      const snapshot = await causalGraph().loadAll();
      const delta = typeof q.perturbation.to === "number" ? q.perturbation.to - 1 : -0.3;
      // B1 fix: resolve the perturbed entity to its real graph node id
      // (was passing the raw refId, which never matched a `bn_…` node).
      const nodeId = graphNodeId(q.perturbation.entity, q.perturbation.id);
      const impacts = simulateOnSnapshot(snapshot, { nodeId, delta });
      step("simulator", `propagated ${impacts.length} impacts`, sStart);
      const nStart = Date.now();
      const nar = await narrator().write({
        register: "editorial",
        locale: ctx.locale,
        topic: "simulation",
        facts: { entity: q.perturbation.entity, field: q.perturbation.field, impactCount: impacts.length },
      });
      step("narrator", "wrote scenario narrative", nStart);
      return {
        summary: `Simulating ${q.perturbation.field} on ${q.perturbation.entity}`,
        narrative: nar.text,
        confidence: 0.75,
        citations: impacts.slice(0, 3).map((r) => ({ kind: "graph" as const, ref: r.node.id, weight: Math.abs(r.projectedDelta) })),
        trace: { inputs: [q.perturbation.entity, q.perturbation.field], steps, totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "recall") {
      const { memoryLake } = await import("./memory.live");
      const { narrator } = await import("./narrator.claude");
      const mStart = Date.now();
      const memories = await memoryLake().recall({ situation: q.situation, topK: 5 });
      step("memory", `recalled ${memories.length} analogous situations`, mStart);
      const nStart = Date.now();
      const nar = await narrator().write({
        register: "editorial",
        locale: ctx.locale,
        topic: "memory",
        facts: { situation: q.situation.slice(0, 80), count: memories.length, topScore: memories[0]?.similarity ?? 0 },
      });
      step("narrator", "wrote recall narrative", nStart);
      return {
        summary: `${memories.length} analogous memories found`,
        narrative: nar.text,
        confidence: memories[0]?.similarity ?? 0.5,
        citations: memories.map((m) => ({ kind: "memory" as const, ref: m.id, weight: m.similarity })),
        trace: { inputs: [q.situation.slice(0, 60)], steps, totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "plan") {
      const { draftPlanFromGoal } = await import("./planner.live");
      const { narrator } = await import("./narrator.claude");

      // Draft a real, ordered plan from the goal — read-mostly: nothing is
      // persisted here. The user commits it via the plans server action.
      const pStart = Date.now();
      let draft: Awaited<ReturnType<typeof draftPlanFromGoal>> | null = null;
      try {
        draft = await draftPlanFromGoal(q.goal, ctx.locale);
      } catch {
        /* planner unavailable — degrade to a goal-only narration */
      }
      step("planner", draft ? `drafted ${draft.steps.length}-step plan` : "planner unavailable", pStart);

      const nStart = Date.now();
      const nar = await narrator().write({
        register: "executive",
        locale: ctx.locale,
        topic: "plan",
        facts: {
          goal: q.goal,
          targetMetric: draft?.targetMetric ?? null,
          targetDelta: draft?.targetDelta ?? null,
          stepCount: draft?.steps.length ?? 0,
          rationale: draft?.rationale ?? null,
        },
      });
      step("narrator", "wrote plan narrative", nStart);

      const actions: BrainAction[] = (draft?.steps ?? []).map((s, i) => ({
        id: `step-${i + 1}`,
        label: { ar: s.action, en: s.actionEn ?? s.action },
        module: s.ownerRole,
        ...(draft ? { estimatedImpact: { metric: draft.targetMetric, delta: draft.targetDelta } } : {}),
      }));

      return {
        summary: (draft?.goal ?? q.goal).slice(0, 120),
        narrative: nar.text,
        confidence: draft ? 0.8 : 0.6,
        citations: [],
        actions,
        trace: { inputs: [q.goal], steps, totalMs: Date.now() - t0 },
      };
    }

    if (q.kind === "reflect") {
      const { computeIQ } = await import("./meta.reflector");
      const { narrator } = await import("./narrator.claude");
      const iqStart = Date.now();
      const iq = await computeIQ();
      step("meta", `computed IQ ${Math.round(iq.score * 100)} (${iq.trend})`, iqStart);
      const nStart = Date.now();
      const nar = await narrator().write({
        register: "executive",
        locale: ctx.locale,
        topic: "reflection",
        facts: { iq: Math.round(iq.score * 100), trend: iq.trend, window: q.window },
      });
      step("narrator", "wrote reflection narrative", nStart);
      return {
        summary: `Brain IQ: ${Math.round(iq.score * 100)} (${iq.trend})`,
        narrative: nar.text,
        confidence: iq.score,
        citations: [{ kind: "metric" as const, ref: "brain.iq", weight: iq.score }],
        trace: { inputs: [q.window], steps, totalMs: Date.now() - t0 },
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
// Factory — call this from server-side code to get a Brain instance.
// ask() and introspect() route via dynamic imports, so the Brain holds
// no subsystem state and the factory takes no wiring.
// ─────────────────────────────────────────────────────────────────────

export function makeBrain(): Brain {
  return new Brain();
}
