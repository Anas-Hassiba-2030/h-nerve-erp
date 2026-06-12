// GET /api/empire/summary — Phase 19 holding-company god-view data.
//
// Returns the consolidated cross-tenant EmpireSummary (revenue rollup, four
// sector pulses, council feed, causal drivers, brain activity). The aggregator
// reads through prismaUnscoped BY DESIGN — this is the one surface that spans
// every tenant — so the route is gated to EXECUTIVE+ (which includes ADMIN).
// CRON_SECRET also unlocks it for headless snapshotting.
//
// The /empire page renders the same data server-side via getEmpireSummary()
// directly (no self-fetch); this route exists for client components and any
// external/programmatic consumer, per the Phase 19 spec.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { isCronAuthorized } from "@/lib/auth/cronAuth";
import { getEmpireSummary } from "@/lib/empire/summary";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const viaCron = isCronAuthorized(req.headers.get("authorization"));

  if (!viaCron) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!hasRole(user, "EXECUTIVE")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  try {
    const summary = await getEmpireSummary();
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error("[empire/summary] aggregation failed:", e);
    return NextResponse.json({ error: "AGGREGATION_FAILED" }, { status: 500 });
  }
}
