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

/**
 * A guard on a stage — the graph's only conditional edge.
 *
 * Named, not a closure, so a spec stays plain serialisable data that a test can
 * read and the UI can draw. The executor owns what each name MEANS; this file
 * owns which stages carry one.
 *
 * The rule these exist to keep: **routing is decided by our code reading state,
 * never by the model choosing an edge.** A model writes into state; a guard
 * reads it. That is the same inversion as binding the tool inputs, applied to
 * control flow.
 */
export type StageGuard =
  /** The draft's figures did not ground well enough — revise it once. */
  | "revisionNeeded"
  /** The reasoning found something worth a person's attention. */
  | "hasSomethingToSay";

export type FlowStage = {
  id: string;
  labelAr: string;
  labelEn: string;
  /** Nodes in a stage are independent and run at once. Stages run in order. */
  nodes: FlowNode[];
  /** When set, the stage runs only if the guard holds. */
  runIf?: StageGuard;
};

export type FlowSpec = {
  topology: Topology;
  stages: FlowStage[];
};

/**
 * Coverage at or above which a draft is considered grounded.
 *
 * Shared by the grade node's revise decision and the narrator's hedging warning
 * so the two cannot disagree about what "grounded" means.
 */
export const GROUNDED_COVERAGE = 0.8;

/**
 * The exact token a reasoning node emits when it has nothing material to say.
 *
 * Matched against the WHOLE trimmed output, never searched for inside prose.
 * `proposals.ts` learned this the hard way: a parser that salvages intent from
 * prose invents a decision nobody made. A model that merely mentions the token
 * while writing a real answer must not silence that answer.
 */
export const QUIET_TOKEN = "NOTHING-MATERIAL";

/**
 * Does the gathered evidence contain anything that warrants a person's time?
 *
 * WHY THIS EXISTS — a measured failure, not a hypothetical. The quiet edge was
 * first built on the model's word alone: emit QUIET_TOKEN and the write-up is
 * skipped. Probed twice against the local qwen2.5-coder:3b on a fact pack
 * carrying an open HIGH-severity insight and four batches near expiry, it
 * answered correctly once and emitted QUIET_TOKEN the second time. A model that
 * silences a real finding leaves NO trace of what it silenced.
 *
 * So the model no longer decides. It gets a vote; this function holds the veto,
 * and both must agree before anything is skipped. That restores the rule the
 * rest of this module runs on: our code reads state and picks the edge.
 *
 * FAILS TOWARD SPEAKING. An unrecognised tool result counts as signal, because
 * "we could not prove this was quiet" and "this is quiet" are different claims
 * and only one of them is safe to act on. Adding a gather tool therefore
 * disables the quiet edge for that role until its shape is handled here —
 * inconvenient, and the correct direction to be inconvenient in.
 */
export function factsCarrySignal(facts: Record<string, unknown>): boolean {
  const entries = Object.entries(facts);
  // Nothing was gathered at all: we know nothing, which is not the same as
  // knowing nothing is wrong.
  if (entries.length === 0) return true;

  return entries.some(([tool, value]) => {
    const v = value as Record<string, unknown> | null;
    if (!v || typeof v !== "object") return true;

    // A KNOWN tool returning an UNEXPECTED shape is the dangerous case, and the
    // one a `?? []` fallback hides: if pullFacts ever renames `insights`, every
    // absent field reads as empty and every run goes quiet over real findings.
    // So each branch asserts the shape it understands, and anything else counts
    // as signal.
    const list = (x: unknown): unknown[] | null => (Array.isArray(x) ? x : null);

    switch (tool) {
      case "pullFacts": {
        const insights = list(v.insights);
        const plans = list(v.plans);
        const integrations = list(v.integrations) as { errorCount?: number }[] | null;
        const dairy = v.dairy as { nearExpiry?: unknown } | undefined;
        if (!insights || !plans || !integrations || typeof dairy?.nearExpiry !== "number") return true;
        return (
          insights.length > 0 ||
          plans.length > 0 ||
          dairy.nearExpiry > 0 ||
          integrations.some((i) => (i.errorCount ?? 0) > 0)
        );
      }
      // These three return retrieved material. Retrieval finding nothing is a
      // genuine "no evidence"; finding something is something to talk about.
      case "causalSubgraph": {
        const nodes = list(v.nodes);
        return nodes === null || nodes.length > 0;
      }
      case "recallMemory": {
        const items = list(v.memories) ?? list(v.results);
        return items === null || items.length > 0;
      }
      case "retrieveDocuments": {
        const items = list(v.documents) ?? list(v.results);
        return items === null || items.length > 0;
      }
      default:
        return true; // a tool this function has never heard of → assume it matters
    }
  });
}

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
  const narrateStage = (guarded: boolean): FlowStage => ({
    id: "narrate",
    labelAr: "صياغة",
    labelEn: "Write the answer",
    nodes: [{ id: "narrate", kind: "narrate", labelAr: "صياغة", labelEn: "Narrate" }],
    // THE QUIET EDGE. When the reasoning found nothing material, writing it up
    // anyway costs a call to say nothing. VOAC's doctrine already holds that
    // "nothing worth your attention" is a correct answer — this is the first
    // place that belief saves money instead of spending it.
    //
    // Only where there IS a reasoning node between the gather and the narrate.
    // `route` has none — its only post-gather call IS the narrate, so there is
    // nothing to skip and nothing that could have decided to skip it.
    ...(guarded ? { runIf: "hasSomethingToSay" as const } : {}),
  });

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
          narrateStage(false),
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
          narrateStage(true),
        ],
      };

    // Chain plus a critic that can send the work back — ONCE.
    //
    // topology.ts has always described this shape as "generate → grade →
    // revise until it passes", and the first cut of this file did not revise:
    // it graded and moved on. That is the same defect the whole module exists
    // to remove — a label describing work the code does not do — so the cycle
    // is now real, and bounded.
    //
    // BOUNDED AT ONE REVISION, deliberately. A critic loop with no ceiling is
    // an unbounded bill, and a second revision that still cannot ground its
    // figures is not short of attempts — it is short of FACTS, and another pass
    // over the same fact pack cannot produce them. The honest move at that
    // point is to hedge the answer, which the narrate node already does.
    //
    // The grade node stays PURE — it re-reads the draft's numeric claims
    // against the facts that were actually pulled, with no second model. A
    // model grading its own output is the cheapest way to buy confidence you
    // have not earned.
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
          // The cycle, expressed as two guarded stages rather than a back-edge.
          // Distinct stage ids on purpose: a second visit re-using the earlier
          // id would merge into that lane on the run page and flip its
          // "ran at once" badge on — drawing two sequential attempts as a
          // parallel fan-out, which is exactly the class of chart lie this
          // module was built to stop.
          {
            id: "revise",
            labelAr: "مراجعة",
            labelEn: "Revise",
            runIf: "revisionNeeded",
            nodes: [{ id: "revise", kind: "reason", labelAr: "مراجعة", labelEn: "Revise" }],
          },
          {
            id: "regrade",
            labelAr: "إعادة التدقيق",
            labelEn: "Check again",
            runIf: "revisionNeeded",
            nodes: [{ id: "regrade", kind: "grade", labelAr: "تدقيق", labelEn: "Grade" }],
          },
          narrateStage(true),
        ],
      };

    default:
      return null;
  }
}

/**
 * The MOST LLM calls this graph can make.
 *
 * Known before the first token — which is the point. topology.ts can only
 * estimate from a cost multiplier; a graph knows its own ceiling.
 *
 * WORST CASE, INCLUDING GUARDED STAGES, and that direction is not arbitrary:
 * `driver.live.ts` refuses a run up front when `used + planned > cap`. A
 * `planned` that assumed every guard skips would let a run start inside its
 * budget and finish outside it — the refusal would be honest about a graph
 * that never ran. Declaring the ceiling and billing the actual `realCalls`
 * errs toward refusing work we could have afforded, which is the safe side.
 */
export function llmNodeCount(spec: FlowSpec): number {
  return spec.stages.reduce(
    (n, s) => n + s.nodes.filter((x) => x.kind === "reason" || x.kind === "narrate").length,
    0,
  );
}

/** The fewest calls this graph can make — every guard skipping. Reporting only. */
export function minLlmNodeCount(spec: FlowSpec): number {
  return spec.stages.reduce(
    (n, s) => (s.runIf ? n : n + s.nodes.filter((x) => x.kind === "reason" || x.kind === "narrate").length),
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
