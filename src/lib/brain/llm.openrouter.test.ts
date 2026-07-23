// lib/brain/llm.ts — OpenRouter provider path. Locks three contracts:
// (1) provider precedence: Anthropic key wins, OpenRouter is the fallback,
//     neither → stub; (2) callLlm speaks OpenAI chat/completions to the
//     OpenRouter URL and parses choices[0].message.content; (3) the
//     Anthropic⇄OpenAI translation helpers round-trip tool_use/tool_result
//     shapes exactly as the orchestrator loop expects.

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  llmConfig,
  callLlm,
  callLlmWithTools,
  councilModel,
  anthropicMessagesToOpenAi,
  openAiChoiceToAnthropic,
  type AnthropicMessage,
} from "./llm";

const KEYS = ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "ANTHROPIC_MODEL", "BRAIN_COUNCIL_MODEL"] as const;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]!);
  }
  vi.unstubAllGlobals();
});

describe("llmConfig — provider precedence", () => {
  it("OpenRouter key alone → openrouter provider, default anthropic/* slug", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    const c = llmConfig();
    expect(c.provider).toBe("openrouter");
    expect(c.enabled).toBe(true);
    expect(c.model).toBe("anthropic/claude-sonnet-4.5");
  });
  it("Anthropic key WINS over OpenRouter key", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    const c = llmConfig();
    expect(c.provider).toBe("anthropic");
    expect(c.apiKey).toBe("sk-ant-test");
  });
  it("neither key → disabled stub mode", () => {
    expect(llmConfig().enabled).toBe(false);
  });
  it("OPENROUTER_MODEL overrides the default slug", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    process.env.OPENROUTER_MODEL = "anthropic/claude-opus-4.1";
    expect(llmConfig().model).toBe("anthropic/claude-opus-4.1");
  });
  it("councilModel returns an openrouter slug under the openrouter provider", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    expect(councilModel()).toBe("anthropic/claude-haiku-4.5");
  });
});

describe("callLlm — openrouter request/response", () => {
  it("POSTs to openrouter.ai with a Bearer header and parses message.content", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "LIVE ANSWER" }, finish_reason: "stop" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await callLlm({ system: "s", user: "u" }, () => "STUB");
    expect(res.isStub).toBe(false);
    expect(res.text).toBe("LIVE ANSWER");
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(String(url)).toContain("openrouter.ai/api/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer sk-or-test");
    const body = JSON.parse(init.body);
    expect(body.messages[0]).toEqual({ role: "system", content: "s" });
    expect(body.messages[1].role).toBe("user");
  });
  it("degrades to the stub on a non-ok response", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, text: async () => "bad key" })));
    const res = await callLlm({ system: "s", user: "u" }, () => "STUB");
    expect(res.isStub).toBe(true);
    expect(res.text).toBe("STUB");
  });
});

describe("callLlmWithTools — openrouter tool-loop translation", () => {
  it("sends OpenAI-format tools and translates tool_calls back to tool_use blocks", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          finish_reason: "tool_calls",
          message: {
            content: "Let me check.",
            tool_calls: [{ id: "call_1", type: "function", function: { name: "pullFacts", arguments: '{"topic":"revenue"}' } }],
          },
        }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await callLlmWithTools({
      system: "s",
      messages: [{ role: "user", content: "q" }],
      tools: [{ name: "pullFacts", description: "d", input_schema: { type: "object" } }],
    });
    expect(r.isStub).toBe(false);
    expect(r.stopReason).toBe("tool_use");
    const toolUse = r.content.find((b: any) => b.type === "tool_use");
    expect(toolUse).toMatchObject({ id: "call_1", name: "pullFacts", input: { topic: "revenue" } });

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(body.tools[0]).toEqual({
      type: "function",
      function: { name: "pullFacts", description: "d", parameters: { type: "object" } },
    });
  });
});

describe("anthropicMessagesToOpenAi — history translation", () => {
  it("maps assistant tool_use → tool_calls and user tool_result → role:tool", () => {
    const messages: AnthropicMessage[] = [
      { role: "user", content: "question" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "checking" },
          { type: "tool_use", id: "call_1", name: "pullFacts", input: { topic: "occupancy" } },
        ],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "call_1", content: '{"occupancy":0.8}' }],
      },
    ];
    const out = anthropicMessagesToOpenAi(messages);
    expect(out[0]).toEqual({ role: "user", content: "question" });
    expect(out[1].tool_calls[0]).toEqual({
      id: "call_1",
      type: "function",
      function: { name: "pullFacts", arguments: '{"topic":"occupancy"}' },
    });
    expect(out[2]).toEqual({ role: "tool", tool_call_id: "call_1", content: '{"occupancy":0.8}' });
  });
});

describe("openAiChoiceToAnthropic — finish_reason mapping", () => {
  it("stop → end_turn, length → max_tokens, malformed arguments → {}", () => {
    expect(openAiChoiceToAnthropic({ choices: [{ finish_reason: "stop", message: { content: "hi" } }] }).stopReason).toBe("end_turn");
    expect(openAiChoiceToAnthropic({ choices: [{ finish_reason: "length", message: { content: "hi" } }] }).stopReason).toBe("max_tokens");
    const r = openAiChoiceToAnthropic({
      choices: [{ finish_reason: "tool_calls", message: { tool_calls: [{ id: "x", function: { name: "f", arguments: "not-json" } }] } }],
    });
    expect((r.content[0] as any).input).toEqual({});
  });
});
