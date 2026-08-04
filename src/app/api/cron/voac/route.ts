// GET /api/cron/voac — the scheduled VOAC fire.
//
// The driver runs ONE role. This runs the company on a schedule: it picks which
// roles across which rosters are due, executes them, and returns one line the
// cron log can carry.
//
// WHY THIS IS THIN: every hard decision lives in a pure, tested module —
// src/lib/voac/schedule.ts picks the work and enforces the per-fire cap;
// driver.live.ts owns the run, its budget brakes and its ledger. This file only
// authenticates, fans out, and reports. That split is deliberate: a cron route
// is the single worst place to hide logic, because it runs unattended and its
// failures are read hours later from a log line, if at all.
//
// COST SAFETY. A scheduled fan-out is the one place this system could quietly
// spend real money, so three limits stack:
//   1. MAX_RUNS_PER_FIRE below — a hard ceiling, cap-truncated most-stale-first
//      so no tenant is ever starved;
//   2. each roster's cadenceHours — a role that ran recently is skipped;
//   3. the per-tenant LLM budget inside the driver, which refuses before
//      spending and records BUDGET_EXHAUSTED rather than throwing.
// Nothing is truncated silently: the response carries the skipped count and
// the first reasons, because a fire that quietly did a tenth of the work looks
// identical in a log to one that had nothing to do.
//
// Fails CLOSED: with no CRON_SECRET configured the endpoint is disabled rather
// than left open to anonymous triggering. It writes VOAC rows only — the
// read-mostly boundary is unchanged.

import { NextRequest, NextResponse } from "next/server";
import { cronSecretConfigured, isCronAuthorized } from "@/lib/auth/cronAuth";
import { log } from "@/lib/utils/logger";
import { reportError } from "@/lib/observability/report";
// The plan is built by a thin DB twin (schedule.live.ts) over a pure core
// (schedule.ts), so the exact same code path can be dry-run by
// scripts/verify/voac-cron-check.ts without executing anything.
import { buildFirePlan } from "@/lib/voac/schedule.live";
import { runVoac } from "@/lib/voac/driver.live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hard ceiling per fire. Raise deliberately, never "just for a test". */
const MAX_RUNS_PER_FIRE = 12;

export async function GET(req: NextRequest) {
  if (!cronSecretConfigured()) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();

  try {
    const plan = await buildFirePlan({ maxRuns: MAX_RUNS_PER_FIRE });

    if (plan.rosterCount === 0) {
      return NextResponse.json({
        ok: true, startedAt, considered: 0, started: 0, skipped: 0,
        note: "No enabled rosters. A roster is created lazily on a company's first run.",
      });
    }

    // Sequential, not parallel. A cron fire has no user waiting on it, and
    // serial execution keeps the per-tenant budget check meaningful — twelve
    // concurrent runs would all read the budget before any of them consumed it.
    const results: Array<{ roleId: string; status: string; proposals: number }> = [];
    for (const d of plan.due) {
      try {
        const r = await runVoac({
          tenantId: d.tenantId,
          companyId: d.companyId,
          roleId: d.roleId,
          objective: "Scheduled review",
          sector: d.sector,
        });
        results.push({ roleId: d.roleId, status: r.status, proposals: r.proposalsCreated });
      } catch (e) {
        // One bad role must not abort the fire — the remaining tenants still
        // deserve their run.
        reportError("voac.cron: run failed", e, { tenantId: d.tenantId, entityId: d.roleId });
        results.push({ roleId: d.roleId, status: "ERROR", proposals: 0 });
      }
    }

    const byStatus: Record<string, number> = {};
    for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    log.info("voac.cron: fire complete", {
      considered: plan.considered,
      started: plan.due.length,
      skipped: plan.skipped.length,
    });

    return NextResponse.json({
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      considered: plan.considered,
      started: plan.due.length,
      skipped: plan.skipped.length,
      cap: MAX_RUNS_PER_FIRE,
      byStatus,
      // First few reasons only — enough to diagnose "why did nothing run?"
      // without turning the cron log into a wall of text.
      skippedSample: plan.skipped.slice(0, 5),
    });
  } catch (e) {
    reportError("voac.cron: fire failed", e, {});
    return NextResponse.json(
      { ok: false, startedAt, error: "VOAC cron fire failed; see logs." },
      { status: 500 },
    );
  }
}
