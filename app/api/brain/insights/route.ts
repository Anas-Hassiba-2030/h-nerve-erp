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
// dismissedAt IS NULL) as JSON, newest-first.
//
// AUTH (hardened): BrainInsight rows are per-tenant operational
// intelligence and must never be anonymously readable. Two callers are
// allowed — a logged-in operator (session cookie, pinned to their own
// tenant) or a machine bearing the CRON_SECRET bearer token (which honors
// the explicit ?tenantId= contract). Anything else gets 401.

import { NextRequest, NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Close the anonymous cross-tenant leak: require a session OR the cron token.
  const user = await getCurrentUser();
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  const machineOk = !!secret && auth === `Bearer ${secret}`;
  if (!user && !machineOk) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // A non-admin operator is pinned to their OWN tenant — the query-string
  // param cannot widen that. Admins and authenticated machines may target a
  // specific tenant via ?tenantId=, or omit it for the whole group.
  const qsTenant = req.nextUrl.searchParams.get("tenantId")?.trim() || null;
  const tenantId =
    user && user.role !== "ADMIN" ? (user.tenantSlug ?? null) : qsTenant;

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
