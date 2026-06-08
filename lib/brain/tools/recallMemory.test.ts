// lib/brain/tools/recallMemory.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../memory.live", () => ({
  memoryLake: () => ({
    recall: vi.fn(async () => [
      { id: "m1", module: "DAIRY", headline: { ar: "ع", en: "Spoilage spike" }, similarity: 0.82, outcome: { metric: "waste", delta: -0.1 } },
    ]),
  }),
}));

import { recallMemoryTool, recallMemoryInput } from "./recallMemory";

describe("recallMemory tool", () => {
  it("requires a situation", () => {
    expect(recallMemoryInput.safeParse({ situation: "" }).success).toBe(false);
  });
  it("maps recalled memories to a serializable shape", async () => {
    const out = await recallMemoryTool.run({ situation: "milk near expiry" });
    expect(out.memories[0].id).toBe("m1");
    expect(out.memories[0].similarity).toBe(0.82);
  });
});
