// GET /api/brain/cron  — scheduled Brain refresh.
//
// Phase 10 deferred item: the spec called for the rule engine to run on
// a 15-minute schedule, not only on demand. Vercel Cron hits this route
// (see `crons` in vercel.json). Vercel automatically attaches
// `Authorization: Bearer $CRON_SECRET` to scheduled invocations when the
// CRON_SECRET env var is set, so we reject anything without it — this
// endpoint must not be publicly triggerable (it writes BrainInsight
// rows, though still within the Brain's read-only-on-operational-data
// boundary — see lib/intelligence/engine.ts).
//
// On-demand refresh still exists (the /admin/brain "Run analysis"
// button); this is the unattended path. If the Vercel plan clamps cron
// frequency, the manual button remains the fallback.

import { NextRequest, NextResponse } from "next/server";
import { runBrainAnalysis } from "@/lib/intelligence/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Single live tenant today — matches the /admin/brain action default.
// When real white-label tenants go ACTIVE, iterate the Tenant table here.
const DEFAULT_TENANT = "hourani-hotels";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Fail closed: without a configured secret the endpoint is disabled
    // rather than left open to anonymous triggering.
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  try {
    const result = await runBrainAnalysis(DEFAULT_TENANT);
    return NextResponse.json({
      ok: true,
      tenantId: DEFAULT_TENANT,
      startedAt,
      finishedAt: new Date().toISOString(),
      generated: result.generated,
      updated: result.updated,
      unchanged: result.unchanged,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "analysis failed" },
      { status: 500 },
    );
  }
}
