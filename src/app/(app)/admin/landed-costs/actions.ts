"use server";

// Server actions for /admin/landed-costs (docs/HOURANI-ERP-GAPS.md #8 🟠
// — the second half of stock valuation). Spreads freight/customs/
// clearing across a purchase order's received lines
// (lib/inventory/landedCost.ts), then posts Inventory (1001) debit /
// Treasury credit — the group actually paid the broker, this isn't a
// payable. The LandedCostLine rows are read back by
// getWeightedAverageCost (lib/finance/accounting.ts) so COGS reflects
// the true landed cost from the very next sale.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { flashToast } from "@/lib/utils/toast";
import { allocateLandedCost, postLandedCost, type AllocationInput } from "@/lib/inventory/landedCost";

const PATH = "/admin/landed-costs";

async function gate() {
  const user = await getCurrentUser();
  if (!hasRole(user, "MANAGER")) throw new Error("forbidden");
  return user;
}
async function ok(label: string) {
  await flashToast({ type: "info", entity: "info", label });
  revalidatePath(PATH);
}
async function fail(label: string) {
  await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath(PATH);
}
async function tenant(fallback?: string) {
  return ((await getActiveTenantSlug()) ?? fallback ?? "hourani-hotels").slice(0, 64);
}

export async function createLandedCost(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";

  const purchaseOrderId = String(formData.get("purchaseOrderId") ?? "").trim();
  const treasuryId = String(formData.get("treasuryId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const totalAmount = Number(formData.get("totalAmount") ?? 0);
  const allocationMethod = String(formData.get("allocationMethod") ?? "BY_VALUE").trim().toUpperCase();

  if (!purchaseOrderId || !treasuryId) return fail(ar ? "أمر الشراء والخزينة مطلوبان" : "purchase order and treasury are required");
  if (!description) return fail(ar ? "الوصف مطلوب" : "description is required");
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return fail(ar ? "المبلغ يجب أن يكون أكبر من صفر" : "amount must be greater than zero");
  if (!["BY_VALUE", "BY_QUANTITY"].includes(allocationMethod)) return fail(ar ? "طريقة توزيع غير صالحة" : "invalid allocation method");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, deletedAt: null },
    select: { id: true, tenantId: true, poNumber: true, status: true },
  });
  if (!po) return fail(ar ? "أمر الشراء غير موجود" : "purchase order not found");
  if (!["RECEIVED", "PARTIAL"].includes(po.status)) {
    return fail(ar ? "لا يمكن توزيع التكلفة قبل استلام شيء من الأمر" : "cannot allocate landed cost before anything on this order was received");
  }

  const movements = await prisma.inventoryMovement.findMany({
    where: { type: "RECEIVED", documentRef: po.poNumber, deletedAt: null },
    select: { id: true, productId: true, delta: true, unitCost: true },
  });
  if (movements.length === 0) {
    return fail(ar ? "لا حركات استلام مرتبطة بهذا الأمر" : "no receipt movements found for this order");
  }

  const allocationInputs: AllocationInput[] = movements.map((m) => ({
    movementId: m.id,
    productId: m.productId,
    quantity: m.delta,
    baseValue: m.delta * Number(m.unitCost ?? 0),
  }));
  const allocations = allocateLandedCost(allocationInputs, totalAmount, allocationMethod as "BY_VALUE" | "BY_QUANTITY");
  if (allocations.length === 0) {
    return fail(ar ? "تعذّر توزيع المبلغ — تحقق من الكميات والتكاليف" : "could not allocate the amount — check quantities and unit costs");
  }

  const tenantId = await tenant(po.tenantId);
  try {
    await prisma.$transaction((tx) =>
      postLandedCost(tx as unknown as typeof prisma, {
        tenantId,
        purchaseOrderId: po.id,
        poNumber: po.poNumber,
        description,
        totalAmount,
        allocationMethod: allocationMethod as "BY_VALUE" | "BY_QUANTITY",
        treasuryId,
        allocations,
      }),
    );
  } catch (e) {
    console.error("createLandedCost failed", e);
    return fail(ar ? "تعذّر إنشاء التكلفة اللاحقة" : "could not create the landed cost");
  }

  await ok(ar ? "تم توزيع التكلفة اللاحقة وترحيلها" : "Landed cost allocated and posted");
}
