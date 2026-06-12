// lib/brain/tools/types.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseToolInput, type BrainTool } from "./types";

const fake: BrainTool<{ q: string }, { ok: true }> = {
  name: "fake",
  description: "test",
  inputSchema: z.object({ q: z.string().min(1) }),
  run: async () => ({ ok: true }),
};

describe("parseToolInput", () => {
  it("returns parsed data for valid input", () => {
    expect(parseToolInput(fake, { q: "hi" })).toEqual({ q: "hi" });
  });
  it("throws a named error for invalid input", () => {
    expect(() => parseToolInput(fake, { q: "" })).toThrow(/fake/);
  });
});
