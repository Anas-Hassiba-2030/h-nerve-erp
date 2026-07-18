// GET /api/health
//
// Extended liveness probe (Phase 24, updated for the Cloudflare deploy).
// Suitable for uptime monitors (Betterstack, Checkly, etc.).
//
//   200 { status: "ok", checks: { db: "ok", sources: {...} }, ... }   — all good
//   200 { status: "degraded", ... }              — up but non-critical check failed
//   503 { status: "error", checks: { db: "error" } }                  — no DB reachable
//
// `checks.sources` reports per-URL-source connectivity (NEON_DATABASE_URL /
// PG_DATABASE_URL / DATABASE_URL → ok | fail | not_configured) so a broken
// DB path is visible from the outside instead of masquerading as an empty
// system (the phantom "users: 0" failure mode that twice hid a dead DB
// during the Cloudflare migration). Deliberately leaks NOTHING about the
// URLs themselves — no hosts, no driver error text; failure detail goes to
// the server log only.
//
// Read-only, no auth. Probes raw connectivity (no tenant scoping).

import { NextResponse } from "next/server";
import { probeDatabases } from "@/lib/db/db";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

// process start reference; Workers isolates recycle so treat as isolate age.
const STARTED_AT = Date.now();

export async function GET() {
  const uptimeSeconds = Math.round((Date.now() - STARTED_AT) / 1000);

  // ── DB liveness, per configured source ──────────────────────────────────
  const t0 = Date.now();
  const sources = await probeDatabases();
  const dbLatencyMs = Date.now() - t0;

  const values = Object.values(sources);
  const dbStatus: "ok" | "error" = values.includes("ok") ? "ok" : "error";
  // A configured-but-failing source alongside a working one = degraded.
  const anyFailing = values.includes("fail");
  if (dbStatus === "error") {
    log.error("health: no database source reachable", { sources });
  } else if (anyFailing) {
    log.warn("health: some database sources failing", { sources });
  }

  const overallStatus =
    dbStatus === "error" ? "error" : anyFailing ? "degraded" : "ok";

  const body = {
    status: overallStatus,
    uptime: uptimeSeconds,
    ts: new Date().toISOString(),
    checks: {
      db: dbStatus,
      db_latency_ms: dbLatencyMs,
      sources,
    },
  };

  return NextResponse.json(body, { status: dbStatus === "error" ? 503 : 200 });
}
