"use server";

// Server actions for /admin/products (Phase 5).
//
// adjustStock is the FIRST manual write-path into inventory: it records
// an ADJUSTMENT movement (signed) attributed to the current user, then
// recalcs the cached Product.quantity — both in ONE transaction so a
// recalc failure rolls the movement back. Movements stay append-only;
// a "correction" is just another signed ADJUSTMENT, never an edit.
//
// Phase 11 authz — the Product lookup (line ~63) uses the scoped prisma
// client (Product is in TENANT_SCOPED_MODELS), so a pinned user simply 404s
// on a foreign-tenant productId. Cross-tenant ADMIN intentionally has no pin.

import { revalidatePath } from "next/cache";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { flashToast } from "@/lib/toast";
import { recordMovement, recalcProductQuantity } from "@/lib/inventory";
import { Prisma } from "@prisma/client";
import {
  postJournalEntry,
  getWeightedAverageCost,
  money,
  ACCT,
} from "@/lib/accounting";

async function gate(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

function toast(label: string) {
  flashToast({ type: "info", entity: "info", label });
  revalidatePath("/admin/products");
  revalidatePath("/admin/movements");
}

export async function adjustStock(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = getLocale() === "ar";

  const productId = String(formData.get("productId") ?? "").trim();
  const rawDelta = String(formData.get("delta") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);

  if (!productId) return;
  const delta = Number(rawDelta);
  if (!Number.isInteger(delta) || delta === 0) {
    return toast(
      ar
        ? "⚠ التغيّر يجب أن يكون عدداً صحيحاً غير صفري (موجب أو سالب)"
        : "⚠ Delta must be a non-zero whole number (positive or negative)",
    );
  }
  if (!reason) {
    return toast(ar ? "⚠ السبب مطلوب" : "⚠ A reason is required");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sku: true, tenantId: true },
  });
  if (!product) {
    return toast(ar ? "⚠ المنتج غير موجود" : "⚠ Product not found");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await recordMovement(tx, {
        tenantId: product.tenantId,
        productId,
        type: "ADJUSTMENT",
        delta,
        reason,
        userId: user.id,
      });
      await recalcProductQuantity(tx, productId);

      // --- Accounting (Phase 8): value the adjustment at last-known
      // weighted-avg cost. delta>0 (stock added) DR Inventory / CR
      // Inventory Adjustment; delta<0 (removed) the reverse. WAC=0
      // (no costed inflow) → amount 0 → postJournalEntry skips it.
      const wac = await getWeightedAverageCost(tx, productId);
      const amount = money(new Prisma.Decimal(Math.abs(delta)).times(wac));
      await postJournalEntry(tx, {
        tenantId: product.tenantId,
        description: `Stock adjustment ${product.sku}: ${reason}`,
        reference: `ADJ:${product.sku}`,
        lines:
          delta > 0
            ? [
                { accountCode: ACCT.INVENTORY, debit: amount, memo: reason },
                { accountCode: ACCT.INVENTORY_ADJUSTMENT, credit: amount, memo: reason },
              ]
            : [
                { accountCode: ACCT.INVENTORY_ADJUSTMENT, debit: amount, memo: reason },
                { accountCode: ACCT.INVENTORY, credit: amount, memo: reason },
              ],
      });
    });
  } catch (e) {
    console.error("[adjustStock] failed:", e);
    return toast(ar ? "⚠ فشلت التسوية" : "⚠ Adjustment failed");
  }

  const signed = delta > 0 ? `+${delta}` : String(delta);
  toast(
    ar
      ? `تمت تسوية ${product.sku} بمقدار ${signed} وحدة`
      : `Adjusted ${product.sku} by ${signed} units`,
  );
}

// Phase 10: set/clear a product's Brain reorder point. Empty → null
// (engine falls back to 50). Revalidates /admin/brain too — the
// low-stock analyzer reads this threshold.
export async function setReorderPoint(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";

  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) return;
  const raw = String(formData.get("reorderPoint") ?? "").trim();

  let value: number | null;
  if (raw === "") {
    value = null;
  } else {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      return toast(
        ar
          ? "⚠ نقطة إعادة الطلب يجب أن تكون عدداً صحيحاً ≥ 0 أو فارغة"
          : "⚠ Reorder point must be a whole number ≥ 0, or empty",
      );
    }
    value = n;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sku: true },
  });
  if (!product) {
    return toast(ar ? "⚠ المنتج غير موجود" : "⚠ Product not found");
  }
  await prisma.product.update({
    where: { id: productId },
    data: { reorderPoint: value },
  });
  revalidatePath("/admin/brain");
  toast(
    ar
      ? `تم ضبط نقطة إعادة الطلب لـ ${product.sku}${value == null ? " (افتراضي)" : `: ${value}`}`
      : `Reorder point set for ${product.sku}${value == null ? " (default)" : `: ${value}`}`,
  );
}
