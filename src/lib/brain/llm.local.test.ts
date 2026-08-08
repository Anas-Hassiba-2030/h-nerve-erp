// lib/brain/llm.ts — the LOCAL provider path (Ollama / LM Studio / llama.cpp).
//
// Locks three contracts:
// (1) LOCAL_LLM_BASE_URL outranks every hosted key — "run it on my machine"
//     must never be silently overridden by a stale key in the environment,
//     because the failure mode is a surprise bill;
// (2) the URL normaliser accepts what a person actually pastes;
// (3) callLlm speaks OpenAI chat/completions to the local URL with NO
//     Authorization header, and parses choices[0].message.content.

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { llmConfig, callLlm, councilModel, plannerModel, localChatUrl } from "./llm";

const KEYS = [
  "LOCAL_LLM_BASE_URL",
  "OLLAMA_HOST",
  "LOCAL_LLM_MODEL",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "BRAIN_COUNCIL_MODEL",
  "BRAIN_PLANNER_MODEL",
  "BRAIN_MAX_LLM_CALLS",
] as const;
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
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("localChatUrl", () => {
  it("accepts every form a person would actually paste", () => {
    const expected = "http://localhost:11434/v1/chat/completions";
    expect(localChatUrl("localhost:11434")).toBe(expected);
    expect(localChatUrl("http://localhost:11434")).toBe(expected);
    expect(localChatUrl("http://localhost:11434/")).toBe(expected);
    expect(localChatUrl("http://localhost:11434/v1")).toBe(expected);
    expect(localChatUrl("http://localhost:11434/v1/chat/completions")).toBe(expected);
    expect(localChatUrl("  localhost:11434  ")).toBe(expected);
  });

  it("keeps https when given it", () => {
    expect(localChatUrl("https://gpu.example.com")).toBe(
      "https://gpu.example.com/v1/chat/completions",
    );
  });
});

describe("llmConfig precedence", () => {
  it("puts local ABOVE a configured Anthropic key", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-should-not-win";
    process.env.LOCAL_LLM_BASE_URL = "http://localhost:11434";
    const cfg = llmConfig();
    expect(cfg.provider).toBe("local");
    expect(cfg.enabled).toBe(true);
  });

  it("puts local ABOVE a configured OpenRouter key", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-should-not-win";
    process.env.LOCAL_LLM_BASE_URL = "http://localhost:11434";
    expect(llmConfig().provider).toBe("local");
  });

  it("accepts OLLAMA_HOST as the trigger too", () => {
    process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
    expect(llmConfig().provider).toBe("local");
  });

  it("falls back to the hosted providers when no local URL is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    expect(llmConfig().provider).toBe("anthropic");
  });

  it("uses LOCAL_LLM_MODEL when given, and a default otherwise", () => {
    process.env.LOCAL_LLM_BASE_URL = "http://localhost:11434";
    expect(llmConfig().model).toBe("llama3.1:8b");
    process.env.LOCAL_LLM_MODEL = "qwen2.5:14b";
    expect(llmConfig().model).toBe("qwen2.5:14b");
  });
});

describe("council/planner model on local", () => {
  it("never names a hosted fast model — there is only the model you pulled", () => {
    process.env.LOCAL_LLM_BASE_URL = "http://localhost:11434";
    process.env.LOCAL_LLM_MODEL = "qwen2.5:14b";
    expect(councilModel()).toBe("qwen2.5:14b");
    expect(plannerModel()).toBe("qwen2.5:14b");
  });
});

describe("callLlm against a local server", () => {
  it("posts OpenAI-shaped JSON to /v1/chat/completions with no auth header", async () => {
    process.env.LOCAL_LLM_BASE_URL = "localhost:11434";
    process.env.LOCAL_LLM_MODEL = "llama3.1:8b";

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "  local answer  " } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await callLlm({ system: "sys", user: "usr" }, () => "STUB");

    expect(res.isStub).toBe(false);
    expect(res.text).toBe("local answer");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    // A local server has nothing to authenticate; some reject an unexpected
    // Authorization header outright.
    expect(JSON.stringify(init.headers)).not.toContain("uthorization");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("llama3.1:8b");
    expect(body.stream).toBe(false);
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
  });

  it("degrades to the stub when the local server is not running", async () => {
    process.env.LOCAL_LLM_BASE_URL = "localhost:11434";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const res = await callLlm({ system: "s", user: "u" }, () => "STUB");
    // Not an exception: a laptop with the model server closed must degrade to
    // the demo path, not 500 the page that called it.
    expect(res.isStub).toBe(true);
    expect(res.text).toBe("STUB");
  });
});
