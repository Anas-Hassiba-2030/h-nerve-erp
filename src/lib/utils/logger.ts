// lib/logger.ts — structured logging.
//
// Thin structured-logging wrapper that emits JSON-line entries a log
// aggregator can parse, filter, and alert on. Production is the Cloudflare
// Worker, whose Workers Logs viewer captures `console.*`.
//
// Format (one JSON line per call, no pretty-print):
//   { "ts": "<ISO>", "level": "info|warn|error|debug", "msg": "...", ...fields }
//
// Usage:
//   import { log } from "@/lib/utils/logger";
//   log.info("narrator cache hit", { topic, register, ms });
//   log.warn("verification coverage low", { coverage: 0.1, topic });
//   log.error("db unreachable", { err: String(e) });
//
// Falls back gracefully in dev (still emits JSON so the format is consistent).
// No dependencies — zero-cost in the bundle.

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === "production";

function emit(level: Level, msg: string, fields?: Fields): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  let line: string;
  try {
    line = JSON.stringify(entry);
  } catch {
    // A field with a circular reference must not turn a log call into a
    // crash — drop the fields, keep the event.
    line = JSON.stringify({ ts: entry.ts, level, msg, note: "fields dropped (non-serializable)" });
  }

  // console.*, NOT process.stdout/stderr.
  //
  // This used to write to the process streams directly, which was correct on
  // Railway (a Node process) and silently WRONG on Cloudflare Workers, where
  // Workers Logs captures console output. Every warn/error the app emitted in
  // production went nowhere — which is precisely why a broken route could only
  // be discovered by a human hitting it. console.error still lands on stderr
  // under Node, so the stream split the log filters rely on is preserved.
  if (level === "error" || level === "warn") {
    console.error(line);
  } else if (IS_PROD || level !== "debug") {
    console.log(line);
  }
}

export const log = {
  debug: (msg: string, fields?: Fields) => emit("debug", msg, fields),
  info:  (msg: string, fields?: Fields) => emit("info",  msg, fields),
  warn:  (msg: string, fields?: Fields) => emit("warn",  msg, fields),
  error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};

export type ScopedLogger = typeof log;

/**
 * A child logger that stamps `scope` (and any base fields such as
 * `tenantId`) onto every entry — so request-path logs are filterable by
 * subsystem and tenant in the Railway aggregator. Per-call fields win over
 * the bound base fields.
 *
 *   const slog = scoped("import", { tenantId });
 *   slog.error("batch rejected", { count });   // → {scope:"import",tenantId,count,...}
 */
export function scoped(scope: string, base?: Fields): ScopedLogger {
  const merge = (fields?: Fields): Fields => ({ scope, ...base, ...fields });
  return {
    debug: (msg: string, fields?: Fields) => emit("debug", msg, merge(fields)),
    info:  (msg: string, fields?: Fields) => emit("info",  msg, merge(fields)),
    warn:  (msg: string, fields?: Fields) => emit("warn",  msg, merge(fields)),
    error: (msg: string, fields?: Fields) => emit("error", msg, merge(fields)),
  };
}
