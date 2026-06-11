// llm.ts — Anthropic Claude client with deterministic stub fallback.
//
// In production, set ANTHROPIC_API_KEY in `.env` and the brain calls the
// real model. If the key is missing, the stub mode returns
// editorial-quality canned responses so the UI ships and demos cleanly
// in any environment.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import { log } from "@/lib/utils/logger";
import { toPyLiteral } from "./serialize";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

export type LlmRequest = {
  system: string;
  user: string;
  // Optional structured input the agent should reason over (subgraph + memory).
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  // When the model returns JSON, the orchestrator can pass schema-shaped instructions.
  expectJson?: boolean;
};

export type LlmResponse = {
  text: string;
  isStub: boolean;
  model?: string;
  ms: number;
};

export type StubGenerator = (req: LlmRequest) => string;

/** Single global config for the whole brain. */
export function llmConfig() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return {
    enabled: Boolean(key),
    apiKey: key ?? null,
    model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
  };
}

// Phase D — runaway cost guard. A single process makes at most
// BRAIN_MAX_LLM_CALLS real Anthropic calls (default 200); after that it
// silently serves the stub so a loop or bug can't drain the API budget.
let __llmCallCount = 0;
let __llmCapLogged = false;

/**
 * Fire one Claude Messages-API call. If no key is configured, returns the stub.
 * The stub is required so the UI is never broken in dev / unauthenticated demos.
 */
export async function callLlm(req: LlmRequest, stub: StubGenerator): Promise<LlmResponse> {
  const t0 = Date.now();
  const cfg = llmConfig();

  if (!cfg.enabled || !cfg.apiKey) {
    // Tiny artificial latency so the UI's staggered reveal still feels alive.
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 700));
    return {
      text: stub(req),
      isStub: true,
      ms: Date.now() - t0,
    };
  }

  const cap = Number(process.env.BRAIN_MAX_LLM_CALLS ?? 200);
  if (cap > 0 && __llmCallCount >= cap) {
    if (!__llmCapLogged) {
      __llmCapLogged = true;
      log.warn("brain.llm: cost cap reached — serving stub", {
        cap,
        hint: "Raise BRAIN_MAX_LLM_CALLS to allow more real calls",
      });
    }
    return { text: stub(req), isStub: true, ms: Date.now() - t0 };
  }
  __llmCallCount++;

  // Bound the provider call so a hung connection degrades to the stub instead
  // of hanging the whole ask()/convene() request indefinitely. Abort lands in
  // the catch below, which already returns the stub fallback.
  const controller = new AbortController();
  const timeoutMs = Number(process.env.BRAIN_LLM_TIMEOUT_MS) || 20_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = {
      model: cfg.model,
      max_tokens: req.maxTokens ?? 700,
      temperature: req.temperature ?? 0.7,
      system: req.system,
      messages: [
        { role: "user", content: serializeUser(req.user, req.context) },
      ],
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      log.error("brain.llm: Anthropic API error", { status: res.status, body: errorText.slice(0, 400) });
      return {
        text: stub(req),
        isStub: true,
        ms: Date.now() - t0,
      };
    }

    const json: any = await res.json();
    const text =
      Array.isArray(json?.content)
        ? json.content
            .filter((c: any) => c?.type === "text" && typeof c.text === "string")
            .map((c: any) => c.text)
            .join("\n")
            .trim()
        : "";

    return {
      text: text || stub(req),
      isStub: !text,
      model: cfg.model,
      ms: Date.now() - t0,
    };
  } catch (err) {
    log.error("brain.llm: call failed", { err: String(err) });
    return {
      text: stub(req),
      isStub: true,
      ms: Date.now() - t0,
    };
  } finally {
    clearTimeout(timer);
  }
}

function serializeUser(user: string, context: Record<string, unknown> | undefined): string {
  if (!context || Object.keys(context).length === 0) return user;
  // Phase RAG-2-tail — render context as a Python literal, not JSON. LLMs read
  // structured/graph context substantially more accurately this way (ch. 14.7).
  return `${user}\n\n# CONTEXT (Python literal)\n${toPyLiteral(context)}`;
}

/**
 * Tries to extract a JSON object from a model response, tolerating the
 * common case where the model wraps JSON in markdown fences.
 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  // Find the first balanced JSON object.
  const start = body.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    if (body[i] === "{") depth++;
    else if (body[i] === "}") {
      depth--;
      if (depth === 0) {
        const slice = body.slice(start, i + 1);
        try {
          return JSON.parse(slice) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ── Tool-use loop seam ─────────────────────────────────────────────────────

export type AnthropicToolDef = { name: string; description: string; input_schema: object };
export type AnthropicMessage = { role: "user" | "assistant"; content: unknown };

export type ToolTurnResponse = {
  content: any[];          // assistant content blocks (text + tool_use)
  stopReason: string | null;
  isStub: boolean;
  model?: string;
  ms: number;
};

/**
 * One Claude Messages-API call WITH tools. Unlike callLlm(), the caller drives
 * the loop: inspect `content` for tool_use blocks, run them, append a
 * tool_result message, and call again. Degrades to { isStub: true } on no key /
 * cost cap / error / timeout — the orchestrator then falls back to the stub path.
 */
export async function callLlmWithTools(args: {
  system: string;
  messages: AnthropicMessage[];
  tools: AnthropicToolDef[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ToolTurnResponse> {
  const t0 = Date.now();
  const cfg = llmConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    return { content: [], stopReason: "stub", isStub: true, ms: Date.now() - t0 };
  }
  const cap = Number(process.env.BRAIN_MAX_LLM_CALLS ?? 200);
  if (cap > 0 && __llmCallCount >= cap) {
    return { content: [], stopReason: "stub", isStub: true, ms: Date.now() - t0 };
  }
  __llmCallCount++;

  const controller = new AbortController();
  const timeoutMs = Number(process.env.BRAIN_LLM_TIMEOUT_MS) || 20_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: args.maxTokens ?? 700,
        temperature: args.temperature ?? 0.4,
        system: args.system,
        messages: args.messages,
        tools: args.tools,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errorText = await res.text();
      log.error("brain.llm: tool-use API error", { status: res.status, body: errorText.slice(0, 400) });
      return { content: [], stopReason: "stub", isStub: true, ms: Date.now() - t0 };
    }
    const json: any = await res.json();
    return {
      content: Array.isArray(json?.content) ? json.content : [],
      stopReason: json?.stop_reason ?? null,
      isStub: false,
      model: cfg.model,
      ms: Date.now() - t0,
    };
  } catch (err) {
    log.error("brain.llm: tool-use call failed", { err: String(err) });
    return { content: [], stopReason: "stub", isStub: true, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}
