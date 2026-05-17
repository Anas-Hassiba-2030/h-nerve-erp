"use server";

// Server actions for /admin/products (Phase 5).
//
// adjustStock is the FIRST manual write-path into inventory: it records
// an ADJUSTMENT movement (signed) attributed to the current user, then
// recalcs the cached Product.quantity — both in ONE transaction so a
// recalc failure rolls the movement back. Movements stay append-only;
// a "correction" is just another signed ADJUSTMENT, never an edit.
//
// TODO(Phase 11): per-tenant authz — currently any ADMIN/EXECUTIVE/
// MANAGER may adjust any tenant's product (same posture as mappings).

import { revalidatePath } from "next/cache";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { prismaUnscoped } from "@/lib/db";
import { flashToast } from "@/lib/toast";
import { recordMovement, recalcProductQuantity } from "@/lib/inventory";

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

  const product = await prismaUnscoped.product.findUnique({
    where: { id: productId },
    select: { sku: true, tenantId: true },
  });
  if (!product) {
    return toast(ar ? "⚠ المنتج غير موجود" : "⚠ Product not found");
  }

  try {
    await prismaUnscoped.$transaction(async (tx) => {
      await recordMovement(tx, {
        tenantId: product.tenantId,
        productId,
        type: "ADJUSTMENT",
        delta,
        reason,
        userId: user.id,
      });
      await recalcProductQuantity(tx, productId);
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
