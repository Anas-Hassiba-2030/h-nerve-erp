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
// cross-tenant write per docs/architecture/ISOLATION.md (the brain/bridge proposes;
// it does not leak reads to the wrong operator).
//
// ATOMICITY (review fix): the DRAFT→APPROVED flip, the PO insert, and the
// forecast back-link all run inside ONE prismaUnscoped.$transaction. The
// DRAFT precondition is re-checked INSIDE the transaction, so two
// concurrent approvals can't both proceed; and PurchaseOrder.sourceForecastId
// is @unique, so a racing second insert throws P2002 — caught here and
// treated as the idempotent no-op the guard intends. Nothing is ever left
// half-applied (no APPROVED-without-PO, no PO-without-back-link).

import { Prisma } from "@prisma/client";
import { prismaUnscoped } from "@/lib/db/db";
import { COMPANY_CODE_TO_TENANT_SLUG } from "@/lib/tenancy/tenancy";
import { generateNumber } from "@/lib/utils/utils";

export type BridgeResult =
  // forecast missing or no longer DRAFT (idempotent no-op / concurrent loser)
  | { approved: false }
  // status flipped to APPROVED; external/self party → no PO drafted
  | { approved: true; po: null }
  // status flipped + a cross-tenant PO drafted on the buyer's tenant
  | { approved: true; po: { poNumber: string; supplierName: string } };

/**
 * Approve a DRAFT SupplyForecast and, when both its companies map to
 * in-system tenants, draft a line-less PurchaseOrder on the BUYER's tenant
 * and back-link it — all atomically.
 *
 * Idempotent + concurrency-safe: re-checks DRAFT inside the transaction and
 * swallows the P2002 a racing duplicate would raise (returns {approved:false}).
 */
export async function approveForecastWithBridge(forecastId: string): Promise<BridgeResult> {
  try {
    // CROSS-TENANT INTENT: the whole operation runs unscoped because the PO
    // belongs on the buyer's tenant, not the approver's active one.
    return await prismaUnscoped.$transaction(async (tx) => {
      const f = await tx.supplyForecast.findUnique({ where: { id: forecastId } });
      // Re-check DRAFT inside the tx so concurrent approvals can't both win.
      if (!f || f.status !== "DRAFT") return { approved: false };

      const [buyerCompany, targetCompany] = await Promise.all([
        tx.company.findUnique({ where: { id: f.sourceCompanyId }, select: { code: true } }),
        tx.company.findUnique({ where: { id: f.targetCompanyId }, select: { code: true, name: true } }),
      ]);
      const buyerSlug = buyerCompany ? COMPANY_CODE_TO_TENANT_SLUG[buyerCompany.code] : null;
      const targetSlug = targetCompany ? COMPANY_CODE_TO_TENANT_SLUG[targetCompany.code] : null;

      // External party (slug not in the map) or self-referential forecast
      // (buyer === target) → just flip status, no PO to draft.
      if (!buyerSlug || !targetSlug || buyerSlug === targetSlug) {
        await tx.supplyForecast.update({ where: { id: f.id }, data: { status: "APPROVED" } });
        return { approved: true, po: null };
      }

      // Locate the Supplier on the BUYER's tenant that represents the target.
      let supplier = await tx.supplier.findFirst({
        where: { tenantId: buyerSlug, linkedTenantId: targetSlug, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!supplier) {
        const supName = targetCompany?.name ?? targetSlug;
        // Don't blindly upsert on (tenantId, name): an operator may already
        // have a real, differently-linked supplier by that name. Only adopt
        // a row whose linkedTenantId is null (or already ours); never hijack.
        const existing = await tx.supplier.findFirst({
          where: { tenantId: buyerSlug, name: supName },
          select: { id: true, name: true, linkedTenantId: true },
        });
        if (existing && existing.linkedTenantId && existing.linkedTenantId !== targetSlug) {
          // Name collision with a real supplier linked elsewhere — approve the
          // forecast but skip the PO rather than clobber operator data.
          await tx.supplyForecast.update({ where: { id: f.id }, data: { status: "APPROVED" } });
          return { approved: true, po: null };
        }
        if (existing) {
          supplier = await tx.supplier.update({
            where: { id: existing.id },
            data: { linkedTenantId: targetSlug },
            select: { id: true, name: true },
          });
        } else {
          supplier = await tx.supplier.create({
            data: {
              tenantId: buyerSlug,
              name: supName,
              linkedTenantId: targetSlug,
              notes: `Cross-tenant link → ${targetSlug} (NS-1 auto-created on approval)`,
            },
            select: { id: true, name: true },
          });
        }
      }

      const poNumber = generateNumber("PO");
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId: buyerSlug,
          poNumber,
          supplierId: supplier.id,
          status: "DRAFT",
          sourceForecastId: f.id, // @unique → racing duplicate throws P2002
          expectedAt: f.periodEnd,
          note: `${f.productLabel} — ${f.predictedDemand} ${f.unit}`,
        },
      });
      await tx.supplyForecast.update({
        where: { id: f.id },
        data: { status: "APPROVED", linkedPurchaseOrderId: po.id },
      });
      return { approved: true, po: { poNumber, supplierName: supplier.name } };
    });
  } catch (e) {
    // A concurrent approval already bridged this forecast (unique violation
    // on sourceForecastId, or a poNumber collision). Idempotent no-op.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { approved: false };
    }
    throw e;
  }
}
