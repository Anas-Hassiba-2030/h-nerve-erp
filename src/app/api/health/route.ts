// GET /api/health
//
// Phase 24 (Railway Infrastructure Maximization) — extended liveness probe.
//
// Polled by Railway's healthcheckPath every 30s (railway.toml).
// Also suitable for uptime monitors (Betterstack, Checkly, etc.).
//
//   200 { status: "ok", checks: { db: "ok" }, ... }     — all good
//   200 { status: "degraded", ... }                     — up but non-critical check failed
//   503 { status: "error", checks: { db: "error" }, ... } — DB unreachable
//
// Read-only, no auth. prismaUnscoped: infra probe needs raw DB access.

import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db/db";
import { log } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// process.uptime() is seconds since the Node process started.
const STARTED_AT = Date.now();

// Required env vars for a healthy production deployment.
const REQUIRED_ENV = ["DATABASE_URL"] as const;

export async function GET() {
  const uptimeSeconds = Math.round((Date.now() - STARTED_AT) / 1000);

  // ── DB liveness ──────────────────────────────────────────────────────────
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | undefined;

  try {
    const t0 = Date.now();
    await prismaUnscoped.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch (e) {
    dbStatus = "error";
    log.error("health: DB unreachable", { err: String(e) });
  }

  // ── Env check ────────────────────────────────────────────────────────────
  const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
  const envStatus: "ok" | "warn" = missingEnv.length === 0 ? "ok" : "warn";
  if (missingEnv.length > 0) {
    log.warn("health: missing env vars", { missing: missingEnv });
  }

  // ── Aggregate ────────────────────────────────────────────────────────────
  const overallStatus =
    dbStatus === "error"
      ? "error"
      : envStatus === "warn"
      ? "degraded"
      : "ok";

  const body: Record<string, unknown> = {
    status: overallStatus,
    uptime: uptimeSeconds,
    ts: new Date().toISOString(),
    checks: {
      db: dbStatus,
      ...(dbLatencyMs !== undefined ? { db_latency_ms: dbLatencyMs } : {}),
      env: envStatus,
      ...(missingEnv.length > 0 ? { missing_env: missingEnv } : {}),
    },
  };

  const httpStatus = dbStatus === "error" ? 503 : 200;
  return NextResponse.json(body, { status: httpStatus });
}
