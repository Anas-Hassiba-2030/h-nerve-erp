// GET /api/ready
//
// Phase 24 — Readiness probe (stricter than /api/health).
//
// Health = "the process is alive and DB is reachable."
// Readiness = "the deployment is ready to serve real traffic."
//
// Fails (503) when:
//   - DB is unreachable.
//   - The workspace has never been seeded (no companies in the DB).
//     An unseeded deployment returns an empty dashboard — better to
//     route traffic away and surface an ops alert.
//   - LLM_API_KEY is missing (brain is disabled entirely).
//
// Use this as a Kubernetes readinessProbe or a stricter uptime-monitor
// target. Railway healthcheckPath uses /api/health (liveness only).
//
// Read-only, no auth.

import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";
import { log } from "@/lib/logger";

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
    !!(process.env.ANTHROPIC_API_KEY ?? process.env.LLM_API_KEY);
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
