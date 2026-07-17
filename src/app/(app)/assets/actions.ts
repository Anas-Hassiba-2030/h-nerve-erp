"use server";

// Server actions for /assets (hnerve-gap-map.md "Fixed assets" row).
// createFixedAsset posts the acquisition (1500 debit / 2100 credit);
// runDepreciation posts the current month's straight-line charge for
// every active asset (idempotent — the unique (assetId, year, month)
// makes a second click a no-op). Depreciation entries are immutable
// like all posted journals; disposal just flags the asset (no gain/loss
// entry in v1 — documented in the model comment).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { postAssetAcquisition, runMonthlyDepreciation } from "@/lib/finance/assets";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

const assetSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).optional(),
  purchaseDate: z.string().trim().optional(),
  purchaseCost: z.coerce.number().positive(),
  salvageValue: z.coerce.number().min(0).default(0),
  usefulLifeMonths: z.coerce.number().int().min(1).max(1200),
  note: z.string().trim().max(2000).optional(),
});

export async function createFixedAsset(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لإضافة أصل له" : "No active tenant to add an asset to",
    });
    return;
  }

  const parsed = assetSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") ?? "",
    purchaseDate: formData.get("purchaseDate"),
    purchaseCost: formData.get("purchaseCost"),
    salvageValue: formData.get("salvageValue") || 0,
    usefulLifeMonths: formData.get("usefulLifeMonths"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات الأصل غير صالحة" : "Invalid asset data" });
    return;
  }
  const data = parsed.data;
  if (data.salvageValue >= data.purchaseCost) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "القيمة المتبقية يجب أن تكون أقل من التكلفة" : "Salvage value must be below cost",
    });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      await postAssetAcquisition(t, {
        tenantId,
        name: data.name,
        category: data.category,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        purchaseCost: data.purchaseCost,
        salvageValue: data.salvageValue,
        usefulLifeMonths: data.usefulLifeMonths,
        note: data.note,
      });
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر إنشاء الأصل" : "Could not create the asset" });
    return;
  }

  revalidatePath("/assets");
  redirect("/assets");
}

export async function runDepreciation(): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط" : "No active tenant" });
    return;
  }

  const now = new Date();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      return runMonthlyDepreciation(t, tenantId, now.getFullYear(), now.getMonth() + 1);
    });
    await flashToast({
      type: "info",
      entity: "info",
      label:
        result.charged === 0
          ? ar
            ? "لا إهلاك مستحق لهذا الشهر (مسجّل مسبقاً أو لا أصول نشطة)"
            : "No depreciation due this month (already posted or no active assets)"
          : ar
            ? `تم تسجيل إهلاك ${result.charged} أصل بإجمالي ${result.total.toFixed(2)}`
            : `Posted depreciation for ${result.charged} asset(s), total ${result.total.toFixed(2)}`,
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر تشغيل الإهلاك" : "Could not run depreciation" });
    return;
  }

  revalidatePath("/assets");
  revalidatePath("/statements");
}

export async function disposeAsset(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.fixedAsset.update({ where: { id }, data: { status: "DISPOSED" } });
  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم استبعاد الأصل — لن يُحسب إهلاك جديد" : "Asset disposed — no further depreciation",
  });
  revalidatePath("/assets");
}

export async function deleteFixedAsset(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const depCount = await prisma.depreciationEntry.count({ where: { assetId: id } });
  if (depCount > 0) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? `لا يمكن الحذف: للأصل ${depCount} قيد إهلاك — استبعده بدلاً من ذلك`
        : `cannot delete: asset has ${depCount} depreciation entr(ies) — dispose it instead`,
    });
    return;
  }

  await prisma.fixedAsset.update({ where: { id }, data: { deletedAt: new Date() } });
  await flashToast({ type: "info", entity: "info", label: ar ? "تم حذف الأصل" : "Asset deleted" });
  revalidatePath("/assets");
}
