// scripts/test-ns1-flow.ts
//
// Phase NS-1 — end-to-end proof of the cross-tenant supply-chain →
// purchase-order bridge against the live DB.
//
//   npx tsx scripts/test-ns1-flow.ts
//
// approveForecast itself is a "use server" action that calls
// requireRole()/cookies() and can't run outside a request scope, so this
// script exercises its request-agnostic core, approveForecastWithBridge
// (lib/supply/bridge.ts) — the same atomic transaction the action invokes.
// Every DB invariant the action produces is asserted.
//
// Leaves the created forecast + PO in place (per spec) so the demo path
// is warm. Re-runnable: reuses the same DEMO forecast signal.

import { PrismaClient } from "@prisma/client";
import { approveForecastWithBridge } from "../lib/supply/bridge";

const prisma = new PrismaClient();

let failures = 0;
function check(label: string, cond: boolean, detail?: string) {
  console.log(`  ${cond ? "✓" : "✗"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!cond) failures++;
}

async function main() {
  const hotels = await prisma.company.findFirst({ where: { sector: "HOSPITALITY" } });
  const maha = await prisma.company.findFirst({ where: { sector: "DAIRY" } });
  if (!hotels || !maha) throw new Error("Hotels or Maha company not found — seed first");
  console.log(`\nHotels: ${hotels.name} (${hotels.code})`);
  console.log(`Maha:   ${maha.name} (${maha.code})`);

  const anyUser = await prisma.user.findFirst({ select: { id: true } });

  // Find-or-reset a DRAFT forecast Hotels → Maha "Fresh Milk" 2400 L.
  const SIGNAL = "NS1-TEST-FRESH-MILK";
  let forecast = await prisma.supplyForecast.findFirst({ where: { signal: SIGNAL } });
  if (forecast) {
    await prisma.purchaseOrder.deleteMany({ where: { sourceForecastId: forecast.id } });
    forecast = await prisma.supplyForecast.update({
      where: { id: forecast.id },
      data: { status: "DRAFT", linkedPurchaseOrderId: null },
    });
  } else {
    forecast = await prisma.supplyForecast.create({
      data: {
        sourceCompanyId: hotels.id,
        targetCompanyId: maha.id,
        category: "DAIRY",
        productLabel: "حليب طازج",
        unit: "لتر",
        predictedDemand: 2400,
        confidence: 0.82,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        signal: SIGNAL,
        status: "DRAFT",
        generatedById: anyUser?.id ?? null,
      },
    });
  }
  console.log(`\nForecast: ${forecast.productLabel} ${forecast.predictedDemand}${forecast.unit} [${forecast.id}]`);

  const sup = await prisma.supplier.findFirst({
    where: { tenantId: "hourani-hotels", linkedTenantId: "maha-dairy", deletedAt: null },
    select: { id: true, name: true },
  });
  check("Hotels supplier linked to maha-dairy exists", !!sup, sup?.name);

  // --- Exercise the real action core (atomic: flips status + drafts PO) ---
  const bridge = await approveForecastWithBridge(forecast.id);
  console.log(`\nBridge result: ${bridge.approved ? (bridge.po ? `PO ${bridge.po.poNumber} → ${bridge.po.supplierName}` : "approved, no PO") : "no-op"}`);

  // --- Verify the chain ---
  const after = await prisma.supplyForecast.findUnique({ where: { id: forecast.id } });
  check("Forecast.status === APPROVED", after?.status === "APPROVED", after?.status);
  check("Forecast.linkedPurchaseOrderId non-null", !!after?.linkedPurchaseOrderId, after?.linkedPurchaseOrderId ?? "null");

  const po = after?.linkedPurchaseOrderId
    ? await prisma.purchaseOrder.findUnique({ where: { id: after.linkedPurchaseOrderId } })
    : null;
  check("PurchaseOrder exists at linkedPurchaseOrderId", !!po, po?.poNumber);
  check("PO.sourceForecastId === forecast.id", po?.sourceForecastId === forecast.id);
  check("PO.tenantId === hourani-hotels (buyer)", po?.tenantId === "hourani-hotels", po?.tenantId);

  const poSupplier = po ? await prisma.supplier.findUnique({ where: { id: po.supplierId } }) : null;
  check("PO.supplier is the Hotels→Maha supplier", poSupplier?.linkedTenantId === "maha-dairy", poSupplier?.name);

  // Idempotency: re-running on the now-APPROVED forecast must NOT create a
  // second PO (status no longer DRAFT → no-op).
  const second = await approveForecastWithBridge(forecast.id);
  check("Bridge is idempotent (re-run is no-op)", second.approved === false);

  // Incoming intent query on Maha.
  const incoming = await prisma.purchaseOrder.findMany({
    where: { status: "DRAFT", deletedAt: null, supplierRef: { linkedTenantId: "maha-dairy" } },
    select: { id: true },
  });
  check("New PO appears in Maha incoming intent", incoming.some((p) => p.id === po?.id), `${incoming.length} total`);

  console.log("\n── Chain summary ─────────────────────────────");
  console.log(`  ${hotels.name}  →  forecast ${forecast.productLabel} ${forecast.predictedDemand}${forecast.unit}`);
  console.log(`  approve → PO ${po?.poNumber} (status ${po?.status}, tenant ${po?.tenantId})`);
  console.log(`  supplier ${poSupplier?.name} → linkedTenantId ${poSupplier?.linkedTenantId}`);
  console.log(`  visible on ${maha.name} incoming intent: ${incoming.some((p) => p.id === po?.id) ? "YES" : "NO"}`);
  console.log("──────────────────────────────────────────────");

  console.log(`\n${failures === 0 ? "ALL PASS ✓" : `${failures} FAILURE(S) ✗`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
