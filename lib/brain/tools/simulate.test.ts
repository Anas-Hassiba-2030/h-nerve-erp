// lib/brain/tools/simulate.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { loadAll } = vi.hoisted(() => ({ loadAll: vi.fn() }));
vi.mock("../graph.prisma", () => ({ causalGraph: () => ({ loadAll }) }));
vi.mock("../simulator.bfs", () => ({
  simulateOnSnapshot: vi.fn(() => [
    { node: { id: "n2", label: "Maha demand" }, projectedDelta: 0.2, confidence: 0.8, hops: 1, pathSummary: "A → B" },
  ]),
}));

import { simulateTool, simulateInput } from "./simulate";

beforeEach(() => {
  loadAll.mockReset();
  loadAll.mockResolvedValue({ nodes: [], edges: [] });
});

describe("simulate tool", () => {
  it("requires nodeId and numeric delta", () => {
    expect(simulateInput.safeParse({ nodeId: "", delta: 0.3 }).success).toBe(false);
    expect(simulateInput.safeParse({ nodeId: "n1", delta: "x" }).success).toBe(false);
  });
  it("maps impact rows to a serializable shape", async () => {
    const out = await simulateTool.run({ nodeId: "n1", delta: 0.3 });
    expect(out.impacts[0]).toEqual({
      nodeId: "n2", label: "Maha demand", projectedDelta: 0.2, confidence: 0.8, hops: 1, pathSummary: "A → B",
    });
  });
  it("degrades to empty impacts when the graph load throws (DB read error)", async () => {
    loadAll.mockRejectedValueOnce(new Error("db down"));
    const out = await simulateTool.run({ nodeId: "n1", delta: 0.3 });
    expect(out.impacts).toEqual([]);
  });
});
