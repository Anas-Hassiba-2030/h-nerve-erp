// llm.ts — Anthropic Claude client with deterministic stub fallback.
//
// In production, set ANTHROPIC_API_KEY in `.env` and the brain calls the
// real model. If the key is missing, the stub mode returns
// editorial-quality canned responses so the UI ships and demos cleanly
// in any environment.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

const DEFAULT_MODEL = "claude-sonnet-4-5";
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
      console.warn(
        `[brain.llm] cost cap reached (${cap} real calls) — serving stub to protect the API budget. Raise BRAIN_MAX_LLM_CALLS to allow more.`,
      );
    }
    return { text: stub(req), isStub: true, ms: Date.now() - t0 };
  }
  __llmCallCount++;

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
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[brain.llm] Anthropic API error:", res.status, errorText);
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
    console.error("[brain.llm] call failed:", err);
    return {
      text: stub(req),
      isStub: true,
      ms: Date.now() - t0,
    };
  }
}

function serializeUser(user: string, context: Record<string, unknown> | undefined): string {
  if (!context || Object.keys(context).length === 0) return user;
  return `${user}\n\n# CONTEXT\n${JSON.stringify(context, null, 2)}`;
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
