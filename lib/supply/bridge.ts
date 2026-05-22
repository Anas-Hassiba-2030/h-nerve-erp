// lib/supply/bridge.ts
//
// Phase NS-1 — the cross-tenant supply-chain → purchase-order bridge,
// extracted from approveForecast so it is request-context-free and
// directly unit-testable (no session, no cookie, no Next runtime).
//
// Two coordinate systems meet here. A SupplyForecast lives in
// Company-space (sourceCompanyId / targetCompanyId). PurchaseOrder /
// Supplier live in Tenant-slug-space (the opaque `tenantId` column =
// Tenant.slug). The bridge crosses both via COMPANY_CODE_TO_TENANT_SLUG.
//
// Because the drafted PO belongs on the BUYER's tenant — which is NOT
// necessarily the approver's active tenant — every write goes through
// prismaUnscoped with an explicit tenantId. This is a legitimate
// cross-tenant write per docs/ISOLATION.md (the brain/bridge proposes;
// it does not leak reads to the wrong operator).

import { prismaUnscoped } from "@/lib/db";
import { COMPANY_CODE_TO_TENANT_SLUG } from "@/lib/tenancy";
import { generateNumber } from "@/lib/utils";

export type BridgeResult = { poNumber: string; supplierName: string } | null;

/**
 * Draft a line-less PurchaseOrder on the buyer's tenant for an approved
 * forecast, and atomically back-link it on both sides. Returns the PO
 * number + supplier name when a PO was created, or null when no bridge
 * applies (external buyer/target, or already linked).
 *
 * Idempotent: if the forecast already has linkedPurchaseOrderId, no-op.
 */
export async function draftPurchaseOrderFromForecast(forecastId: string): Promise<BridgeResult> {
  // CROSS-TENANT INTENT: read the forecast + its two companies unscoped
  // so resolution works regardless of any active tenant context.
  const f = await prismaUnscoped.supplyForecast.findUnique({ where: { id: forecastId } });
  if (!f) return null;
  if (f.linkedPurchaseOrderId) return null; // already bridged — idempotent

  const [buyerCompany, targetCompany] = await Promise.all([
    prismaUnscoped.company.findUnique({
      where: { id: f.sourceCompanyId },
      select: { code: true },
    }),
    prismaUnscoped.company.findUnique({
      where: { id: f.targetCompanyId },
      select: { code: true, name: true },
    }),
  ]);
  const buyerSlug = buyerCompany ? COMPANY_CODE_TO_TENANT_SLUG[buyerCompany.code] : null;
  const targetSlug = targetCompany ? COMPANY_CODE_TO_TENANT_SLUG[targetCompany.code] : null;
  // Either party is external (not an in-system tenant) → no PO to draft.
  if (!buyerSlug || !targetSlug) return null;

  // CROSS-TENANT INTENT: locate (or auto-create) the Supplier on the
  // BUYER's tenant that represents the target tenant.
  let supplier = await prismaUnscoped.supplier.findFirst({
    where: { tenantId: buyerSlug, linkedTenantId: targetSlug, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!supplier) {
    // Auto-upsert fallback (option a). Human marker lives in `notes`;
    // linkedTenantId IS NOT NULL is the machine marker the Incoming
    // Purchase Intent panel filters on. Name = target company name so it
    // lines up with any pre-seeded row on the (tenantId, name) unique key
    // rather than duplicating it.
    const supName = targetCompany?.name ?? targetSlug;
    supplier = await prismaUnscoped.supplier.upsert({
      where: { tenantId_name: { tenantId: buyerSlug, name: supName } },
      create: {
        tenantId: buyerSlug,
        name: supName,
        linkedTenantId: targetSlug,
        notes: `Cross-tenant link → ${targetSlug} (NS-1 auto-created on approval)`,
      },
      update: { linkedTenantId: targetSlug },
      select: { id: true, name: true },
    });
  }

  const poNumber = generateNumber("PO");
  // Atomic: create the line-less bridge PO + back-link the forecast.
  // Never one without the other (the two link columns must agree).
  await prismaUnscoped.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        tenantId: buyerSlug,
        poNumber,
        supplierId: supplier!.id,
        status: "DRAFT",
        sourceForecastId: f.id,
        expectedAt: f.periodEnd,
        note: `${f.productLabel} — ${f.predictedDemand} ${f.unit}`,
      },
    });
    await tx.supplyForecast.update({
      where: { id: f.id },
      data: { linkedPurchaseOrderId: po.id },
    });
  });

  return { poNumber, supplierName: supplier.name };
}
