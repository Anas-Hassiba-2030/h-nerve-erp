// GET /api/brain/cron  — scheduled Brain refresh.
//
// Phase 10 deferred item: the spec called for the rule engine to run on a
// schedule, not only on demand. A scheduler hits this route with
// `Authorization: Bearer $CRON_SECRET`; we reject anything without it, so the
// endpoint can't be publicly triggered (it writes BrainInsight rows, though
// still within the Brain's read-only-on-operational-data boundary — see
// lib/intelligence/engine.ts).
//
// NOTE: Railway has no built-in cron, so this only fires when a scheduler is
// wired up (a Railway cron service or external cron hitting this URL with the
// bearer header). See docs/DEPLOYMENT.md § "Scheduled Brain refresh".
//
// On-demand refresh still exists (the /admin/brain "Run analysis" button) and
// is the fallback when no scheduler is configured.

import { NextRequest, NextResponse } from "next/server";
import { runBrainAnalysis } from "@/lib/intelligence/engine";
// CROSS-TENANT INTENT: cron iterates every ACTIVE tenant so each gets
// its own insight refresh. prismaUnscoped reaches the Tenant table
// regardless of the (non-existent) cookie context on a cron invocation.
import { prismaUnscoped } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // Phase F-Polish — iterate every ACTIVE tenant. Each gets its own
    // pass through the four analyzers. Aggregate counts in the response
    // so the cron log is one line per fire.
    const tenants = await prismaUnscoped.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true },
    });
    const perTenant: Array<{ tenantId: string; generated: number; updated: number; unchanged: number }> = [];
    let totGen = 0, totUpd = 0, totUnc = 0;
    for (const t of tenants) {
      const r = await runBrainAnalysis(t.slug);
      perTenant.push({ tenantId: t.slug, generated: r.generated, updated: r.updated, unchanged: r.unchanged });
      totGen += r.generated; totUpd += r.updated; totUnc += r.unchanged;
    }
    return NextResponse.json({
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      tenants: perTenant,
      totals: { generated: totGen, updated: totUpd, unchanged: totUnc },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "analysis failed" },
      { status: 500 },
    );
  }
}
