// llm.ts — LLM client with deterministic stub fallback.
//
// Provider precedence:
//   0. LOCAL_LLM_BASE_URL → a model running on YOUR machine (Ollama, LM Studio,
//      llama.cpp — anything serving the OpenAI-compatible /v1/chat/completions
//      shape). No key, no per-token cost, no data leaving the building.
//   1. ANTHROPIC_API_KEY  → direct Anthropic Messages API.
//   2. OPENROUTER_API_KEY → OpenRouter's OpenAI-compatible chat/completions
//      API, translated to/from the Anthropic content-block shapes the rest
//      of the brain speaks. Same models (anthropic/* slugs), one gateway key.
//   3. None of the above  → stub mode: editorial-quality canned responses so
//      the UI ships and demos cleanly in any environment.
//
// WHY LOCAL WINS OVER A CONFIGURED KEY: setting LOCAL_LLM_BASE_URL is an
// explicit instruction to keep inference on this machine. If a stale key in
// the environment could silently outrank it, "run it locally" would quietly
// bill an API instead — the one outcome the setting exists to prevent.
//
// ⚠️ LOCAL IS A DEV/SELF-HOSTED PATH, NOT A PRODUCTION ONE. Production is a
// Cloudflare Worker; it cannot reach a laptop's localhost, and wrangler.jsonc
// sets `global_fetch_strictly_public`, which blocks private addresses outright.
// Pointing prod at a local model needs a public tunnel to the machine running
// it — a deliberate infrastructure decision, not a config flip.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import { log } from "@/lib/utils/logger";
import { toPyLiteral } from "./serialize";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// OpenRouter slugs for the same Anthropic models the direct path uses.
const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5";
const OPENROUTER_FAST_MODEL = "anthropic/claude-haiku-4.5";

export type LlmProvider = "anthropic" | "openrouter" | "local";

/** Default model when running locally. Small enough to run on a laptop;
 *  override with LOCAL_LLM_MODEL for anything you have actually pulled. */
const DEFAULT_LOCAL_MODEL = "llama3.1:8b";

/**
 * Normalise a local base URL to its OpenAI-compatible chat endpoint.
 *
 * Accepts what a person would actually paste: "localhost:11434",
 * "http://localhost:11434", ".../v1", or the full ".../v1/chat/completions".
 * Ollama and LM Studio both serve that path; getting this wrong produces a
 * 404 that reads as "local models don't work".
 */
export function localChatUrl(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
  if (base.endsWith("/chat/completions")) return base;
  if (base.endsWith("/v1")) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

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
};

export type StubGenerator = (req: LlmRequest) => string;

/** Single global config for the whole brain. */
export function llmConfig(): {
  provider: LlmProvider;
  enabled: boolean;
  apiKey: string | null;
  model: string;
} {
  // Highest precedence on purpose — see the header note. Accepts OLLAMA_HOST
  // too, because that is the variable Ollama users already have set.
  const localBase =
    process.env.LOCAL_LLM_BASE_URL?.trim() || process.env.OLLAMA_HOST?.trim();
  if (localBase) {
    return {
      provider: "local",
      enabled: true,
      // No key: a local server has nothing to authenticate against. The field
      // stays non-null so every `cfg.apiKey` guard downstream still passes.
      apiKey: "local",
      model: process.env.LOCAL_LLM_MODEL?.trim() || DEFAULT_LOCAL_MODEL,
    };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    return {
      provider: "anthropic",
      enabled: true,
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    };
  }
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    return {
      provider: "openrouter",
      enabled: true,
      apiKey: openrouterKey,
      model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
    };
  }
  return {
    provider: "anthropic",
    enabled: false,
    apiKey: null,
    model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
  };
}

// Council voices + moderator each emit a short (2-4 sentence) structured opinion
// — a fast model is plenty and ~3-5x quicker than Sonnet, which is the dominant
// latency when the brain runs LIVE (no effect in stub mode). Override with
// BRAIN_COUNCIL_MODEL (e.g. set it to the Sonnet id to restore prior behaviour).
export function councilModel(): string {
  const override = process.env.BRAIN_COUNCIL_MODEL?.trim();
  if (override) return override;
  const cfg = llmConfig();
  // A local runtime has exactly the model you pulled. Naming a hosted "fast"
  // model there would 404 every council call and look like the council is
  // broken, when the real answer is that there is no second model to pick.
  if (cfg.provider === "local") return cfg.model;
  return cfg.provider === "openrouter" ? OPENROUTER_FAST_MODEL : "claude-haiku-4-5-20251001";
}

// The Planner emits one compact, schema-shaped JSON plan (goal + 3-6 steps).
// On Sonnet this was the single slowest LIVE button in the app — "Generate
// plan" routinely took 10s+. The structured output is well within a fast
// model's reach, so default the planner to Haiku too (~3-5x quicker). If the
// model returns flaky JSON, extractJson() fails and the caller falls back to a
// credible stub plan — instant either way. Override with BRAIN_PLANNER_MODEL
// (e.g. the Sonnet id) to restore the prior, slower behaviour.
export function plannerModel(): string {
  const override = process.env.BRAIN_PLANNER_MODEL?.trim();
  if (override) return override;
  const cfg = llmConfig();
  if (cfg.provider === "local") return cfg.model;
  return cfg.provider === "openrouter" ? OPENROUTER_FAST_MODEL : "claude-haiku-4-5-20251001";
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

  if (!cfg.enabled || !cfg.apiKey || req.forceStub) {
    // Optional artificial latency for the staggered-reveal feel. Default 0.
    // In STUB mode (the demo default — no ANTHROPIC_API_KEY) EVERY brain call
    // hit this, so a single council (5 voices + moderator) paid ~1.2-2.6s of
    // pure fake delay and the convene/theater UI felt frozen. The client
    // already drives its own reveal animation, so the server pause is
    // redundant — set BRAIN_STUB_DELAY_MS>0 only to restore a deliberate beat.
    const stubDelayMs = Number(process.env.BRAIN_STUB_DELAY_MS) || 0;
    if (stubDelayMs > 0) {
      await new Promise((r) => setTimeout(r, stubDelayMs));
    }
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
  // Local inference on CPU is far slower than a hosted API — a first call that
  // also loads the model into memory routinely takes a minute. The hosted
  // default would abort it and degrade to the stub, which reads as "the local
  // model doesn't work" when it was simply still thinking.
  const defaultTimeout = cfg.provider === "local" ? 180_000 : 20_000;
  const timeoutMs = Number(process.env.BRAIN_LLM_TIMEOUT_MS) || defaultTimeout;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const model = req.model || cfg.model;
    const userContent = serializeUser(req.user, req.context);
    // Both OpenRouter and every local runtime worth using speak OpenAI's
    // chat/completions shape; only the URL and the auth header differ.
    const openAiShaped = cfg.provider === "openrouter" || cfg.provider === "local";
    let res: Response;
    if (openAiShaped) {
      const isLocal = cfg.provider === "local";
      const url = isLocal
        ? localChatUrl(process.env.LOCAL_LLM_BASE_URL?.trim() || process.env.OLLAMA_HOST!.trim())
        : OPENROUTER_URL;
      res = await fetch(url, {
        method: "POST",
        // A local server has no key to send, and some reject an Authorization
        // header they did not ask for.
        headers: isLocal
          ? { "content-type": "application/json" }
          : openrouterHeaders(cfg.apiKey),
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 700,
          temperature: req.temperature ?? 0.7,
          // Ollama streams by default on some builds; the parser below reads a
          // single JSON body, so ask for one explicitly.
          ...(isLocal ? { stream: false } : {}),
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: userContent },
          ],
        }),
        signal: controller.signal,
      });
    } else {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": cfg.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: req.maxTokens ?? 700,
          temperature: req.temperature ?? 0.7,
          system: req.system,
          messages: [{ role: "user", content: userContent }],
        }),
        signal: controller.signal,
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      log.error("brain.llm: LLM API error", { provider: cfg.provider, status: res.status, body: errorText.slice(0, 400) });
      return {
        text: stub(req),
        isStub: true,
        ms: Date.now() - t0,
      };
    }

    const json: any = await res.json();
    const text =
      openAiShaped
        ? (typeof json?.choices?.[0]?.message?.content === "string"
            ? json.choices[0].message.content.trim()
            : "")
        : Array.isArray(json?.content)
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
  const defaultTimeout = cfg.provider === "local" ? 180_000 : 20_000;
  const timeoutMs = Number(process.env.BRAIN_LLM_TIMEOUT_MS) || defaultTimeout;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Same OpenAI chat/completions shape for both — see callLlm above. Local
  // runtimes vary in how well they honour tool-calling; when one returns no
  // tool_calls the loop simply gets a text answer, which is the same
  // degradation path an unhelpful hosted model produces.
  const openAiShaped = cfg.provider === "openrouter" || cfg.provider === "local";
  try {
    let res: Response;
    if (openAiShaped) {
      const isLocal = cfg.provider === "local";
      const url = isLocal
        ? localChatUrl(process.env.LOCAL_LLM_BASE_URL?.trim() || process.env.OLLAMA_HOST!.trim())
        : OPENROUTER_URL;
      res = await fetch(url, {
        method: "POST",
        headers: isLocal
          ? { "content-type": "application/json" }
          : openrouterHeaders(cfg.apiKey),
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: args.maxTokens ?? 700,
          temperature: args.temperature ?? 0.4,
          ...(isLocal ? { stream: false } : {}),
          messages: [
            { role: "system", content: args.system },
            ...anthropicMessagesToOpenAi(args.messages),
          ],
          tools: args.tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.input_schema },
          })),
        }),
        signal: controller.signal,
      });
    } else {
      res = await fetch("https://api.anthropic.com/v1/messages", {
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
    }
    if (!res.ok) {
      const errorText = await res.text();
      log.error("brain.llm: tool-use API error", { provider: cfg.provider, status: res.status, body: errorText.slice(0, 400) });
      return { content: [], stopReason: "stub", isStub: true, ms: Date.now() - t0 };
    }
    const json: any = await res.json();
    if (openAiShaped) {
      const translated = openAiChoiceToAnthropic(json);
      return { ...translated, isStub: false, model: cfg.model, ms: Date.now() - t0 };
    }
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

// ── OpenRouter translation layer ───────────────────────────────────────────
// The brain speaks Anthropic content blocks end-to-end (orchestrator builds
// tool_result messages, filters tool_use blocks, checks stop_reason ===
// "tool_use"). OpenRouter speaks OpenAI chat/completions. These helpers keep
// the translation in ONE place so every caller stays provider-agnostic.

function openrouterHeaders(apiKey: string): Record<string, string> {
  return {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
    // Attribution headers OpenRouter recommends; harmless elsewhere.
    "http-referer": process.env.NEXT_PUBLIC_APP_URL || "https://h-nerve-erp.anashasiba91.workers.dev",
    "x-title": "H-Nerve ERP Brain",
  };
}

/** Anthropic-shaped message history → OpenAI chat messages. */
export function anthropicMessagesToOpenAi(messages: AnthropicMessage[]): any[] {
  const out: any[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    const blocks = Array.isArray(m.content) ? (m.content as any[]) : [];
    if (m.role === "assistant") {
      const text = blocks
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n");
      const toolCalls = blocks
        .filter((b) => b?.type === "tool_use")
        .map((b) => ({
          id: String(b.id ?? ""),
          type: "function",
          function: { name: String(b.name ?? ""), arguments: JSON.stringify(b.input ?? {}) },
        }));
      out.push({
        role: "assistant",
        content: text || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
    } else {
      // user turn: tool_result blocks each become a role:"tool" message;
      // plain text blocks join into one user message.
      const toolResults = blocks.filter((b) => b?.type === "tool_result");
      for (const r of toolResults) {
        out.push({
          role: "tool",
          tool_call_id: String(r.tool_use_id ?? ""),
          content: typeof r.content === "string" ? r.content : JSON.stringify(r.content ?? ""),
        });
      }
      const text = blocks
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n");
      if (text) out.push({ role: "user", content: text });
    }
  }
  return out;
}

/** OpenAI chat/completions response → Anthropic content blocks + stop_reason. */
export function openAiChoiceToAnthropic(json: any): { content: any[]; stopReason: string | null } {
  const choice = json?.choices?.[0];
  const msg = choice?.message;
  const content: any[] = [];
  if (typeof msg?.content === "string" && msg.content.trim()) {
    content.push({ type: "text", text: msg.content });
  }
  const toolCalls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];
  for (const tc of toolCalls) {
    let input: unknown = {};
    try {
      input = JSON.parse(tc?.function?.arguments ?? "{}");
    } catch {
      input = {};
    }
    content.push({
      type: "tool_use",
      id: String(tc?.id ?? ""),
      name: String(tc?.function?.name ?? ""),
      input,
    });
  }
  const finish = choice?.finish_reason ?? null;
  const stopReason =
    finish === "tool_calls" ? "tool_use"
    : finish === "length" ? "max_tokens"
    : finish === "stop" ? "end_turn"
    : finish;
  return { content, stopReason };
}
