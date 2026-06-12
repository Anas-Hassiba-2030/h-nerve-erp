// lib/brain/tools/councilDebate.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../council.live", () => ({
  council: () => ({
    convene: vi.fn(async () => ({
      synthesis: { recommendation: "Hold price", confidence: 0.7, dissentNote: "FX risk" },
      voices: [{ agentId: "finance-brain", position: "qualify", thesis: "Margins thin" }],
    })),
  }),
}));

import { councilDebateTool, councilDebateInput } from "./councilDebate";

describe("councilDebate tool", () => {
  it("requires a topic", () => {
    expect(councilDebateInput.safeParse({ topic: "" }).success).toBe(false);
  });
  it("returns synthesis + flattened voices", async () => {
    const out = await councilDebateTool.run({ topic: "raise dairy price?" });
    expect(out.recommendation).toBe("Hold price");
    expect(out.confidence).toBe(0.7);
    expect(out.voices[0]).toEqual({ agentId: "finance-brain", position: "qualify", thesis: "Margins thin" });
  });
});
