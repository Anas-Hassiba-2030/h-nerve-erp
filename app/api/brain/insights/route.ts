// GET /api/brain/insights?tenantId=X
//
// CROSS-TENANT INTENT: external read endpoint. Callers (cron, the
// n8n workflow, ops dashboards) pass `tenantId` explicitly in the
// query string. Using `prismaUnscoped` is deliberate — the route
// runs outside a session/cookie context, so the workspaceScope
// middleware can't know which tenant to filter by. The query-string
// param is the API contract.
//
// Phase 10. Returns ACTIVE BrainInsight rows (resolvedAt IS NULL AND
// dismissedAt IS NULL) as JSON, newest-first. tenantId is optional —
// omitted = all tenants. Read-only, no secrets; ungated like the
// other read endpoints.

import { NextRequest, NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId")?.trim() || null;
  const insights = await prismaUnscoped.brainInsight.findMany({
    where: {
      resolvedAt: null,
      dismissedAt: null,
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ count: insights.length, insights });
}
