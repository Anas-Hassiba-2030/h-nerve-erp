// One-click PITCH seed for production.
//
// Populates a fresh deployment with the FULL demo dataset so no screen is
// empty during a pitch:
//   1. seedOperator()  — companies, hotels (72% occupancy), bookings, farms,
//                        dairy, education, finance, insights, tasks, ESG, plans
//   2. seedDemo()      — ERP back-office: suppliers, customers, products,
//                        warehouses, purchase/sales orders, journal, inventory
//   3. seedPitch()     — the gap surfaces: alert rules, brain insights,
//                        documents, message threads, weekly digests, workflows
//
// DESTRUCTIVE: seedOperator() wipes operator tables first (FK-safe) and
// recreates the default admin (admin@hourani.jo / admin123). That is the
// intended "wipe → load calculated pitch data" flow.
//
// Gated by the SEED_ADMIN_PASSWORD env var (set it in Railway), NOT a session
// — so it works on a fresh deploy before any admin exists. Usage:
//
//   curl -X POST https://<your-app>/api/admin/seed-pitch \
//     -H 'content-type: application/json' \
//     -d '{"secret":"<SEED_ADMIN_PASSWORD>"}'
//
// Re-running is safe: seedDemo/seedPitch upsert or skip-if-present; seedOperator
// re-wipes + re-seeds deterministically.
import { NextRequest, NextResponse } from "next/server";
import { scoped } from "@/lib/utils/logger";
import { timingSafeStringEqual } from "@/lib/auth/cronAuth";

const log = scoped("seed-pitch");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.SEED_ADMIN_PASSWORD;
  if (!secret || secret.startsWith("REPLACE")) {
    return NextResponse.json(
      { error: "SEED_ADMIN_PASSWORD not configured. Set it in the environment first." },
      { status: 500 },
    );
  }
  const body = await req.json().catch(() => ({}));
  if (!timingSafeStringEqual(body.secret, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Safety net: seedOperator() is DESTRUCTIVE (wipes operator tables). If the
  // DB already holds data, refuse unless the caller explicitly opts in with
  // { force: true }. This stops a leaked SEED_ADMIN_PASSWORD (e.g. shown in a
  // screenshot) from wiping a populated production DB — an intentional
  // pitch-reset still works by passing force.
  if (body.force !== true) {
    const { prismaUnscoped } = await import("@/lib/db/db");
    const companies = await prismaUnscoped.company.count().catch(() => 0);
    if (companies > 0) {
      return NextResponse.json(
        {
          error:
            'Database already has data. This endpoint WIPES operator tables. ' +
            'Re-send with { "force": true } to confirm a destructive pitch reseed.',
          companies,
        },
        { status: 409 },
      );
    }
  }

  const started = Date.now();
  const steps: Record<string, string> = {};
  try {
    const { seedOperator } = await import("@/scripts/seed/seed");
    await seedOperator();
    steps.operator = "ok";

    const { seedDemo } = await import("@/scripts/seed/seed-demo");
    await seedDemo();
    steps.erp = "ok";

    const { seedPitch } = await import("@/scripts/seed/seed-pitch");
    await seedPitch();
    steps.gaps = "ok";

    // Report what now exists so the caller can confirm it landed.
    const { prismaUnscoped: prisma } = await import("@/lib/db/db");
    const [companies, hotels, bookings, products, suppliers, transactions, alerts, documents] =
      await Promise.all([
        prisma.company.count(),
        prisma.hotel.count(),
        prisma.booking.count(),
        prisma.product.count(),
        prisma.supplier.count(),
        prisma.transaction.count(),
        prisma.alertRule.count(),
        prisma.document.count(),
      ]);

    return NextResponse.json({
      ok: true,
      ms: Date.now() - started,
      steps,
      counts: { companies, hotels, bookings, products, suppliers, transactions, alerts, documents },
      login: { email: "admin@hourani.jo", password: "admin123" },
    });
  } catch (err: any) {
    log.error("seed failed", { err: err?.message ?? String(err) });
    return NextResponse.json(
      { error: "Seed failed", steps },
      { status: 500 },
    );
  }
}
