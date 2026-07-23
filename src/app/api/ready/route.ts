// GET /api/ready
//
// Phase 24 — Readiness probe (stricter than /api/health).
//
// Health = "the process is alive and DB is reachable."
// Readiness = "the deployment is ready to serve real traffic."
//
// Fails hard (503, status "not_ready") only when:
//   - DB is unreachable. A deploy that can't reach its database must not
//     receive traffic.
//
// Returns 200 with status "ready_degraded" (serves traffic, but flags an
// ops warning) when:
//   - The workspace has never been seeded (no companies). The app still
//     renders; the seed bootstrap usually fills this in on first deploy, so
//     we don't want to wedge the deploy on an empty DB.
//   - No LLM key is set (the brain is disabled, but the rest of the ERP works).
//
// Use this as a Kubernetes readinessProbe or a stricter uptime-monitor
// target. Railway healthcheckPath uses /api/health (liveness only).
//
// Read-only, no auth.

import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db/db";
import { log } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const failures: string[] = [];
  const warnings: string[] = [];

  // ── DB reachability ───────────────────────────────────────────────────────
  let seededCompanies = 0;
  try {
    await prismaUnscoped.$queryRaw`SELECT 1`;
    seededCompanies = await prismaUnscoped.company.count();
  } catch (e) {
    failures.push("db_unreachable");
    log.error("ready: DB unreachable", { err: String(e) });
  }

  // ── Seeded check ─────────────────────────────────────────────────────────
  if (seededCompanies === 0) {
    warnings.push("workspace_unseeded");
    log.warn("ready: workspace has no companies — seed may not have run");
  }

  // ── Brain capability ──────────────────────────────────────────────────────
  const hasLLMKey =
    !!(process.env.ANTHROPIC_API_KEY ?? process.env.OPENROUTER_API_KEY ?? process.env.LLM_API_KEY);
  if (!hasLLMKey) {
    warnings.push("brain_disabled_no_api_key");
  }

  const ready = failures.length === 0;
  const status = ready
    ? warnings.length === 0
      ? "ready"
      : "ready_degraded"
    : "not_ready";

  const body: Record<string, unknown> = {
    status,
    ts: new Date().toISOString(),
    ...(failures.length > 0 ? { failures } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    diagnostics: {
      companies: seededCompanies,
      brain_enabled: hasLLMKey,
    },
  };

  return NextResponse.json(body, { status: ready ? 200 : 503 });
}
