// lib/brain/tools/simulate.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../graph.prisma", () => ({
  causalGraph: () => ({ loadAll: vi.fn(async () => ({ nodes: [], edges: [] })) }),
}));
vi.mock("../simulator.bfs", () => ({
  simulateOnSnapshot: vi.fn(() => [
    { node: { id: "n2", label: "Maha demand" }, projectedDelta: 0.2, confidence: 0.8, hops: 1, pathSummary: "A → B" },
  ]),
}));

import { simulateTool, simulateInput } from "./simulate";

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
});
