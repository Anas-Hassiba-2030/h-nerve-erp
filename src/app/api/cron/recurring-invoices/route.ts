// GET /api/cron/recurring-invoices — scheduled recurring-invoice run.
//
// docs/HOURANI-ERP-GAPS.md #11 ⚪. Same precedent as /api/brain/cron: a
// scheduler hits this route with `Authorization: Bearer $CRON_SECRET`;
// this repo has no wrangler cron trigger wired, so it only fires when an
// external scheduler is configured to hit this URL on a schedule (daily
// is enough — dueTemplates is date-only, not time-of-day sensitive).
//
// On-demand fallback: the "Run due now" button on /admin/recurring-invoices.

import { NextRequest, NextResponse } from "next/server";
// CROSS-TENANT INTENT: cron iterates every ACTIVE tenant so each tenant's
// due templates post, regardless of the (non-existent) cookie context on
// a cron invocation.
import { prismaUnscoped } from "@/lib/db/db";
import { runDueRecurringInvoices } from "@/lib/finance/recurring";
import { cronSecretConfigured, isCronAuthorized } from "@/lib/auth/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronSecretConfigured()) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  try {
    const tenants = await prismaUnscoped.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true },
      take: 200,
    });
    const perTenant: Array<{ tenantId: string; posted: number }> = [];
    let totalPosted = 0;
    for (const t of tenants) {
      const result = await prismaUnscoped.$transaction((tx) =>
        runDueRecurringInvoices(tx as unknown as typeof prismaUnscoped, { tenantId: t.slug }),
      );
      perTenant.push({ tenantId: t.slug, posted: result.posted });
      totalPosted += result.posted;
    }
    return NextResponse.json({
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      tenants: perTenant,
      totalPosted,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "recurring invoice run failed" },
      { status: 500 },
    );
  }
}
