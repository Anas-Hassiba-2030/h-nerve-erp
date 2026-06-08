// lib/brain/tools/causalSubgraph.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../graphrag.live", () => ({
  retrieveGraphContext: vi.fn(async () => ({
    nodes: [{ id: "n1", kind: "metric", label: "Occupancy", score: 0.9, isSeed: true }],
    links: ["Arena bookings →(+) Maha demand"],
  })),
}));

import { causalSubgraphTool, causalSubgraphInput } from "./causalSubgraph";

describe("causalSubgraph tool", () => {
  it("rejects empty question", () => {
    expect(causalSubgraphInput.safeParse({ question: "" }).success).toBe(false);
  });
  it("returns nodes + links from the core", async () => {
    const out = await causalSubgraphTool.run({ question: "why is occupancy down?" });
    expect(out.links).toEqual(["Arena bookings →(+) Maha demand"]);
    expect(out.nodes).toHaveLength(1);
  });
});
