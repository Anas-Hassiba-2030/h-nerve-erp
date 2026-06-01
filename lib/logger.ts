// lib/logger.ts — Phase 24 (Railway Infrastructure Maximization).
//
// Thin structured-logging wrapper that emits JSON-line entries Railway's log
// aggregator can parse, filter, and alert on.
//
// Format (one JSON line per call, no pretty-print):
//   { "ts": "<ISO>", "level": "info|warn|error|debug", "msg": "...", ...fields }
//
// Usage:
//   import { log } from "@/lib/logger";
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
  const line = JSON.stringify(entry);

  // Railway captures stdout and stderr separately.
  // Route warn/error to stderr so alerts can filter on stream.
  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else if (IS_PROD || level !== "debug") {
    process.stdout.write(line + "\n");
  }
}

export const log = {
  debug: (msg: string, fields?: Fields) => emit("debug", msg, fields),
  info:  (msg: string, fields?: Fields) => emit("info",  msg, fields),
  warn:  (msg: string, fields?: Fields) => emit("warn",  msg, fields),
  error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};
