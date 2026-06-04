"use server";

// Server action for /admin/transfers (Phase 9). Wraps lib/transfers
// createTransfer in one transaction so the paired TRANSFER_OUT/IN +
// both recalcs commit together. tenantId is taken from the source
// product (never trusted from the client); createTransfer re-validates
// tenant/warehouse/stock and throws — rolling back — on any problem.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { createTransfer } from "@/lib/finance/transfers";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
}
function fail(label: string) {
  flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath("/admin/transfers");
}

export async function createTransferAction(
  formData: FormData,
): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";

  const fromProductId = String(formData.get("fromProductId") ?? "").trim();
  const toWarehouseId = String(formData.get("toWarehouseId") ?? "").trim();
  const qty = Number(String(formData.get("qty") ?? "").trim());
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);

  if (!fromProductId || !toWarehouseId || !reason) {
    return fail(
      ar
        ? "المنتج المصدر والمستودع الوجهة والسبب مطلوبة"
        : "source product, destination warehouse and reason are required",
    );
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return fail(
      ar
        ? "الكمية يجب أن تكون عدداً صحيحاً موجباً"
        : "qty must be a positive integer",
    );
  }

  const src = await prisma.product.findUnique({
    where: { id: fromProductId },
    select: { tenantId: true },
  });
  if (!src) {
    return fail(ar ? "المنتج المصدر غير موجود" : "source product not found");
  }

  try {
    const res = await prisma.$transaction((tx) =>
      createTransfer(tx, {
        tenantId: src.tenantId,
        fromProductId,
        toWarehouseId,
        qty,
        reason,
      }),
    );
    flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? `تم النقل ${res.sku}: ${res.qty} وحدة — ${res.transferRef}`
        : `Transferred ${res.sku}: ${res.qty} units — ${res.transferRef}`,
    });
  } catch (e) {
    // Surface createTransfer's precise reason (insufficient stock /
    // same warehouse / cross-tenant / …) — fail-loud, operator-facing.
    const msg = e instanceof Error ? e.message : "transfer failed";
    return fail(ar ? `فشل النقل: ${msg}` : `transfer failed: ${msg}`);
  }

  // Stock moved → refresh the log and the surfaces that read quantity.
  revalidatePath("/admin/transfers");
  revalidatePath("/admin/products");
  revalidatePath("/admin/movements");
}
