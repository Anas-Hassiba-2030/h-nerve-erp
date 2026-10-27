// lib/brain/llm.tools.test.ts — native tool use through gw-front.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callLlmWithTools } from "./llm";
import { __setGwBindingForTest } from "./gwClient";

const OLD = { key: process.env.GW_API_KEY, retry: process.env.BRAIN_LLM_RETRY_BASE_MS };
beforeEach(() => {
  process.env.BRAIN_LLM_RETRY_BASE_MS = "0";
  __setGwBindingForTest(null);
});
afterEach(() => {
  // Restore exactly: deleting when previously unset avoids coercing `undefined`
  // to the truthy string "undefined", which would leak LIVE mode to other files.
  if (OLD.key === undefined) delete process.env.GW_API_KEY;
  else process.env.GW_API_KEY = OLD.key;
  if (OLD.retry === undefined) delete process.env.BRAIN_LLM_RETRY_BASE_MS;
  else process.env.BRAIN_LLM_RETRY_BASE_MS = OLD.retry;
  __setGwBindingForTest(undefined);
  vi.unstubAllGlobals();
});

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("callLlmWithTools", () => {
  it("returns isStub when no API key", async () => {
    delete process.env.GW_API_KEY;
    const r = await callLlmWithTools({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
    expect(r.isStub).toBe(true);
  });

  it("passes tool schemas through to gw-front and parses a tool_use response", async () => {
    process.env.GW_API_KEY = "test-key";
    const f = vi.fn(async () =>
      ok({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu_1", name: "pullFacts", input: {} }] }),
    );
    vi.stubGlobal("fetch", f);
    const tools = [{ name: "pullFacts", description: "d", input_schema: { type: "object", properties: {} } }];
    const r = await callLlmWithTools({ system: "s", messages: [{ role: "user", content: "hi" }], tools });
    expect(r.isStub).toBe(false);
    expect(r.stopReason).toBe("tool_use");
    expect(r.content[0]).toMatchObject({ type: "tool_use", name: "pullFacts" });

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/v1/messages")).toBe(true);
    const body = JSON.parse(String(init.body));
    expect(body.tools).toEqual(tools);
    expect(body.model).toMatch(/^claude-(haiku|sonnet|opus)-5-5$/);
  });

  it("degrades to isStub on a non-ok response (after one retry on 5xx)", async () => {
    process.env.GW_API_KEY = "test-key";
    const f = vi.fn(async () => new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", f);
    const r = await callLlmWithTools({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
    expect(r.isStub).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
