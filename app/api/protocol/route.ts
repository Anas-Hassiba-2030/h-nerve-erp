// GET /api/protocol — Phase 20 Living Protocol.
//
// Returns the current tenant's constitution clauses, ordered. The scoped
// `prisma` client auto-filters by the active tenant (ProtocolClause is in
// TENANT_SCOPED_MODELS); with no tenant cookie it returns every clause
// (admin/group view). Any signed-in user may read.
//
// Read logic + tolerant seed fallback live in lib/protocol/load.ts, shared
// with the /protocol page so the two can never drift.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProtocolClauses } from "@/lib/protocol/load";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { clauses, fallback } = await getProtocolClauses();
  return NextResponse.json(
    { clauses, fallback },
    { headers: { "Cache-Control": "no-store" } },
  );
}
