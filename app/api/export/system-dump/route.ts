// /api/export/system-dump — Phase 8 disaster-recovery snapshot.
// FULL database dump as a single JSON file. ADMIN-ONLY (per-resource
// CSV at /api/export/[type] stays as-is for any user; a whole-DB dump
// is far more sensitive and includes auth rows). Dependency-free.
// Fail-soft: a failing table records an error and the dump still
// completes, so one bad model can't sink the whole backup.
//
// NOTE: User rows are included for restore, but the bcrypt passwordHash
// is STRIPPED before serialization — auth secrets must not travel in an
// HTTP response body. A restored user is re-credentialed out-of-band.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const CAP = 20000; // per-table row cap — guards a runaway dump.

// Each entry: [key, () => findMany]. Wrapped in try/catch at call time
// so an unknown/renamed model degrades to an error note, never a 500.
const TABLES: Array<[string, () => Promise<unknown[]>]> = [
  // SECURITY: strip the bcrypt passwordHash — a backup must never ship
  // password hashes over an HTTP response body (see export audit).
  ["user", async () => (await prisma.user.findMany({ take: CAP })).map(({ passwordHash, ...safe }) => { void passwordHash; return safe; })],
  ["tenant", () => prisma.tenant.findMany({ take: CAP })],
  ["company", () => prisma.company.findMany({ take: CAP })],
  ["hotel", () => prisma.hotel.findMany({ take: CAP })],
  ["booking", () => prisma.booking.findMany({ take: CAP })],
  ["dairyBatch", () => prisma.dairyBatch.findMany({ take: CAP })],
  ["farm", () => prisma.farm.findMany({ take: CAP })],
  ["crop", () => prisma.crop.findMany({ take: CAP })],
  ["transaction", () => prisma.transaction.findMany({ take: CAP })],
  ["supplyForecast", () => prisma.supplyForecast.findMany({ take: CAP })],
  ["aIInsight", () => prisma.aIInsight.findMany({ take: CAP })],
  ["product", () => prisma.product.findMany({ take: CAP })],
  ["warehouse", () => prisma.warehouse.findMany({ take: CAP })],
  ["inventoryMovement", () => prisma.inventoryMovement.findMany({ take: CAP })],
  ["purchaseOrder", () => prisma.purchaseOrder.findMany({ take: CAP })],
  ["salesOrder", () => prisma.salesOrder.findMany({ take: CAP })],
  ["supplier", () => prisma.supplier.findMany({ take: CAP })],
  ["customer", () => prisma.customer.findMany({ take: CAP })],
  ["journalEntry", () => prisma.journalEntry.findMany({ take: CAP })],
  ["journalLine", () => prisma.journalLine.findMany({ take: CAP })],
  ["ledgerAccount", () => prisma.ledgerAccount.findMany({ take: CAP })],
  ["brainInsight", () => prisma.brainInsight.findMany({ take: CAP })],
  ["task", () => prisma.task.findMany({ take: CAP })],
  ["futureProject", () => prisma.futureProject.findMany({ take: CAP })],
  ["sustainabilityScore", () => prisma.sustainabilityScore.findMany({ take: CAP })],
  ["marketStock", () => prisma.marketStock.findMany({ take: CAP })],
  ["activityLog", () => prisma.activityLog.findMany({ take: CAP })],
];

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "ADMIN")
    return new NextResponse("Forbidden — ADMIN only", { status: 403 });

  const tables: Record<string, unknown> = {};
  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (const [key, fetch] of TABLES) {
    try {
      const rows = await fetch();
      tables[key] = rows;
      counts[key] = rows.length;
    } catch (e) {
      errors[key] = e instanceof Error ? e.message : String(e);
    }
  }

  const dump = {
    meta: {
      product: "H-Nerve ERP",
      kind: "full-system-dump",
      schemaNote: "Disaster-recovery snapshot. Includes auth rows (bcrypt hashes).",
      exportedAt: new Date().toISOString(),
      exportedBy: { id: user.id, email: user.email },
      counts,
      errors,
    },
    tables,
  };

  const body = JSON.stringify(dump, null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="h-nerve-system-dump-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
