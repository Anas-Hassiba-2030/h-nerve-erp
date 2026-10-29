// llm.ts — LLM client with deterministic stub fallback.
//
// Every completion goes through gw-front (see ./gwClient.ts): the Anthropic
// Messages API at {GW_BASE_URL}/v1/messages, authenticated with GW_API_KEY.
// Anthropic models only (claude-haiku-5-5 / claude-sonnet-5-5 / claude-opus-5-5).
// There is no direct provider endpoint, no provider key, no OpenRouter and no
// local-runtime path in this file by design.
//
//   GW_API_KEY set   → live calls through the gateway
//   GW_API_KEY unset → stub mode: editorial-quality canned responses so the UI
//                      ships and demos cleanly in any environment
//
// The gateway is TEXT-ONLY: nothing here sends images or documents.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import { log } from "@/lib/utils/logger";
import { toPyLiteral } from "./serialize";
import { complete, gwConfig, GW_MODELS, type GwErrorCode } from "./gwClient";

export type LlmProvider = "gw-front";

export type LlmRequest = {
  system: string;
  user: string;
  // Optional structured input the agent should reason over (subgraph + memory).
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  // Per-call model override (else llmConfig().model). Council voices + moderator
  // pass councilModel() for speed; inert in stub mode (no API call is made).
  model?: string;
  // When the model returns JSON, the orchestrator can pass schema-shaped instructions.
  expectJson?: boolean;
  // Serve the stub even when a key is configured. Set by callers whose cost
  // guard tripped (e.g. the per-tenant daily budget) — degrade, don't error.
  forceStub?: boolean;
};

export type LlmResponse = {
  text: string;
  isStub: boolean;
  model?: string;
  ms: number;
  /** Set when a live call failed and the stub was served instead. */
  error?: GwErrorCode;
};

export type StubGenerator = (req: LlmRequest) => string;

/** Single global config for the whole brain. */
export function llmConfig(): {
  provider: LlmProvider;
  enabled: boolean;
  apiKey: string | null;
  model: string;
  baseUrl: string;
} {
  const c = gwConfig();
  return {
    provider: "gw-front",
    enabled: !!c.apiKey,
    apiKey: c.apiKey,
    model: c.model,
    baseUrl: c.baseUrl,
  };
}

// Council voices + moderator each emit a short (2-4 sentence) structured opinion
// — a fast model is plenty and ~3-5x quicker than Sonnet, which is the dominant
// latency when the brain runs LIVE (no effect in stub mode). Override with
// BRAIN_COUNCIL_MODEL (e.g. set it to the Sonnet id to restore prior behaviour).
export function councilModel(): string {
  return process.env.BRAIN_COUNCIL_MODEL?.trim() || GW_MODELS.fast;
}

// The Planner emits one compact, schema-shaped JSON plan (goal + 3-6 steps).
// The structured output is well within a fast model's reach, so default the
// planner to Haiku too. If the model returns flaky JSON, extractJson() fails
// and the caller falls back to a credible stub plan. Override with
// BRAIN_PLANNER_MODEL to restore a slower, stronger model.
export function plannerModel(): string {
  return process.env.BRAIN_PLANNER_MODEL?.trim() || GW_MODELS.fast;
}

// Phase D — runaway cost guard. A single process makes at most
// BRAIN_MAX_LLM_CALLS real gateway calls (default 200); after that it
// silently serves the stub so a loop or bug can't drain the budget.
let __llmCallCount = 0;
let __llmCapLogged = false;

/**
 * Fire one Messages-API call through gw-front. If no key is configured (or the
 * call fails), returns the stub. The stub is required so the UI is never broken
 * in dev / unauthenticated demos / a gateway outage.
 */
export async function callLlm(req: LlmRequest, stub: StubGenerator): Promise<LlmResponse> {
  const t0 = Date.now();
  const cfg = llmConfig();

  if (!cfg.enabled || !cfg.apiKey || req.forceStub) {
    // Optional artificial latency for the staggered-reveal feel. Default 0.
    const stubDelayMs = Number(process.env.BRAIN_STUB_DELAY_MS) || 0;
    if (stubDelayMs > 0) {
      await new Promise((r) => setTimeout(r, stubDelayMs));
    }
    return { text: stub(req), isStub: true, ms: Date.now() - t0 };
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

  const model = req.model || cfg.model;
  const r = await complete({
    system: req.system,
    messages: [{ role: "user", content: serializeUser(req.user, req.context) }],
    model,
    maxTokens: req.maxTokens ?? 700,
    temperature: req.temperature ?? 0.7,
  });

  if (!r.ok || !r.text) {
    // Only the typed code and status are logged: never headers, never the key.
    log.error("brain.llm: gateway call failed — serving stub", {
      error: r.error ?? "empty",
      status: r.status,
      retryable: r.retryable,
    });
    return { text: stub(req), isStub: true, ms: Date.now() - t0, error: r.error };
  }
  return { text: r.text, isStub: false, model, ms: Date.now() - t0 };
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
 * One Messages-API call WITH tools (native tool use works through gw-front).
 * Unlike callLlm(), the caller drives the loop: inspect `content` for tool_use
 * blocks, run them, append a tool_result message, and call again (the
 * orchestrator owns the iteration cap). Degrades to { isStub: true } on no key /
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

  const r = await complete({
    system: args.system,
    messages: args.messages,
    tools: args.tools,
    model: cfg.model,
    maxTokens: args.maxTokens ?? 700,
    temperature: args.temperature ?? 0.4,
  });
  if (!r.ok) {
    log.error("brain.llm: tool-use gateway call failed", {
      error: r.error,
      status: r.status,
      retryable: r.retryable,
    });
    return { content: [], stopReason: "stub", isStub: true, ms: Date.now() - t0 };
  }
  return {
    content: r.content,
    stopReason: r.stopReason,
    isStub: false,
    model: cfg.model,
    ms: Date.now() - t0,
  };
}
