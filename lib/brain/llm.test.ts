// lib/brain/llm.ts — the Claude gate. The pitch walkthrough flagged the
// "powered by CLAUDE" label vs unset key: this LOCKS the contract that a
// missing/blank ANTHROPIC_API_KEY means deterministic stub mode. Pure
// (env + a controllable timer); no network in these tests.

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { llmConfig, callLlm, extractJson } from "./llm";

const KEY = "ANTHROPIC_API_KEY";
const MODEL = "ANTHROPIC_MODEL";
let savedKey: string | undefined;
let savedModel: string | undefined;

beforeEach(() => {
  savedKey = process.env[KEY];
  savedModel = process.env[MODEL];
  delete process.env[KEY];
  delete process.env[MODEL];
});
afterEach(() => {
  savedKey === undefined ? delete process.env[KEY] : (process.env[KEY] = savedKey);
  savedModel === undefined ? delete process.env[MODEL] : (process.env[MODEL] = savedModel);
  vi.useRealTimers();
});

describe("llmConfig — the stub/live decision", () => {
  it("no key → disabled (stub mode), default model", () => {
    const c = llmConfig();
    expect(c.enabled).toBe(false);
    expect(c.apiKey).toBeNull();
    expect(c.model).toBe("claude-sonnet-4-5");
  });
  it("a blank / whitespace key still counts as DISABLED (pitch-critical)", () => {
    process.env[KEY] = "   ";
    expect(llmConfig().enabled).toBe(false);
  });
  it("a real key → enabled, trimmed, model overridable", () => {
    process.env[KEY] = "  sk-ant-xyz  ";
    process.env[MODEL] = "claude-opus-4-7";
    const c = llmConfig();
    expect(c.enabled).toBe(true);
    expect(c.apiKey).toBe("sk-ant-xyz");
    expect(c.model).toBe("claude-opus-4-7");
  });
});

describe("callLlm — stub fallback when no key", () => {
  it("returns the stub text, isStub:true, never calls the network", async () => {
    vi.useFakeTimers();
    const p = callLlm({ system: "s", user: "u" }, () => "STUB-OUTPUT");
    await vi.runAllTimersAsync();
    const res = await p;
    expect(res.isStub).toBe(true);
    expect(res.text).toBe("STUB-OUTPUT");
    expect(res.ms).toBeGreaterThanOrEqual(0);
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
