// gwClient.ts — the ONLY door from this app to a language model.
//
// Every completion goes through gw-front (Anthropic Messages API shape):
//   POST {GW_BASE_URL}/v1/messages
//   headers: content-type, anthropic-version, x-api-key (GW_API_KEY)
// Anthropic models only (claude-haiku-5-5 / claude-sonnet-5-5 / claude-opus-5-5).
// No direct provider endpoint, no provider key, no OpenRouter.
//
// Known gateway behaviour: native tool use and streaming work; the gateway is
// TEXT-ONLY (no image/document blocks in or out); first token takes ~3 s.
//
// Contract: never throws, never returns or logs request headers or the key.
// Failures are a typed result { ok:false, error, retryable }.
//
// Same-account Workers: a workers.dev fetch from one Worker to another on the
// same account fails (404). When the Worker has a service binding SVC_GWFRONT,
// the call rides it; otherwise (or if the binding throws) global fetch is used.

export const GW_DEFAULT_BASE_URL = "https://gw-front.anashasiba91.workers.dev";
export const GW_MODELS = {
  fast: "claude-haiku-5-5",
  default: "claude-sonnet-5-5",
  max: "claude-opus-5-5",
} as const;

const ANTHROPIC_VERSION = "2023-06-01";
/** Floor for the deadline: first token alone takes ~3 s, tail latency more. */
const MIN_DEADLINE_MS = 15_000;
const DEFAULT_DEADLINE_MS = 30_000;

export type GwErrorCode =
  | "no_key"
  | "auth"
  | "rate_limited"
  | "paused"
  | "upstream"
  | "bad_request"
  | "bad_response"
  | "network"
  | "timeout"
  | "aborted";

export type GwMessage = { role: "user" | "assistant"; content: unknown };
export type GwTool = { name: string; description: string; input_schema: object };

export type GwRequest = {
  system?: string;
  messages: GwMessage[];
  tools?: GwTool[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Caller cancel. */
  signal?: AbortSignal;
  /** Total deadline in ms (floored at 15 s). Default BRAIN_LLM_TIMEOUT_MS or 30 s. */
  timeoutMs?: number;
};

export type GwResult = {
  ok: boolean;
  /** Concatenated text blocks ("" on failure). */
  text: string;
  /** Raw assistant content blocks (text + tool_use) for tool loops. */
  content: any[];
  stopReason: string | null;
  model?: string;
  error?: GwErrorCode;
  /** HTTP status when the gateway answered (never headers). */
  status?: number;
  /** True when a later identical call could plausibly succeed. */
  retryable: boolean;
  ms: number;
};

export type GwConfig = { baseUrl: string; apiKey: string | null; model: string };

function envTrim(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function gwConfig(): GwConfig {
  return {
    baseUrl: (envTrim("GW_BASE_URL") || GW_DEFAULT_BASE_URL).replace(/\/+$/, ""),
    apiKey: envTrim("GW_API_KEY") || null,
    model: envTrim("GW_MODEL") || GW_MODELS.default,
  };
}

// ── transport ──────────────────────────────────────────────────────────────

type Fetcher = { fetch: (url: string, init?: RequestInit) => Promise<Response> };
let bindingOverride: Fetcher | null | undefined; // tests only

/** Test seam: force (or clear with undefined) the SVC_GWFRONT binding. */
export function __setGwBindingForTest(b: Fetcher | null | undefined): void {
  bindingOverride = b;
}

async function resolveBinding(): Promise<Fetcher | null> {
  if (bindingOverride !== undefined) return bindingOverride;
  try {
    const mod = await import("@opennextjs/cloudflare");
    const { env } = mod.getCloudflareContext();
    const b = (env as unknown as { SVC_GWFRONT?: Fetcher }).SVC_GWFRONT;
    return b && typeof b.fetch === "function" ? b : null;
  } catch {
    return null; // not inside a Workers request (Node dev, scripts, tests)
  }
}

async function gwFetch(url: string, init: RequestInit): Promise<Response> {
  const binding = await resolveBinding();
  if (binding) {
    try {
      return await binding.fetch(url, init);
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") throw err;
      // Binding unavailable (e.g. wrangler dev stub) → plain fetch.
    }
  }
  return fetch(url, init);
}

function sleepJitter(): Promise<void> {
  const base = Number(process.env.BRAIN_LLM_RETRY_BASE_MS ?? 400);
  const ms = base > 0 ? base + Math.random() * base : 0;
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

function deadline(req: GwRequest): number {
  const envMs = Number(process.env.BRAIN_LLM_TIMEOUT_MS);
  const want = req.timeoutMs ?? (envMs > 0 ? envMs : DEFAULT_DEADLINE_MS);
  return Math.max(MIN_DEADLINE_MS, want);
}

function buildBody(req: GwRequest, cfg: GwConfig, stream: boolean): string {
  return JSON.stringify({
    model: req.model || cfg.model,
    max_tokens: req.maxTokens ?? 700,
    temperature: req.temperature ?? 0.7,
    ...(req.system ? { system: req.system } : {}),
    messages: req.messages,
    ...(req.tools && req.tools.length > 0 ? { tools: req.tools } : {}),
    ...(stream ? { stream: true } : {}),
  });
}

function headers(apiKey: string, scheme: "x-api-key" | "bearer"): Record<string, string> {
  return {
    "content-type": "application/json",
    "anthropic-version": ANTHROPIC_VERSION,
    ...(scheme === "x-api-key" ? { "x-api-key": apiKey } : { authorization: `Bearer ${apiKey}` }),
  };
}

type Classified = { error: GwErrorCode; retryable: boolean; autoRetry: boolean };

/** Map a non-2xx answer to a typed error. `bodyText` is only inspected, never returned. */
function classify(status: number, retryAfter: boolean, bodyText: string): Classified {
  if (status === 401 || status === 403) return { error: "auth", retryable: false, autoRetry: false };
  if (status === 429) return { error: "rate_limited", retryable: true, autoRetry: true };
  if (status === 503 && (retryAfter || /"accepting"\s*:\s*false/.test(bodyText))) {
    // Paused or budget spent: surface, do not hammer.
    return { error: "paused", retryable: false, autoRetry: false };
  }
  if (status >= 500) return { error: "upstream", retryable: true, autoRetry: true };
  return { error: "bad_request", retryable: false, autoRetry: false };
}

type Attempt =
  | { kind: "ok"; res: Response }
  | { kind: "fail"; result: Omit<GwResult, "ms">; autoRetry: boolean };

function fail(error: GwErrorCode, retryable: boolean, status?: number): Omit<GwResult, "ms"> {
  return { ok: false, text: "", content: [], stopReason: null, error, status, retryable };
}

/** One HTTP attempt incl. the x-api-key → Bearer fallback on 401/403. */
async function attempt(
  url: string,
  body: string,
  apiKey: string,
  signal: AbortSignal,
  callerSignal?: AbortSignal,
): Promise<Attempt> {
  let scheme: "x-api-key" | "bearer" = "x-api-key";
  for (let i = 0; i < 2; i++) {
    let res: Response;
    try {
      res = await gwFetch(url, { method: "POST", headers: headers(apiKey, scheme), body, signal });
    } catch (err) {
      if (callerSignal?.aborted) return { kind: "fail", result: fail("aborted", false), autoRetry: false };
      if (signal.aborted) return { kind: "fail", result: fail("timeout", true), autoRetry: false };
      void err; // message may echo the URL/headers: classify only
      return { kind: "fail", result: fail("network", true), autoRetry: true };
    }
    if (res.ok) return { kind: "ok", res };
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      /* ignore */
    }
    if ((res.status === 401 || res.status === 403) && scheme === "x-api-key") {
      scheme = "bearer"; // gateway variants differ on the auth header: try once
      continue;
    }
    const c = classify(res.status, res.headers?.get?.("retry-after") != null, bodyText);
    return { kind: "fail", result: fail(c.error, c.retryable, res.status), autoRetry: c.autoRetry };
  }
  return { kind: "fail", result: fail("auth", false), autoRetry: false };
}

async function run(req: GwRequest, stream: boolean): Promise<{ attempt: Attempt; t0: number }> {
  const t0 = Date.now();
  const cfg = gwConfig();
  if (!cfg.apiKey) return { attempt: { kind: "fail", result: fail("no_key", false), autoRetry: false }, t0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadline(req));
  const onCaller = () => controller.abort();
  req.signal?.addEventListener("abort", onCaller, { once: true });
  if (req.signal?.aborted) controller.abort();
  const cleanup = () => {
    clearTimeout(timer);
    req.signal?.removeEventListener("abort", onCaller);
  };
  let keep = false;
  try {
    const url = `${cfg.baseUrl}/v1/messages`;
    const body = buildBody(req, cfg, stream);
    let a = await attempt(url, body, cfg.apiKey, controller.signal, req.signal);
    if (a.kind === "fail" && a.autoRetry && !controller.signal.aborted) {
      await sleepJitter();
      a = await attempt(url, body, cfg.apiKey, controller.signal, req.signal);
    }
    // A successful stream is still being read after we return: the consumer
    // (stream()) runs cleanup when it finishes, so the deadline keeps covering it.
    if (a.kind === "ok") {
      (a.res as any).__gwCleanup = cleanup;
      keep = true;
    }
    return { attempt: a, t0 };
  } finally {
    if (!keep) cleanup();
  }
}

function textOf(content: any[]): string {
  return content
    .filter((c) => c?.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n")
    .trim();
}

/** One non-streaming Messages call (optionally with tools). Never throws. */
export async function complete(req: GwRequest): Promise<GwResult> {
  const { attempt: a, t0 } = await run(req, false);
  const ms = () => Date.now() - t0;
  if (a.kind === "fail") return { ...a.result, ms: ms() };
  try {
    const json: any = await a.res.json();
    const content: any[] = Array.isArray(json?.content) ? json.content : [];
    return {
      ok: true,
      text: textOf(content),
      content,
      stopReason: json?.stop_reason ?? null,
      model: typeof json?.model === "string" ? json.model : req.model || gwConfig().model,
      retryable: false,
      ms: ms(),
    };
  } catch {
    return { ...fail(req.signal?.aborted ? "aborted" : "bad_response", !req.signal?.aborted), ms: ms() };
  } finally {
    ((a.res as any).__gwCleanup as (() => void) | undefined)?.();
  }
}

/**
 * Streaming Messages call (SSE). `onText` receives each text delta. Resolves
 * with the same typed result as complete() once the stream ends. Never throws.
 */
export async function stream(req: GwRequest, onText: (delta: string) => void): Promise<GwResult> {
  const { attempt: a, t0 } = await run(req, true);
  const ms = () => Date.now() - t0;
  if (a.kind === "fail") return { ...a.result, ms: ms() };
  const cleanup = (a.res as any).__gwCleanup as (() => void) | undefined;
  const blocks: any[] = [];
  let stopReason: string | null = null;
  let firstTokenMs: number | undefined;
  try {
    const reader = a.res.body?.getReader();
    if (!reader) return { ...fail("bad_response", true), ms: ms() };
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let ev: any;
        try {
          ev = JSON.parse(data);
        } catch {
          continue;
        }
        if (ev.type === "content_block_start") {
          blocks[ev.index] = { ...ev.content_block, ...(ev.content_block?.type === "text" ? { text: "" } : {}) };
        } else if (ev.type === "content_block_delta") {
          const b = (blocks[ev.index] ??= { type: "text", text: "" });
          if (ev.delta?.type === "text_delta" && typeof ev.delta.text === "string") {
            b.text = (b.text ?? "") + ev.delta.text;
            firstTokenMs ??= ms();
            onText(ev.delta.text);
          } else if (ev.delta?.type === "input_json_delta") {
            b.__json = (b.__json ?? "") + (ev.delta.partial_json ?? "");
          }
        } else if (ev.type === "content_block_stop") {
          const b = blocks[ev.index];
          if (b?.__json !== undefined) {
            try {
              b.input = JSON.parse(b.__json || "{}");
            } catch {
              b.input = {};
            }
            delete b.__json;
          }
        } else if (ev.type === "message_delta") {
          stopReason = ev.delta?.stop_reason ?? stopReason;
        } else if (ev.type === "error") {
          return { ...fail("upstream", true), ms: ms() };
        }
      }
    }
    const content = blocks.filter(Boolean);
    void firstTokenMs;
    return { ok: true, text: textOf(content), content, stopReason, retryable: false, ms: ms() };
  } catch {
    if (req.signal?.aborted) return { ...fail("aborted", false), ms: ms() };
    return { ...fail("network", true), ms: ms() };
  } finally {
    cleanup?.();
  }
}

/** Capped tool loop: the caller supplies `run` to execute each tool_use block. */
export async function toolLoop(
  req: GwRequest,
  runTool: (name: string, input: unknown) => Promise<unknown>,
  maxIterations = 6,
): Promise<GwResult> {
  const messages: GwMessage[] = [...req.messages];
  let last: GwResult | null = null;
  for (let i = 0; i < Math.max(1, maxIterations); i++) {
    last = await complete({ ...req, messages });
    if (!last.ok || last.stopReason !== "tool_use") return last;
    messages.push({ role: "assistant", content: last.content });
    const results: any[] = [];
    for (const b of last.content.filter((c) => c?.type === "tool_use")) {
      let out: unknown;
      let isError = false;
      try {
        out = await runTool(String(b.name), b.input);
      } catch (err) {
        isError = true;
        out = `tool error: ${(err as Error)?.message ?? "failed"}`;
      }
      results.push({
        type: "tool_result",
        tool_use_id: b.id,
        content: typeof out === "string" ? out : JSON.stringify(out ?? null),
        ...(isError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: results });
  }
  return { ...(last as GwResult), ok: false, error: "bad_response", retryable: false };
}
