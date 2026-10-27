// lib/brain/llm.ts — the gateway gate. LOCKS the contract that a missing/blank
// GW_API_KEY means deterministic stub mode, and that a live call goes to
// gw-front's /v1/messages with an Anthropic model id. No real network: fetch
// is stubbed.

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { llmConfig, callLlm, extractJson, councilModel, plannerModel } from "./llm";
import { __setGwBindingForTest } from "./gwClient";

const KEYS = ["GW_API_KEY", "GW_BASE_URL", "GW_MODEL", "BRAIN_COUNCIL_MODEL", "BRAIN_PLANNER_MODEL", "BRAIN_LLM_RETRY_BASE_MS"] as const;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.BRAIN_LLM_RETRY_BASE_MS = "0";
  __setGwBindingForTest(null); // never touch a Workers context in unit tests
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  __setGwBindingForTest(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("llmConfig — the stub/live decision", () => {
  it("no key → disabled (stub mode), default Anthropic model, gw-front base", () => {
    const c = llmConfig();
    expect(c.enabled).toBe(false);
    expect(c.apiKey).toBeNull();
    expect(c.model).toBe("claude-sonnet-5-5");
    expect(c.baseUrl).toBe("https://gw-front.anashasiba91.workers.dev");
    expect(c.provider).toBe("gw-front");
  });
  it("a blank / whitespace key still counts as DISABLED (pitch-critical)", () => {
    process.env.GW_API_KEY = "   ";
    expect(llmConfig().enabled).toBe(false);
  });
  it("a real key → enabled, trimmed, model + base overridable", () => {
    process.env.GW_API_KEY = "  test-key  ";
    process.env.GW_MODEL = "claude-opus-5-5";
    process.env.GW_BASE_URL = "https://example.test/";
    const c = llmConfig();
    expect(c.enabled).toBe(true);
    expect(c.apiKey).toBe("test-key");
    expect(c.model).toBe("claude-opus-5-5");
    expect(c.baseUrl).toBe("https://example.test");
  });
});

describe("council / planner models", () => {
  it("default to the fast Anthropic model and stay overridable", () => {
    expect(councilModel()).toBe("claude-haiku-5-5");
    expect(plannerModel()).toBe("claude-haiku-5-5");
    process.env.BRAIN_COUNCIL_MODEL = "claude-sonnet-5-5";
    expect(councilModel()).toBe("claude-sonnet-5-5");
  });
});

describe("callLlm — stub fallback when no key", () => {
  it("returns the stub text, isStub:true, never calls the network", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    vi.useFakeTimers();
    const p = callLlm({ system: "s", user: "u" }, () => "STUB-OUTPUT");
    await vi.runAllTimersAsync();
    const res = await p;
    expect(res.isStub).toBe(true);
    expect(res.text).toBe("STUB-OUTPUT");
    expect(res.ms).toBeGreaterThanOrEqual(0);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("callLlm — live through gw-front", () => {
  it("POSTs {base}/v1/messages with x-api-key, anthropic-version and an Anthropic model id", async () => {
    process.env.GW_API_KEY = "test-key";
    const f = vi.fn(async () =>
      new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "  hello  " }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", f);

    const res = await callLlm({ system: "sys", user: "usr", model: "claude-haiku-5-5" }, () => "STUB");

    expect(res.isStub).toBe(false);
    expect(res.text).toBe("hello");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gw-front.anashasiba91.workers.dev/v1/messages");
    const h = init.headers as Record<string, string>;
    expect(h["x-api-key"]).toBe("test-key");
    expect(h["anthropic-version"]).toBe("2023-06-01");
    expect(h["content-type"]).toBe("application/json");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.model).toMatch(/^claude-(haiku|sonnet|opus)-5-5$/);
    expect(body.system).toBe("sys");
    expect(body.messages).toEqual([{ role: "user", content: "usr" }]);
  });

  it("degrades to the stub (typed error, no headers) when the gateway is down", async () => {
    process.env.GW_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const res = await callLlm({ system: "s", user: "u" }, () => "STUB");
    expect(res.isStub).toBe(true);
    expect(res.text).toBe("STUB");
    expect(res.error).toBe("network");
  });
});

describe("extractJson — tolerant model-output parsing", () => {
  it("returns null on empty / no-object input", () => {
    expect(extractJson("")).toBeNull();
    expect(extractJson("no json here")).toBeNull();
  });
  it("parses a bare object and ignores surrounding prose", () => {
    expect(extractJson('prefix {"a":1} suffix')).toEqual({ a: 1 });
  });
  it("unwraps a ```json fenced block", () => {
    expect(extractJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
  it("balances nested braces", () => {
    expect(extractJson('{"a":{"b":2}}')).toEqual({ a: { b: 2 } });
  });
  it("returns null for malformed / unbalanced JSON (never throws)", () => {
    expect(extractJson("{not json}")).toBeNull();
    expect(extractJson('{"a":1')).toBeNull();
  });
});
