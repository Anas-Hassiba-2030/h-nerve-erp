"use server";

// Server actions for /admin/replenishment (supply-chain wave — Odoo
// reordering rules translated). Rule CRUD + the one-click "draft POs"
// sweep that turns triggered rules into DRAFT PurchaseOrders through
// the existing lib/finance/orders.createPO core (one PO per supplier).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { createPO } from "@/lib/finance/orders";
import { suggestOrderQty, groupNeedsBySupplier } from "@/lib/supply/replenishment";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

const ruleSchema = z.object({
  productId: z.string().trim().min(1),
  minQty: z.coerce.number().int().min(0),
  maxQty: z.coerce.number().int().min(1),
  qtyMultiple: z.coerce.number().int().min(1),
});

export async function saveReorderRule(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط" : "No active tenant",
    });
    return;
  }

  const parsed = ruleSchema.safeParse({
    productId: formData.get("productId"),
    minQty: formData.get("minQty") || 0,
    maxQty: formData.get("maxQty") || 0,
    qtyMultiple: formData.get("qtyMultiple") || 1,
  });
  if (!parsed.success || parsed.data.maxQty < parsed.data.minQty) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "بيانات القاعدة غير صالحة (الحد الأقصى يجب أن يكون ≥ الحد الأدنى)"
        : "Invalid rule (max must be ≥ min)",
    });
    return;
  }
  const data = parsed.data;

  try {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "المنتج غير موجود" : "Product not found",
      });
      return;
    }
    await prisma.reorderRule.upsert({
      where: { productId: data.productId },
      create: {
        tenantId,
        productId: data.productId,
        minQty: data.minQty,
        maxQty: data.maxQty,
        qtyMultiple: data.qtyMultiple,
      },
      update: {
        minQty: data.minQty,
        maxQty: data.maxQty,
        qtyMultiple: data.qtyMultiple,
        active: true,
        deletedAt: null,
      },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر حفظ قاعدة إعادة الطلب" : "Could not save the reorder rule",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حفظ قاعدة إعادة الطلب" : "Reorder rule saved",
  });
  revalidatePath("/admin/replenishment");
}

export async function toggleReorderRule(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const rule = await prisma.reorderRule.findUnique({ where: { id } });
    if (!rule || rule.deletedAt) return;
    await prisma.reorderRule.update({ where: { id }, data: { active: !rule.active } });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر تحديث القاعدة" : "Could not update the rule",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم تحديث القاعدة" : "Rule updated",
  });
  revalidatePath("/admin/replenishment");
}

export async function deleteReorderRule(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await prisma.reorderRule.update({ where: { id }, data: { deletedAt: new Date() } });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر حذف القاعدة" : "Could not delete the rule",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حذف القاعدة" : "Rule deleted",
  });
  revalidatePath("/admin/replenishment");
}

export async function draftReplenishmentPOs(): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط" : "No active tenant",
    });
    return;
  }

  let drafted = 0;
  let lineCount = 0;
  let unassignedCount = 0;
  try {
    const rules = await prisma.reorderRule.findMany({
      where: { tenantId, active: true, deletedAt: null },
      include: { product: { select: { id: true, quantity: true, supplierId: true, unitCost: true, deletedAt: true } } },
    });
    const needs = rules
      .filter((r) => !r.product.deletedAt)
      .map((r) => ({
        productId: r.product.id,
        supplierId: r.product.supplierId,
        unitCost: r.product.unitCost == null ? null : Number(r.product.unitCost),
        orderQty: suggestOrderQty({
          onHand: r.product.quantity,
          minQty: r.minQty,
          maxQty: r.maxQty,
          qtyMultiple: r.qtyMultiple,
        }),
      }))
      .filter((n) => n.orderQty > 0);

    const unitCostByProduct = new Map(needs.map((n) => [n.productId, n.unitCost]));
    const { drafts, unassigned } = groupNeedsBySupplier(needs);
    unassignedCount = unassigned.length;

    for (const d of drafts) {
      await createPO({
        tenantId,
        supplierId: d.supplierId,
        lines: d.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: unitCostByProduct.get(l.productId) ?? null,
        })),
        note: ar ? "مسودة تلقائية من قواعد إعادة الطلب" : "Auto-drafted from reorder rules",
      });
      drafted += 1;
      lineCount += d.lines.length;
    }
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر إنشاء مسودات أوامر الشراء" : "Could not draft the purchase orders",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label:
      drafted > 0
        ? ar
          ? `تم إنشاء ${drafted} مسودة أمر شراء (${lineCount} بند)${unassignedCount ? ` — ${unassignedCount} منتج بلا مورّد` : ""}`
          : `Drafted ${drafted} purchase order${drafted === 1 ? "" : "s"} (${lineCount} lines)${unassignedCount ? ` — ${unassignedCount} product(s) missing a supplier` : ""}`
        : ar
          ? unassignedCount
            ? `لا مسودات — ${unassignedCount} منتج محتاج لكن بلا مورّد`
            : "لا نقص حالياً — كل المنتجات فوق الحد الأدنى"
          : unassignedCount
            ? `No drafts — ${unassignedCount} product(s) need stock but have no supplier`
            : "Nothing to order — every product is above its minimum",
  });
  revalidatePath("/admin/replenishment");
  revalidatePath("/admin/purchase-orders");
}
