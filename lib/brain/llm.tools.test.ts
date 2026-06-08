// lib/brain/llm.tools.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callLlmWithTools } from "./llm";

const OLD = process.env.ANTHROPIC_API_KEY;
afterEach(() => {
  // Restore exactly: deleting when previously unset avoids coercing `undefined`
  // to the truthy string "undefined", which would leak LIVE mode to other files.
  if (OLD === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = OLD;
  vi.unstubAllGlobals();
});

describe("callLlmWithTools", () => {
  it("returns isStub when no API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await callLlmWithTools({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
    expect(r.isStub).toBe(true);
  });

  it("parses a tool_use response when a key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_1", name: "pullFacts", input: {} }] }),
    })));
    const r = await callLlmWithTools({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
    expect(r.isStub).toBe(false);
    expect(r.stopReason).toBe("tool_use");
    expect(r.content[0]).toMatchObject({ type: "tool_use", name: "pullFacts" });
  });

  it("degrades to isStub on a non-ok response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" })));
    const r = await callLlmWithTools({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
    expect(r.isStub).toBe(true);
  });
});
