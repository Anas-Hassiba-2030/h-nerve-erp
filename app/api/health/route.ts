// GET /api/health
//
// Phase 11. Liveness + DB-reachability probe for Vercel and uptime
// monitors. Runs a trivial `SELECT 1` against Postgres (Neon).
//   → 200 { status: "ok", db: "connected", ts }      DB reachable
//   → 503 { status: "error", db: "unreachable" }     DB down/unreachable
// Read-only, no auth, no secrets — safe to poll publicly. prismaUnscoped:
// no workspace context on an infra probe (raw query bypasses $use anyway).

import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prismaUnscoped.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      ts: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[health] DB unreachable:", e);
    return NextResponse.json(
      { status: "error", db: "unreachable", ts: new Date().toISOString() },
      { status: 503 },
    );
  }
}
