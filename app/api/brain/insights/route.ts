// GET /api/brain/insights?tenantId=X
//
// Phase 10. Returns ACTIVE BrainInsight rows (resolvedAt IS NULL AND
// dismissedAt IS NULL) as JSON, newest-first. tenantId is optional —
// omitted = all tenants (the single-tenant exec dashboard uses the
// global active count). Read-only, no secrets; ungated like the other
// read endpoints. prismaUnscoped: BrainInsight has no companyId.

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
