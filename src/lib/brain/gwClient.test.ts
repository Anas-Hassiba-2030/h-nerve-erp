// gwClient — the gw-front transport. Fetch is stubbed; no real network.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { complete, stream, toolLoop, __setGwBindingForTest } from "./gwClient";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const textOk = (t: string) => json({ stop_reason: "end_turn", content: [{ type: "text", text: t }] });
const req = { messages: [{ role: "user" as const, content: "hi" }] };

beforeEach(() => {
  process.env.GW_API_KEY = "test-key";
  process.env.BRAIN_LLM_RETRY_BASE_MS = "0";
  __setGwBindingForTest(null);
});
afterEach(() => {
  delete process.env.GW_API_KEY;
  delete process.env.BRAIN_LLM_RETRY_BASE_MS;
  __setGwBindingForTest(undefined);
  vi.unstubAllGlobals();
});

describe("complete — result shape", () => {
  it("no key → typed no_key, no network", async () => {
    delete process.env.GW_API_KEY;
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const r = await complete(req);
    expect(r).toMatchObject({ ok: false, error: "no_key", retryable: false });
    expect(f).not.toHaveBeenCalled();
  });

  it("ok → text joined, stopReason, retryable false", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textOk("pong")));
    const r = await complete(req);
    expect(r).toMatchObject({ ok: true, text: "pong", stopReason: "end_turn", retryable: false });
  });
});

describe("complete — retry policy", () => {
  it("retries once on a network error, then succeeds", async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error("socket hang up")).mockResolvedValueOnce(textOk("ok"));
    vi.stubGlobal("fetch", f);
    const r = await complete(req);
    expect(r.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("retries once on 429 and on 5xx, then surfaces a typed error", async () => {
    const f429 = vi.fn(async () => new Response("slow down", { status: 429 }));
    vi.stubGlobal("fetch", f429);
    const a = await complete(req);
    expect(a).toMatchObject({ ok: false, error: "rate_limited", retryable: true, status: 429 });
    expect(f429).toHaveBeenCalledTimes(2);

    const f500 = vi.fn(async () => new Response("boom", { status: 502 }));
    vi.stubGlobal("fetch", f500);
    const b = await complete(req);
    expect(b).toMatchObject({ ok: false, error: "upstream", retryable: true, status: 502 });
    expect(f500).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a 503 with Retry-After or accepting:false (paused / budget spent)", async () => {
    const withHeader = vi.fn(async () => new Response("paused", { status: 503, headers: { "retry-after": "60" } }));
    vi.stubGlobal("fetch", withHeader);
    expect(await complete(req)).toMatchObject({ ok: false, error: "paused", retryable: false });
    expect(withHeader).toHaveBeenCalledTimes(1);

    const withBody = vi.fn(async () => json({ accepting: false }, 503));
    vi.stubGlobal("fetch", withBody);
    expect(await complete(req)).toMatchObject({ ok: false, error: "paused", retryable: false });
    expect(withBody).toHaveBeenCalledTimes(1);
  });

  it("401: retries once with Authorization: Bearer, never more, error carries no headers", async () => {
    const f = vi.fn(async () => new Response("no", { status: 401 }));
    vi.stubGlobal("fetch", f);
    const r = await complete(req);
    expect(r).toMatchObject({ ok: false, error: "auth", retryable: false, status: 401 });
    expect(f).toHaveBeenCalledTimes(2);
    const first = (f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    const second = (f.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(first["x-api-key"]).toBe("test-key");
    expect(second.authorization).toBe("Bearer test-key");
    expect(second["x-api-key"]).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain("test-key");
  });

  it("a Bearer retry that succeeds is a success", async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response("no", { status: 403 })).mockResolvedValueOnce(textOk("in"));
    vi.stubGlobal("fetch", f);
    expect((await complete(req)).ok).toBe(true);
  });

  it("other 4xx → bad_request, no retry", async () => {
    const f = vi.fn(async () => new Response("bad", { status: 400 }));
    vi.stubGlobal("fetch", f);
    expect(await complete(req)).toMatchObject({ ok: false, error: "bad_request", retryable: false });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("a caller abort is typed, not retried", async () => {
    const ac = new AbortController();
    const f = vi.fn(async () => {
      ac.abort();
      throw new Error("aborted");
    });
    vi.stubGlobal("fetch", f);
    const r = await complete({ ...req, signal: ac.signal });
    expect(r).toMatchObject({ ok: false, error: "aborted", retryable: false });
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe("service binding SVC_GWFRONT", () => {
  it("rides the binding when present (global fetch untouched)", async () => {
    const g = vi.fn();
    vi.stubGlobal("fetch", g);
    const b = { fetch: vi.fn(async () => textOk("via-binding")) };
    __setGwBindingForTest(b);
    const r = await complete(req);
    expect(r.text).toBe("via-binding");
    expect(b.fetch).toHaveBeenCalledTimes(1);
    expect(g).not.toHaveBeenCalled();
  });

  it("falls back to global fetch if the binding throws", async () => {
    const g = vi.fn(async () => textOk("via-fetch"));
    vi.stubGlobal("fetch", g);
    __setGwBindingForTest({ fetch: vi.fn(async () => { throw new Error("stub"); }) });
    expect((await complete(req)).text).toBe("via-fetch");
  });
});

describe("stream — SSE", () => {
  const sse = (events: unknown[]) =>
    new Response(
      new ReadableStream({
        start(c) {
          const enc = new TextEncoder();
          for (const e of events) c.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
          c.close();
        },
      }),
      { status: 200, headers: { "content-type": "text/event-stream" } },
    );

  it("delivers text deltas and assembles the final result", async () => {
    const f = vi.fn(async () =>
      sse([
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hel" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "lo" } },
        { type: "content_block_stop", index: 0 },
        { type: "message_delta", delta: { stop_reason: "end_turn" } },
      ]),
    );
    vi.stubGlobal("fetch", f);
    const seen: string[] = [];
    const r = await stream(req, (d) => seen.push(d));
    expect(seen).toEqual(["Hel", "lo"]);
    expect(r).toMatchObject({ ok: true, text: "Hello", stopReason: "end_turn" });
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.stream).toBe(true);
  });
});

describe("toolLoop — hard iteration cap", () => {
  it("runs tool_use -> tool_result then stops on end_turn", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "pullFacts", input: { a: 1 } }] }))
      .mockResolvedValueOnce(textOk("done"));
    vi.stubGlobal("fetch", f);
    const run = vi.fn(async () => ({ rooms: 12 }));
    const r = await toolLoop({ ...req, tools: [{ name: "pullFacts", description: "d", input_schema: {} }] }, run);
    expect(r.text).toBe("done");
    expect(run).toHaveBeenCalledWith("pullFacts", { a: 1 });
    const second = JSON.parse(String((f.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(second.messages.at(-1).content[0]).toMatchObject({ type: "tool_result", tool_use_id: "t1" });
  });

  it("stops at the cap when the model never finishes", async () => {
    const f = vi.fn(async () => json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "x", input: {} }] }));
    vi.stubGlobal("fetch", f);
    const r = await toolLoop(req, async () => "r", 3);
    expect(r.ok).toBe(false);
    expect(f).toHaveBeenCalledTimes(3);
  });
});
