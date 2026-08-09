import { describe, it, expect } from "vitest";
import {
  flowSpecFor, isGraphed, llmNodeCount, nodeCount, stageLabels,
  GATHERABLE_TOOLS, GRAPHED_TOPOLOGIES,
} from "./flowGraph";
import { VOAC_ROLES } from "./roles";
import { TOPOLOGIES } from "./topology";
import { pipelineFor } from "./orgMap";

const ALL_TOOLS = ["pullFacts", "causalSubgraph", "recallMemory", "retrieveDocuments", "simulate", "narrate"];

describe("flowSpecFor", () => {
  it("returns null for the loop-driven topologies, never an empty graph", () => {
    // A caller that gets an empty spec would happily "execute" nothing and
    // record a successful run with no work. null forces the fallback.
    for (const t of ["parallel", "orchestrate", "autonomous", "nonsense"]) {
      expect(flowSpecFor(t, ALL_TOOLS), t).toBeNull();
    }
  });

  it("graphs exactly route, chain and evaluate", () => {
    for (const t of GRAPHED_TOPOLOGIES) expect(flowSpecFor(t, ALL_TOOLS)).not.toBeNull();
    expect(GRAPHED_TOPOLOGIES.every(isGraphed)).toBe(true);
  });

  it("never puts simulate in a gather stage", () => {
    // simulate needs a specific causal nodeId and a delta. Deriving those from
    // a sentence means guessing, and a confident answer about the wrong entity
    // is worse than not running the tool at all.
    for (const t of GRAPHED_TOPOLOGIES) {
      const spec = flowSpecFor(t, ALL_TOOLS)!;
      const tools = spec.stages.flatMap((s) => s.nodes).filter((n) => n.kind === "tool");
      expect(tools.some((n) => n.tool === "simulate"), t).toBe(false);
      for (const n of tools) expect(GATHERABLE_TOOLS.has(n.tool!), n.tool).toBe(true);
    }
  });

  it("never nests a council inside a graphed run", () => {
    for (const t of GRAPHED_TOPOLOGIES) {
      const spec = flowSpecFor(t, [...ALL_TOOLS, "councilDebate"])!;
      expect(spec.stages.flatMap((s) => s.nodes).some((n) => n.tool === "councilDebate")).toBe(false);
    }
  });

  it("runs every gatherable tool in ONE stage — that is where the parallelism is", () => {
    const spec = flowSpecFor("chain", ALL_TOOLS)!;
    const gather = spec.stages.find((s) => s.id === "gather")!;
    expect(gather.nodes).toHaveLength(4);
    // ...and nowhere else: a tool appearing in two stages would run twice.
    const elsewhere = spec.stages.filter((s) => s.id !== "gather").flatMap((s) => s.nodes);
    expect(elsewhere.some((n) => n.kind === "tool")).toBe(false);
  });

  it("still produces a valid graph for a role with nothing to gather", () => {
    // Reasoning over nothing is thin but legitimate. Refusing would silently
    // disable roles the day a tool name changes.
    const spec = flowSpecFor("route", ["narrate"])!;
    expect(spec.stages.find((s) => s.id === "gather")!.nodes).toHaveLength(0);
    expect(llmNodeCount(spec)).toBeGreaterThan(0);
  });

  it("gives chain a second reasoning pass that route does not have", () => {
    const route = flowSpecFor("route", ALL_TOOLS)!;
    const chain = flowSpecFor("chain", ALL_TOOLS)!;
    expect(llmNodeCount(route)).toBe(2);
    expect(llmNodeCount(chain)).toBe(3);
  });

  it("grades with a free, model-free node — no self-scoring model", () => {
    const spec = flowSpecFor("evaluate", ALL_TOOLS)!;
    const grade = spec.stages.find((s) => s.id === "grade")!;
    expect(grade.nodes[0].kind).toBe("grade");
    // The grade node must NOT be counted as an LLM call.
    expect(llmNodeCount(spec)).toBe(3);
    expect(nodeCount(spec)).toBe(llmNodeCount(spec) + 4 + 1);
  });

  it("always ends by writing something a human reads", () => {
    for (const t of GRAPHED_TOPOLOGIES) {
      const spec = flowSpecFor(t, ALL_TOOLS)!;
      const last = spec.stages[spec.stages.length - 1];
      expect(last.nodes.map((n) => n.kind), t).toEqual(["narrate"]);
    }
  });

  it("keeps every node id unique inside a spec", () => {
    for (const t of GRAPHED_TOPOLOGIES) {
      const ids = flowSpecFor(t, ALL_TOOLS)!.stages.flatMap((s) => s.nodes).map((n) => n.id);
      expect(new Set(ids).size, t).toBe(ids.length);
    }
  });
});

describe("budget agreement with topology.ts", () => {
  it("never plans more LLM calls than the topology's own hop ceiling allows", () => {
    // driver.live.ts now passes llmNodeCount(spec) as the run's `hops`, so a
    // spec that outgrew its ceiling would be REFUSED at openRun and the role
    // would silently stop working while the graph looked innocent.
    //
    // The ceiling counts MODEL passes, not stages: maxHops is a compound-error
    // discipline (~95% per step is ~60% over ten), and the gather stage is
    // deterministic tool calls that compound no model error at all.
    for (const t of GRAPHED_TOPOLOGIES) {
      const spec = flowSpecFor(t, ALL_TOOLS)!;
      expect(llmNodeCount(spec), t).toBeLessThanOrEqual(TOPOLOGIES[t].maxHops);
    }
  });
});

describe("stageLabels / pipelineFor", () => {
  it("makes the drawn pipeline the same object the executor runs", () => {
    for (const t of GRAPHED_TOPOLOGIES) {
      const spec = flowSpecFor(t, [...GATHERABLE_TOOLS])!;
      expect(pipelineFor(t)).toEqual(spec.stages.map((s) => ({ ar: s.labelAr, en: s.labelEn })));
    }
  });

  it("still describes the council and the loop, which have no flow spec", () => {
    expect(pipelineFor("parallel").length).toBe(4);
    expect(pipelineFor("orchestrate").length).toBe(2);
    expect(stageLabels("parallel")).toEqual([]);
  });

  it("labels every stage in both languages", () => {
    for (const t of GRAPHED_TOPOLOGIES) {
      for (const s of stageLabels(t)) {
        expect(s.ar.length).toBeGreaterThan(0);
        expect(s.en.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("the roster against the graph", () => {
  it("gives every graphed role at least one thing to gather", () => {
    // A graphed role with zero gatherable tools would reason with no grounding
    // — allowed by the core, but a roster bug if it ever ships.
    for (const r of VOAC_ROLES) {
      if (!isGraphed(r.defaultTopology)) continue;
      const spec = flowSpecFor(r.defaultTopology, r.tools)!;
      expect(spec.stages.find((s) => s.id === "gather")!.nodes.length, r.id).toBeGreaterThan(0);
    }
  });
});
