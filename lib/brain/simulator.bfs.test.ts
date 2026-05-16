// lib/brain/simulator.bfs.ts — the What-if engine. /brain/scenarios is a
// headline live-demo moment ("drop Arena 40% → watch the ripple"). The
// propagation math must be exact and deterministic. Pure, graph-agnostic.

import { describe, it, expect } from "vitest";
import { simulateOnSnapshot, primaryMetric } from "./simulator.bfs";

// Minimal GraphNode/GraphEdge fixtures (types are import-only / erased).
const node = (id: string, label = id, kind = "Company", payload: any = {}) =>
  ({ id, label, kind, payload } as any);
const edge = (from: string, to: string, weight = 1, confidence = 1) =>
  ({ from, to, weight, confidence } as any);

const ATT = 0.92;

describe("simulateOnSnapshot — downstream propagation", () => {
  it("unknown source node → empty result (never throws)", () => {
    const g = { nodes: [node("A")], edges: [] };
    expect(simulateOnSnapshot(g as any, { nodeId: "ZZZ", delta: -0.4 })).toEqual([]);
  });

  it("A→B→C decays by weight·confidence·0.92^hop and sorts by |impact|", () => {
    const g = {
      nodes: [node("A"), node("B"), node("C")],
      edges: [edge("A", "B"), edge("B", "C")],
    };
    const r = simulateOnSnapshot(g as any, { nodeId: "A", delta: -0.4 });
    expect(r.map((x) => x.node.id)).toEqual(["B", "C"]); // |.368| > |.339|
    expect(r[0].projectedDelta).toBeCloseTo(-0.4 * ATT, 6); // -0.368
    expect(r[0].hops).toBe(1);
    expect(r[0].pathSummary).toBe("A → B");
    expect(r[1].projectedDelta).toBeCloseTo(-0.4 * ATT * ATT, 6); // -0.33856
    expect(r[1].pathSummary).toBe("A → B → C");
  });

  it("confidence is the chained product along the BFS path", () => {
    const g = {
      nodes: [node("A"), node("B"), node("C")],
      edges: [edge("A", "B", 1, 0.5), edge("B", "C", 1, 0.5)],
    };
    const r = simulateOnSnapshot(g as any, { nodeId: "A", delta: -0.4 });
    const byId = Object.fromEntries(r.map((x) => [x.node.id, x]));
    expect(byId.B.confidence).toBeCloseTo(0.5, 6);
    expect(byId.C.confidence).toBeCloseTo(0.25, 6);
  });

  it("edges below 0.15 confidence do not propagate (noise cut)", () => {
    const g = { nodes: [node("A"), node("B")], edges: [edge("A", "B", 1, 0.1)] };
    expect(simulateOnSnapshot(g as any, { nodeId: "A", delta: -0.4 })).toEqual([]);
  });

  it("effects below 0.5% are pruned", () => {
    const g = { nodes: [node("A"), node("B")], edges: [edge("A", "B", 0.001, 1)] };
    expect(simulateOnSnapshot(g as any, { nodeId: "A", delta: -0.4 })).toEqual([]);
  });

  it("compounded deltas are clamped to ±1.5", () => {
    const g = { nodes: [node("A"), node("B")], edges: [edge("A", "B", 10, 1)] };
    const r = simulateOnSnapshot(g as any, { nodeId: "A", delta: -0.4 });
    expect(r[0].projectedDelta).toBe(-1.5);
  });

  it("self-loops are skipped", () => {
    const g = { nodes: [node("A")], edges: [edge("A", "A", 1, 1)] };
    expect(simulateOnSnapshot(g as any, { nodeId: "A", delta: -0.4 })).toEqual([]);
  });

  it("depthCap halts the wave", () => {
    const g = {
      nodes: ["A", "B", "C", "D"].map((x) => node(x)),
      edges: [edge("A", "B"), edge("B", "C"), edge("C", "D")],
    };
    const r = simulateOnSnapshot(g as any, { nodeId: "A", delta: -0.4 }, 1);
    expect(r.map((x) => x.node.id)).toEqual(["B"]);
  });
});

describe("primaryMetric — per-kind numeric field", () => {
  it("maps known kinds to their display field/unit", () => {
    expect(primaryMetric(node("h", "h", "Booking", { revenue: 1000 }))).toEqual({
      field: "revenue", unit: "JOD", value: 1000,
    });
    expect(primaryMetric(node("h", "h", "Hotel", { rooms: 12 }))).toEqual({
      field: "rooms", unit: "rooms", value: 12,
    });
    expect(primaryMetric(node("d", "d", "DairyBatch", { liters: 500 }))).toEqual({
      field: "liters", unit: "L", value: 500,
    });
  });
  it("returns null when the payload field is missing or kind is unknown", () => {
    expect(primaryMetric(node("h", "h", "Hotel", {}))).toBeNull();
    expect(primaryMetric(node("x", "x", "Mystery", { foo: 1 }))).toBeNull();
  });
});
