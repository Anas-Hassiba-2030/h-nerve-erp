// lib/voac/flowGraph.ts — the predetermined shape of a run.
//
// WHY THIS EXISTS. topology.ts already classifies six shapes, but until now
// only two paths actually executed: `parallel` convened the council, and every
// other topology fell into the same generic tool loop. A chain and a route were
// labels wearing an identical loop. This module is the missing middle — the
// executable SHAPE, written down as data.
//
// LOOP vs GRAPH, and why the graph earns its place:
//   • A loop discovers what to do next, one call at a time. The model must emit
//     tool_use to move. That is expressive, and it is also the failure we
//     measured: small local models answer in prose without emitting tool_use,
//     so the loop degrades to a single ungrounded reply.
//   • A graph decides the shape BEFORE any token is spent. Our code picks the
//     tools, runs the independent ones at once, and the model only reasons over
//     results it was handed. That is what makes local inference work at all,
//     and it makes cost knowable in advance rather than discovered at call 40.
//
// WHAT IS DELIBERATELY *NOT* GRAPHED:
//   • `parallel`   — the council already is a graph (fan out, then moderate).
//                    Re-expressing it here would be a second, worse council.
//   • `orchestrate`/`autonomous` — their subtasks are only knowable at runtime.
//     A static graph over a runtime-discovered plan is a lie about the plan.
//     These keep the loop, which is the correct engine for an unknown shape.
//
// Pure module: no DB, no LLM, no clock. The executor twin is flowGraph.live.ts.

import type { Topology } from "./topology";

/** What a node contributes. Only `reason` and `narrate` cost an LLM call. */
export type FlowNodeKind =
  /** A deterministic brain-tool call. Inputs bound by us, not by the model. */
  | "tool"
  /** One scoped LLM pass over what the previous stages produced. */
  | "reason"
  /** A pure, model-free check of the draft against the facts that were pulled. */
  | "grade"
  /** The final LLM pass that writes the answer for a human. */
  | "narrate";

export type FlowNode = {
  id: string;
  kind: FlowNodeKind;
  /** Set when kind === "tool" — a name in src/lib/brain/tools/index.ts. */
  tool?: string;
  labelAr: string;
  labelEn: string;
};

export type FlowStage = {
  id: string;
  labelAr: string;
  labelEn: string;
  /** Nodes in a stage are independent and run at once. Stages run in order. */
  nodes: FlowNode[];
};

export type FlowSpec = {
  topology: Topology;
  stages: FlowStage[];
};

/**
 * Tools whose inputs can be derived from the objective alone.
 *
 * This gate is the whole honesty of the design. A graph node's input must be
 * fixed before the run starts; `simulate` needs a specific graph nodeId and a
 * delta, which cannot be read off a sentence without guessing. Guessing a node
 * id produces a confident answer about the wrong entity — worse than not
 * running it. So simulate stays available to the loop and never becomes a
 * gather node. `councilDebate` is excluded for a different reason: it IS the
 * parallel topology, and nesting a council inside a chain multiplies cost by
 * six for a shape that already declined to debate.
 */
export const GATHERABLE_TOOLS = new Set([
  "pullFacts",
  "causalSubgraph",
  "recallMemory",
  "retrieveDocuments",
]);

const TOOL_LABELS: Record<string, { ar: string; en: string }> = {
  pullFacts: { ar: "سحب الوقائع", en: "Pull facts" },
  causalSubgraph: { ar: "الرسم السببي", en: "Causal subgraph" },
  recallMemory: { ar: "استرجاع سوابق", en: "Recall precedents" },
  retrieveDocuments: { ar: "استرجاع مستندات", en: "Retrieve documents" },
};

function toolNode(tool: string): FlowNode {
  const l = TOOL_LABELS[tool] ?? { ar: tool, en: tool };
  return { id: tool, kind: "tool", tool, labelAr: l.ar, labelEn: l.en };
}

/** Topologies that execute as a predetermined graph rather than a loop. */
export const GRAPHED_TOPOLOGIES: Topology[] = ["route", "chain", "evaluate"];

export function isGraphed(topology: string): boolean {
  return (GRAPHED_TOPOLOGIES as string[]).includes(topology);
}

/**
 * Build the execution graph for a topology and the tools a role may call.
 *
 * Returns null for the loop-driven topologies — a caller that gets null must
 * fall back to the orchestrator, and returning null rather than an empty graph
 * makes that impossible to miss.
 *
 * The gather stage is where the parallelism lives: every gatherable tool the
 * role owns fires at once, because none of them consumes another's output.
 * A role with no gatherable tool still gets a valid graph — it simply has
 * nothing to gather, and reasoning over nothing is a legitimate (if thin) run,
 * whereas refusing would silently disable roles as tools change.
 */
export function flowSpecFor(topology: string, tools: string[]): FlowSpec | null {
  if (!isGraphed(topology)) return null;

  const gather = tools.filter((t) => GATHERABLE_TOOLS.has(t)).map(toolNode);

  const gatherStage: FlowStage = {
    id: "gather",
    labelAr: "جمع متوازٍ",
    labelEn: "Gather in parallel",
    nodes: gather,
  };
  const narrateStage: FlowStage = {
    id: "narrate",
    labelAr: "صياغة",
    labelEn: "Write the answer",
    nodes: [{ id: "narrate", kind: "narrate", labelAr: "صياغة", labelEn: "Narrate" }],
  };

  switch (topology) {
    // Classify once, gather, answer. The cheapest controllable shape: one
    // reasoning pass, and it happens BEFORE the gather so the classification
    // is what selects which findings matter.
    case "route":
      return {
        topology: "route",
        stages: [
          {
            id: "classify",
            labelAr: "تصنيف",
            labelEn: "Classify",
            nodes: [{ id: "classify", kind: "reason", labelAr: "تصنيف", labelEn: "Classify" }],
          },
          gatherStage,
          narrateStage,
        ],
      };

    // A real dependency: the plan decides what the reasoning is for, and the
    // reasoning cannot start before the gather returns. Two LLM passes, not one.
    case "chain":
      return {
        topology: "chain",
        stages: [
          {
            id: "plan",
            labelAr: "خطة",
            labelEn: "Plan",
            nodes: [{ id: "plan", kind: "reason", labelAr: "خطة", labelEn: "Plan" }],
          },
          gatherStage,
          {
            id: "reason",
            labelAr: "استنتاج",
            labelEn: "Reason",
            nodes: [{ id: "reason", kind: "reason", labelAr: "استنتاج", labelEn: "Reason" }],
          },
          narrateStage,
        ],
      };

    // Chain plus a critic. The grade node is PURE — it re-reads the draft's
    // numeric claims against the facts that were actually pulled, with no
    // second model. A model grading its own output is the cheapest way to buy
    // confidence you have not earned.
    case "evaluate":
      return {
        topology: "evaluate",
        stages: [
          {
            id: "plan",
            labelAr: "خطة",
            labelEn: "Plan",
            nodes: [{ id: "plan", kind: "reason", labelAr: "خطة", labelEn: "Plan" }],
          },
          gatherStage,
          {
            id: "draft",
            labelAr: "مسودة",
            labelEn: "Draft",
            nodes: [{ id: "draft", kind: "reason", labelAr: "مسودة", labelEn: "Draft" }],
          },
          {
            id: "grade",
            labelAr: "تدقيق الأرقام",
            labelEn: "Check the numbers",
            nodes: [{ id: "grade", kind: "grade", labelAr: "تدقيق", labelEn: "Grade" }],
          },
          narrateStage,
        ],
      };

    default:
      return null;
  }
}

/**
 * How many LLM calls this graph will make.
 *
 * Known before the first token — which is the point. topology.ts can only
 * estimate from a cost multiplier; once a graph exists the number is exact, and
 * a budget check against an exact number can refuse honestly.
 */
export function llmNodeCount(spec: FlowSpec): number {
  return spec.stages.reduce(
    (n, s) => n + s.nodes.filter((x) => x.kind === "reason" || x.kind === "narrate").length,
    0,
  );
}

/** Total nodes, including the free ones — used for the drawn chart. */
export function nodeCount(spec: FlowSpec): number {
  return spec.stages.reduce((n, s) => n + s.nodes.length, 0);
}

/**
 * The stage labels, in order — what the map draws as a pipeline.
 *
 * orgMap.pipelineFor() delegates here for graphed topologies so the picture and
 * the executor cannot drift: if a stage is added to the graph it appears on the
 * chart with no second edit. Stage labels do not depend on which tools a role
 * owns, so the default tool set is a safe stand-in for label-only callers.
 */
export function stageLabels(topology: string): { ar: string; en: string }[] {
  const spec = flowSpecFor(topology, [...GATHERABLE_TOOLS]);
  if (!spec) return [];
  return spec.stages.map((s) => ({ ar: s.labelAr, en: s.labelEn }));
}
