// scripts/test-isolation.ts
//
// Live multi-tenant isolation test against the seeded prod data.
// Reproduces the actual call shapes used by:
//   - app/(app)/admin/products/page.tsx          (prismaUnscoped.product.findMany)
//   - app/(app)/admin/suppliers/page.tsx         (prismaUnscoped.supplier.findMany)
//   - app/(app)/admin/sales-orders/page.tsx      (prismaUnscoped.salesOrder.findMany)
//   - app/(app)/admin/purchase-orders/page.tsx   (prismaUnscoped.purchaseOrder.findMany)
//   - app/(app)/admin/movements/page.tsx         (prismaUnscoped.inventoryMovement.findMany)
//   - app/(app)/hotels/page.tsx                  (prisma.booking.findMany — no workspace cookie)
//   - app/(app)/dairy/...                        (prisma.dairyBatch — companyId-scoped client)
//
// We instantiate the raw PrismaClient. We deliberately do NOT mint a
// session cookie because the actual queries above do not consult the
// session — they just hit Prisma directly. The session only exists for
// the route gate; once you're past the gate, your "tenant identity" is
// not threaded into the where-clause.

import { PrismaClient } from "@prisma/client";
import { applyWorkspaceScope } from "@/lib/tenancy/workspaceScope";

const prisma = new PrismaClient();

// Phase F2 — build a workspace-scoped client without any request
// context so we can prove the middleware filters even without going
// through Next's cookie pipeline.
function makeScopedClient(workspaceId: string | null) {
  const c = new PrismaClient();
  c.$use((params, next) => applyWorkspaceScope(params as any, next, workspaceId));
  return c;
}

// Phase F3 — tenant-slug-scoped client (the other half of the middleware).
function makeTenantScopedClient(tenantSlug: string | null) {
  const c = new PrismaClient();
  c.$use((params, next) => applyWorkspaceScope(params as any, next, null, tenantSlug));
  return c;
}

function row(label: string, all: number, perTenant: Record<string, number>) {
  const breakdown = Object.entries(perTenant)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  console.log(`  ${label.padEnd(34)} TOTAL=${all}  ·  ${breakdown}`);
}

function groupCountBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

async function main() {
  console.log("\n=== Multi-tenant isolation — live read shapes ===\n");

  // ---- Repro: /admin/products page ----
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, sku: true, tenantId: true },
  });
  row("prismaUnscoped.product.findMany", products.length, groupCountBy(products, (p) => p.tenantId));

  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, tenantId: true },
  });
  row("prismaUnscoped.supplier.findMany", suppliers.length, groupCountBy(suppliers, (s) => s.tenantId));

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, tenantId: true },
  });
  row("prismaUnscoped.customer.findMany", customers.length, groupCountBy(customers, (c) => c.tenantId));

  const warehouses = await prisma.warehouse.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, tenantId: true },
  });
  row("prismaUnscoped.warehouse.findMany", warehouses.length, groupCountBy(warehouses, (w) => w.tenantId));

  const pos = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null },
    select: { id: true, poNumber: true, tenantId: true },
  });
  row("prismaUnscoped.purchaseOrder.findMany", pos.length, groupCountBy(pos, (p) => p.tenantId));

  const sos = await prisma.salesOrder.findMany({
    where: { deletedAt: null },
    select: { id: true, soNumber: true, tenantId: true },
  });
  row("prismaUnscoped.salesOrder.findMany", sos.length, groupCountBy(sos, (s) => s.tenantId));

  const moves = await prisma.inventoryMovement.findMany({
    where: { deletedAt: null },
    select: { id: true, tenantId: true },
  });
  row("prismaUnscoped.inventoryMovement.findMany", moves.length, groupCountBy(moves, (m) => m.tenantId));

  const jes = await prisma.journalEntry.findMany({
    select: { id: true, reference: true, tenantId: true },
  });
  row("prismaUnscoped.journalEntry.findMany", jes.length, groupCountBy(jes, (j) => j.tenantId));

  // ---- Booking — no tenantId column; isolation depends on parent Hotel.companyId ----
  const bookings = await prisma.booking.findMany({
    select: { id: true, reference: true, hotel: { select: { company: { select: { code: true } } } } },
  });
  const bookingPerCompany = groupCountBy(bookings, (b) => b.hotel.company.code);
  row("prisma.booking.findMany  (no cookie set)", bookings.length, bookingPerCompany);

  console.log(
    `\n  Note: prisma.booking.findMany is the workspace-SCOPED client,\n  but Booking is NOT in lib/workspaceScope.ts SCOPED_MODELS.\n  Even when an h_nerve_workspace cookie is set to a single Company,\n  bookings from sibling hotels remain visible.\n`,
  );

  await prisma.$disconnect();

  // ---- F2 plumbing proof: middleware scoping by Company.id ----
  console.log("\n--- F2 simulated middleware (Hotel scoping by Company.id) ---");
  const allCompanies = await new PrismaClient().company.findMany({
    select: { id: true, code: true },
  });
  for (const co of allCompanies) {
    const scoped = makeScopedClient(co.id);
    const hotels = await scoped.hotel.findMany({ select: { id: true, name: true } });
    console.log(`  workspace=${co.code.padEnd(8)} → hotel.findMany returns ${hotels.length}`);
    await scoped.$disconnect();
  }

  // ---- F3 plumbing proof: middleware scoping by tenantSlug ----
  console.log("\n--- F3 simulated middleware (Product scoping by tenantSlug) ---");
  const tenantSlugs = ["maha-dairy", "hourani-hotels", "loran-agri", "tank-incubator"];
  for (const slug of tenantSlugs) {
    const scoped = makeTenantScopedClient(slug);
    const ps = await scoped.product.findMany({ where: { deletedAt: null } });
    const sups = await scoped.supplier.findMany({ where: { deletedAt: null } });
    const sos = await scoped.salesOrder.findMany({ where: { deletedAt: null } });
    console.log(`  tenantSlug=${slug.padEnd(15)} → product=${ps.length}  supplier=${sups.length}  salesOrder=${sos.length}`);
    await scoped.$disconnect();
  }
  const adminClient = makeTenantScopedClient(null);
  const adminProducts = await adminClient.product.findMany({ where: { deletedAt: null } });
  console.log(`  tenantSlug=null            → product=${adminProducts.length}   (ADMIN cross-tenant)`);
  await adminClient.$disconnect();

  // ---- F4 plumbing proof: Booking + Crop scoping by tenantSlug ----
  console.log("\n--- F4 simulated middleware (Booking + Crop scoping by tenantSlug) ---");
  for (const slug of tenantSlugs) {
    const scoped = makeTenantScopedClient(slug);
    const bks = await scoped.booking.findMany();
    const cps = await scoped.crop.findMany();
    console.log(`  tenantSlug=${slug.padEnd(15)} → booking=${bks.length}  crop=${cps.length}`);
    await scoped.$disconnect();
  }
  const adminClient2 = makeTenantScopedClient(null);
  const adminB = await adminClient2.booking.findMany();
  const adminC = await adminClient2.crop.findMany();
  console.log(`  tenantSlug=null            → booking=${adminB.length}  crop=${adminC.length}  (ADMIN cross-tenant)`);
  await adminClient2.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
