// lib/observability/report.ts — production error reporting.
//
// The gap this closes: until now a crash in production was invisible. The app
// logged some failures, swallowed others behind a flashToast, and nothing ever
// reached a human. You found out a route was broken when someone said "the
// button doesn't work".
//
// Design constraints that shaped this:
//
//  1. KEYLESS BY DEFAULT. Cloudflare Workers Logs is already enabled for this
//     Worker (`observability.enabled` in wrangler.jsonc) and it captures
//     `console.*`. So the baseline reporter needs no account, no DSN, no
//     third-party SDK in the bundle — it emits one structured JSON line and
//     the platform's own log viewer becomes the error dashboard.
//  2. OPTIONAL PUSH ALERTING. Set ERROR_WEBHOOK_URL (any Slack- or
//     Discord-compatible incoming webhook) and errors are also pushed there,
//     so you learn about a break without opening a dashboard.
//  3. REPORTING MUST NEVER BE THE THING THAT BREAKS THE REQUEST. Every path
//     here is wrapped: a malformed error object, a circular structure, a dead
//     webhook host — none of them may escape. reportError() cannot throw.
//  4. NEVER LEAK SECRETS. Stack traces and error messages routinely contain
//     connection strings and API keys. Everything is redacted before it is
//     emitted, because logs are lower-trust than the process itself.
//
// Usage — in the catch block that already exists per CLAUDE.md's
// "wrap AI / parallel-DB calls in try/catch + flashToast" rule:
//
//   } catch (e) {
//     reportError("invoice.create failed", e, { tenantId, userId });
//     flashToast({ type: "info", entity: "info", id: "op", label: "…" });
//   }

import { log } from "@/lib/utils/logger";

export type ErrorFields = Record<string, unknown>;

/** How long the same error fingerprint stays muted for webhook pushes. */
const DEDUPE_WINDOW_MS = 60_000;
/** Stack frames kept. Enough to locate the fault, short enough to stay readable. */
const STACK_FRAMES = 8;
/** Hard ceiling on any single emitted string, so one huge blob can't flood logs. */
const MAX_FIELD_CHARS = 2_000;

// ─── Redaction ──────────────────────────────────────────────────────────────

// Ordered most-specific first. Each pattern replaces the SECRET portion only,
// keeping enough shape that the log still tells you what kind of value it was.
const REDACTIONS: Array<[RegExp, string]> = [
  // Provider API keys (Anthropic, OpenRouter, OpenAI, Google, generic sk-*).
  [/\bsk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-[redacted]"],
  [/\bsk-or-[A-Za-z0-9_-]{8,}/g, "sk-or-[redacted]"],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, "sk-[redacted]"],
  [/\bAIza[A-Za-z0-9_-]{16,}/g, "AIza[redacted]"],
  [/\bpa-[A-Za-z0-9_-]{16,}/g, "pa-[redacted]"],
  // Authorization headers / bearer tokens.
  [/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{12,}/gi, "$1 [redacted]"],
  // Connection strings — keep the scheme + host shape, drop the credentials.
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^:/\s@]+:[^@\s]+@/gi, "$1[redacted]@"],
  // key=value pairs whose KEY looks sensitive (query strings, env dumps).
  // The prefix/suffix around the sensitive word must be OPTIONAL: a key that
  // is EXACTLY `api_key` has nothing before the word, and requiring a leading
  // character silently let `?api_key=…` through.
  // The negative lookahead stops this rule from re-chewing an `Authorization:
  // Bearer …` header the rule above already sanitized — without it the output
  // became `authorization=[redacted] [redacted]`, which is noisier and hides
  // what kind of credential it was.
  [
    /\b([A-Za-z0-9_]*(?:password|passwd|secret|token|api[_-]?key|apikey|auth)[A-Za-z0-9_]*)\s*[=:]\s*(?!(?:bearer|basic)\b)("?)([^\s"&,;]+)\2/gi,
    "$1=[redacted]",
  ],
];

/**
 * Strip credential-shaped substrings from any text bound for a log sink.
 *
 * Deliberately conservative about what it KEEPS, not about what it removes:
 * a false positive costs a little readability, a false negative writes a live
 * API key into a log aggregator.
 */
export function redactSecrets(input: string): string {
  let out = input;
  for (const [pattern, replacement] of REDACTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function clamp(text: string, max = MAX_FIELD_CHARS): string {
  return text.length <= max ? text : text.slice(0, max) + `… [+${text.length - max} chars]`;
}

// ─── Error normalization ────────────────────────────────────────────────────

export type NormalizedError = {
  name: string;
  message: string;
  stack?: string;
  cause?: string;
};

/**
 * Turn anything a `catch` can hand you into a stable, redacted shape.
 *
 * `catch (e)` gives `unknown` — real Errors, but also strings, plain objects,
 * `undefined` from a rejected promise with no reason, and occasionally values
 * that throw on property access. All of them must produce a usable record
 * rather than a second crash inside the error handler.
 */
export function normalizeError(err: unknown): NormalizedError {
  if (err instanceof Error) {
    const stack = typeof err.stack === "string" ? err.stack.split("\n").slice(0, STACK_FRAMES).join("\n") : undefined;
    const cause = err.cause === undefined ? undefined : safeString(err.cause);
    return {
      name: redactSecrets(err.name || "Error"),
      message: clamp(redactSecrets(err.message || "(no message)")),
      ...(stack ? { stack: clamp(redactSecrets(stack)) } : {}),
      ...(cause ? { cause: clamp(redactSecrets(cause)) } : {}),
    };
  }
  return { name: "NonError", message: clamp(redactSecrets(safeString(err))) };
}

/** String-ify anything without ever throwing (circular refs, hostile getters). */
function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  // Errors must be handled BEFORE the JSON path: their fields are
  // non-enumerable, so JSON.stringify(new Error("inner")) is "{}" — which
  // threw away the entire cause chain, the most useful part of a wrapped
  // failure.
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  try {
    const json = JSON.stringify(value);
    if (json !== undefined) return json;
  } catch {
    /* circular or non-serializable — fall through */
  }
  try {
    return String(value);
  } catch {
    return "(unstringifiable)";
  }
}

/** Redact every string leaf in a caller-supplied field bag. */
function redactFields(fields: ErrorFields): ErrorFields {
  const out: ErrorFields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = typeof value === "string" ? clamp(redactSecrets(value)) : value;
  }
  return out;
}

// ─── Fingerprint + dedupe ───────────────────────────────────────────────────

/**
 * A stable id for "the same error happening again".
 *
 * Built from name + message + the first stack frame, so one broken route
 * failing on every request collapses to a single alert instead of a webhook
 * storm — while a genuinely different failure still gets through.
 */
export function fingerprint(e: NormalizedError): string {
  const frame = e.stack?.split("\n").find((l) => l.trim().startsWith("at ")) ?? "";
  return `${e.name}|${e.message}|${frame.trim()}`;
}

const lastSeen = new Map<string, number>();

/**
 * True when this fingerprint should be pushed to the webhook now.
 *
 * Pure w.r.t. the clock (the caller passes `now`) so the dedupe window is
 * testable without faking timers.
 */
export function shouldPush(fp: string, now: number, windowMs = DEDUPE_WINDOW_MS): boolean {
  const seen = lastSeen.get(fp);
  if (seen !== undefined && now - seen < windowMs) return false;
  lastSeen.set(fp, now);
  // Bound the map: a long-lived isolate must not accumulate fingerprints
  // forever. Evict anything already outside the window.
  if (lastSeen.size > 200) {
    for (const [key, ts] of lastSeen) {
      if (now - ts >= windowMs) lastSeen.delete(key);
    }
  }
  return true;
}

/** Test seam — clears the dedupe state between cases. */
export function __resetDedupe(): void {
  lastSeen.clear();
}

// ─── Emission ───────────────────────────────────────────────────────────────

export type ErrorEntry = {
  msg: string;
  err: NormalizedError;
  fingerprint: string;
} & ErrorFields;

/** Build the exact object that gets logged. Pure — the unit tests assert on this. */
export function buildErrorEntry(msg: string, err: unknown, fields: ErrorFields = {}): ErrorEntry {
  const normalized = normalizeError(err);
  return {
    ...redactFields(fields),
    msg: clamp(redactSecrets(msg)),
    err: normalized,
    fingerprint: fingerprint(normalized),
  };
}

/**
 * Push a one-line summary to ERROR_WEBHOOK_URL, if configured.
 *
 * Fire-and-forget by design: a server action must not wait on, or fail
 * because of, an alerting hop. `text` is the field both Slack and Discord
 * accept, so one env var works for either.
 */
function pushWebhook(entry: ErrorEntry): void {
  const url = process.env.ERROR_WEBHOOK_URL?.trim();
  if (!url) return;
  if (!shouldPush(entry.fingerprint, Date.now())) return;

  const text = clamp(
    `🔴 H-Nerve error — ${entry.msg}\n${entry.err.name}: ${entry.err.message}`,
    1_500,
  );

  try {
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => {
      // A dead webhook host must never surface to the user. The structured
      // log line already went out; that is the durable record.
    });
  } catch {
    /* fetch unavailable or threw synchronously — logging already succeeded */
  }
}

/**
 * Report a production error. Never throws, never rejects, never blocks.
 *
 * Always: one structured JSON line to stderr (→ Cloudflare Workers Logs).
 * Optionally: a deduped push to ERROR_WEBHOOK_URL.
 */
export function reportError(msg: string, err: unknown, fields: ErrorFields = {}): void {
  let entry: ErrorEntry;
  try {
    entry = buildErrorEntry(msg, err, fields);
  } catch {
    // Building the report itself failed — still emit something rather than
    // losing the incident entirely.
    try {
      log.error("observability: failed to build error entry", { msg: String(msg).slice(0, 200) });
    } catch {
      /* nothing left to do */
    }
    return;
  }

  try {
    log.error(entry.msg, { scope: "error", err: entry.err, fingerprint: entry.fingerprint, ...stripKnown(entry) });
  } catch {
    /* sink unavailable */
  }

  pushWebhook(entry);
}

/** Everything on the entry except the keys `reportError` passes explicitly. */
function stripKnown(entry: ErrorEntry): ErrorFields {
  const { msg: _msg, err: _err, fingerprint: _fp, ...rest } = entry;
  return rest;
}
