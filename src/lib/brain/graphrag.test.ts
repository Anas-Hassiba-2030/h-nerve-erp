// Tests for the Phase RAG-4 Graph RAG core — pure Personalized PageRank and
// subgraph retrieval over the causal graph. Deterministic, no DB/network.

import { describe, it, expect } from "vitest";
import { personalizedPageRank, graphRetrieve, type GraphSnapshot } from "./graphrag";
import type { GraphNode, GraphEdge } from "./graph";

function node(id: string, label = id): GraphNode {
  return { id, kind: "Insight", label, ts: new Date(0), payload: {} };
}
function edge(from: string, to: string, weight = 1, confidence = 1): GraphEdge {
  return { from, to, kind: "causal", weight, confidence, evidenceCount: 1 };
}

// A → B → C → D chain, plus an isolated node X.
const CHAIN: GraphSnapshot = {
  nodes: [node("A"), node("B"), node("C"), node("D"), node("X")],
  edges: [edge("A", "B"), edge("B", "C"), edge("C", "D")],
};

describe("personalizedPageRank", () => {
  it("returns {} for an empty graph or no in-graph seeds", () => {
    expect(personalizedPageRank({ nodes: [], edges: [] }, ["A"]).size).toBe(0);
    expect(personalizedPageRank(CHAIN, ["does-not-exist"]).size).toBe(0);
  });

  it("ranks nodes nearer the seed higher (B over C over D)", () => {
    const r = personalizedPageRank(CHAIN, ["A"]);
    expect(r.get("A")!).toBeGreaterThan(r.get("B")!);
    expect(r.get("B")!).toBeGreaterThan(r.get("C")!);
    expect(r.get("C")!).toBeGreaterThan(r.get("D")!);
  });

  it("gives the disconnected node ~no mass when seeded elsewhere", () => {
    const r = personalizedPageRank(CHAIN, ["A"]);
    expect(r.get("X")!).toBeLessThan(r.get("D")!);
    expect(r.get("X")!).toBeLessThan(0.05);
  });

  it("produces a (near) probability distribution that sums to ~1", () => {
    const r = personalizedPageRank(CHAIN, ["A", "C"]);
    const total = [...r.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0.95);
    expect(total).toBeLessThan(1.05);
  });

  it("is deterministic across runs", () => {
    const a = personalizedPageRank(CHAIN, ["A"]);
    const b = personalizedPageRank(CHAIN, ["A"]);
    for (const id of a.keys()) expect(a.get(id)).toBeCloseTo(b.get(id)!, 12);
  });

  it("respects edge strength — a weak/low-confidence edge transmits less relevance", () => {
    const g: GraphSnapshot = {
      nodes: [node("S"), node("strong"), node("weak")],
      edges: [edge("S", "strong", 0.9, 1), edge("S", "weak", 0.1, 0.3)],
    };
    const r = personalizedPageRank(g, ["S"]);
    expect(r.get("strong")!).toBeGreaterThan(r.get("weak")!);
  });
});

describe("graphRetrieve", () => {
  it("returns [] for no valid seeds", () => {
    expect(graphRetrieve(CHAIN, []).nodes).toEqual([]);
  });

  it("returns top-k nodes sorted by score with the seed flagged", () => {
    const { nodes } = graphRetrieve(CHAIN, ["A"], { k: 3 });
    expect(nodes.length).toBe(3);
    expect(nodes[0].id).toBe("A");
    expect(nodes[0].isSeed).toBe(true);
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i - 1].score).toBeGreaterThanOrEqual(nodes[i].score);
    }
  });

  it("induces only the edges among the returned nodes", () => {
    const { nodes, edges } = graphRetrieve(CHAIN, ["A"], { k: 2 }); // A, B
    const ids = new Set(nodes.map((n) => n.id));
    expect(edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
    // A–B edge present; B–C excluded because C isn't in the top-2.
    expect(edges.some((e) => e.from === "A" && e.to === "B")).toBe(true);
    expect(edges.some((e) => e.to === "C")).toBe(false);
  });

  it("keeps a seed even when it would fall outside top-k by score", () => {
    // Seed the weakly-connected D; B/C outrank a far seed, but D must survive.
    const { nodes } = graphRetrieve(CHAIN, ["A", "D"], { k: 2, includeSeeds: true });
    const ids = nodes.map((n) => n.id);
    expect(ids).toContain("A");
    expect(ids).toContain("D");
  });
});
