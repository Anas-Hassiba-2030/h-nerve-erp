// lib/brain/tools/narrate.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../narrator.claude", () => ({
  narrator: () => ({ write: vi.fn(async () => ({ text: "Occupancy is steady.", wordCount: 3, ms: 5, cacheHit: false, isStub: true })) }),
}));

import { narrateTool, narrateInput } from "./narrate";

describe("narrate tool", () => {
  it("rejects an unknown register", () => {
    expect(narrateInput.safeParse({ register: "poem", locale: "en", facts: {} }).success).toBe(false);
  });
  it("returns the narrated text", async () => {
    const out = await narrateTool.run({ register: "executive", locale: "en", facts: { occ: 0.78 } });
    expect(out.text).toBe("Occupancy is steady.");
    expect(out.isStub).toBe(true);
  });
});
