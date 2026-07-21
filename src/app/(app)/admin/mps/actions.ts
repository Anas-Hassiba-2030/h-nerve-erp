"use server";

// Server actions for /admin/mps — Master Production Schedule (Odoo
// mrp.mps, translated). Forecast CRUD per product/period + a per-cell
// "Replenish" action that recomputes the rolled-forward schedule
// server-side (never trusts a client-sent quantity) and drafts a PO,
// mirroring the reorder-rules draftReplenishmentPOs pattern.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { createPO } from "@/lib/finance/orders";
import { explodeIndirectDemand, rollForwardMps, generatePeriods } from "@/lib/supply/mps";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

const forecastSchema = z.object({
  productId: z.string().trim().min(1),
  period: z.string().trim().regex(/^\d{4}-\d{2}$/),
  forecastedDemand: z.coerce.number().int().min(0),
  safetyStockTarget: z.coerce.number().int().min(0),
  minToReplenish: z.coerce.number().int().min(0),
  maxToReplenish: z.coerce.number().int().min(0),
});

export async function saveMpsForecast(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط" : "No active tenant" });
    return;
  }

  const parsed = forecastSchema.safeParse({
    productId: formData.get("productId"),
    period: formData.get("period"),
    forecastedDemand: formData.get("forecastedDemand") || 0,
    safetyStockTarget: formData.get("safetyStockTarget") || 0,
    minToReplenish: formData.get("minToReplenish") || 0,
    maxToReplenish: formData.get("maxToReplenish") || 0,
  });
  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات التوقع غير صالحة" : "Invalid forecast data" });
    return;
  }
  const data = parsed.data;

  try {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      await flashToast({ type: "info", entity: "info", label: ar ? "المنتج غير موجود" : "Product not found" });
      return;
    }
    // Mutual exclusivity with ReorderRule — see saveReorderRule's mirror check.
    const hasReorderRule = await prisma.reorderRule.findFirst({
      where: { productId: data.productId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (hasReorderRule) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar
          ? "هذا المنتج له قاعدة إعادة طلب — أوقفها أولاً قبل استخدام MPS"
          : "This product has a reorder rule — pause it first before using MPS",
      });
      return;
    }

    await prisma.mpsForecast.upsert({
      where: { tenantId_productId_period: { tenantId, productId: data.productId, period: data.period } },
      create: { tenantId, ...data },
      update: {
        forecastedDemand: data.forecastedDemand,
        safetyStockTarget: data.safetyStockTarget,
        minToReplenish: data.minToReplenish,
        maxToReplenish: data.maxToReplenish,
        deletedAt: null,
      },
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر حفظ التوقع" : "Could not save the forecast" });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم حفظ التوقع" : "Forecast saved" });
  revalidatePath("/admin/mps");
}

export async function deleteMpsForecast(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await prisma.mpsForecast.update({ where: { id }, data: { deletedAt: new Date() } });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر حذف التوقع" : "Could not delete the forecast" });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم حذف التوقع" : "Forecast deleted" });
  revalidatePath("/admin/mps");
}

export async function draftMpsReplenishmentPO(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  const productId = String(formData.get("productId") ?? "");
  const period = String(formData.get("period") ?? "");
  if (!tenantId || !productId || !/^\d{4}-\d{2}$/.test(period)) return;

  const AUTO_NOTE = `AUTO-MPS:${productId}:${period}`;

  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      select: { id: true, quantity: true, supplierId: true, unitCost: true },
    });
    if (!product) {
      await flashToast({ type: "info", entity: "info", label: ar ? "المنتج غير موجود" : "Product not found" });
      return;
    }
    if (!product.supplierId) {
      await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مورّد لهذا المنتج" : "This product has no supplier" });
      return;
    }

    const existing = await prisma.purchaseOrder.findFirst({
      where: { tenantId, status: "DRAFT", deletedAt: null, note: { contains: AUTO_NOTE } },
      select: { id: true },
    });
    if (existing) {
      await flashToast({ type: "info", entity: "info", label: ar ? "توجد بالفعل مسودة لهذه الفترة" : "A draft for this period already exists" });
      return;
    }

    // Recompute the whole rolled-forward chain up to and including the
    // requested period — never trust a client-sent quantity.
    const periods = generatePeriods(new Date(), 12).filter((p) => p <= period);
    const [forecastRows, bomLines, parentDemandsRaw] = await Promise.all([
      prisma.mpsForecast.findMany({
        where: { tenantId, productId, period: { in: periods }, deletedAt: null },
      }),
      prisma.bomLine.findMany({
        where: { componentProductId: productId, bom: { tenantId, deletedAt: null } },
        select: { quantity: true, bom: { select: { productId: true, outputQty: true } } },
      }),
      prisma.mpsForecast.findMany({
        where: { tenantId, period: { in: periods }, deletedAt: null },
        select: { productId: true, period: true, forecastedDemand: true },
      }),
    ]);
    const indirect = explodeIndirectDemand(
      productId,
      bomLines.map((l) => ({
        parentProductId: l.bom.productId,
        componentProductId: productId,
        qtyPerUnit: l.quantity / Math.max(1, l.bom.outputQty),
      })),
      parentDemandsRaw,
    );
    const byPeriod = new Map(forecastRows.map((r) => [r.period, r]));
    const rows = periods.map((p) => {
      const f = byPeriod.get(p);
      return {
        period: p,
        forecastedDemand: f?.forecastedDemand ?? 0,
        indirectDemand: indirect.get(p) ?? 0,
        safetyStockTarget: f?.safetyStockTarget ?? 0,
        minToReplenish: f?.minToReplenish ?? 0,
        maxToReplenish: f?.maxToReplenish ?? 0,
      };
    });
    const schedule = rollForwardMps(rows, product.quantity);
    const target = schedule[schedule.length - 1];
    if (!target || target.suggestedReplenishment <= 0) {
      await flashToast({ type: "info", entity: "info", label: ar ? "لا حاجة للتزويد في هذه الفترة" : "Nothing to replenish for this period" });
      return;
    }

    await createPO({
      tenantId,
      supplierId: product.supplierId,
      lines: [{ productId, quantity: target.suggestedReplenishment, unitCost: product.unitCost == null ? null : Number(product.unitCost) }],
      note: `[${AUTO_NOTE}] ${ar ? "مسودة تلقائية من جدول الإنتاج" : "Auto-drafted from MPS"}`,
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر إنشاء مسودة أمر الشراء" : "Could not draft the purchase order" });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم إنشاء مسودة أمر الشراء" : "Purchase order draft created" });
  revalidatePath("/admin/mps");
  revalidatePath("/admin/purchase-orders");
}
