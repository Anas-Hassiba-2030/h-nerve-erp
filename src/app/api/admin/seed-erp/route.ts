// Admin-only: populate the ERP front-office operator surfaces on production.
//
// POST /api/admin/seed-erp
// Requires: ADMIN session
// Safe to re-run — prerequisites upsert, documents are gated per tenant so a
// second call is a no-op. Seeds THROUGH the core finance/pos/hr functions
// (see lib/genesis/seedErp.ts), so a green response also proves every ERP
// create path works end-to-end against D1.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { scoped } from "@/lib/utils/logger";

const log = scoped("seed-erp");

export const dynamic = "force-dynamic";
export const maxDuration = 60; // core-fn document creation is many D1 statements

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "ADMIN required" }, { status: 403 });
    }

    // CROSS-TENANT INTENT: the seed writes a specific tenant's ERP demo data
    // (default "hourani-hotels") regardless of the caller's active workspace,
    // so it must bypass the request-scoped tenant filter.
    const { prismaUnscoped } = await import("@/lib/db/db");
    const { seedErp } = await import("@/lib/genesis/seedErp");
    const result = await seedErp(prismaUnscoped);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error("erp seed failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 },
    );
  }
}
