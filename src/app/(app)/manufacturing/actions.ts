"use server";

// Server actions for /manufacturing (Phase 27 — hnerve-gap-map.md
// "Manufacturing" row). BOM CRUD + the manufacturing-order lifecycle
// (DRAFT → IN_PROGRESS → DONE / CANCELLED). Completion posts through
// lib/manufacturing/manufacturing.ts — inventory movements + the
// labor/overhead accrual JournalEntry happen in one transaction.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { nextDocNumber } from "@/lib/finance/invoicing";
import { completeManufacturingOrder } from "@/lib/manufacturing/manufacturing";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

const bomLineSchema = z.object({
  componentProductId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
});

const bomSchema = z.object({
  name: z.string().trim().min(1).max(200),
  productId: z.string().trim().min(1),
  outputQty: z.coerce.number().int().min(1),
  laborCost: z.coerce.number().min(0),
  overheadCost: z.coerce.number().min(0),
  note: z.string().trim().max(2000).optional(),
  lines: z.array(bomLineSchema).min(1),
});

export async function createBom(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط" : "No active tenant",
    });
    return;
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(String(formData.get("linesJson") ?? "[]"));
  } catch {
    linesRaw = [];
  }

  const parsed = bomSchema.safeParse({
    name: formData.get("name"),
    productId: formData.get("productId"),
    outputQty: formData.get("outputQty") || 1,
    laborCost: formData.get("laborCost") || 0,
    overheadCost: formData.get("overheadCost") || 0,
    note: formData.get("note") ?? "",
    lines: linesRaw,
  });
  if (!parsed.success) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "بيانات قائمة المواد غير صالحة" : "Invalid bill-of-materials data",
    });
    return;
  }
  const data = parsed.data;

  if (data.lines.some((l) => l.componentProductId === data.productId)) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "لا يمكن أن يكون المنتج الناتج ضمن مكوناته"
        : "The output product cannot be one of its own components",
    });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const bomNumber = await nextDocNumber(t, tenantId, "BOM", "BOM-");
      await t.billOfMaterials.create({
        data: {
          tenantId,
          bomNumber,
          name: data.name,
          productId: data.productId,
          outputQty: data.outputQty,
          laborCost: data.laborCost,
          overheadCost: data.overheadCost,
          note: data.note || null,
          lines: {
            create: data.lines.map((l) => ({
              componentProductId: l.componentProductId,
              quantity: l.quantity,
            })),
          },
        },
      });
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر إنشاء قائمة المواد" : "Could not create the bill of materials",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم إنشاء قائمة المواد" : "Bill of materials created",
  });
  revalidatePath("/manufacturing/boms");
  redirect("/manufacturing/boms");
}

export async function deleteBom(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const orderCount = await prisma.manufacturingOrder.count({
      where: { bomId: id, deletedAt: null },
    });
    if (orderCount > 0) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar
          ? "لا يمكن حذف قائمة مواد لها أوامر تصنيع"
          : "Cannot delete a BOM that has manufacturing orders",
      });
      return;
    }
    await prisma.billOfMaterials.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر حذف قائمة المواد" : "Could not delete the bill of materials",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حذف قائمة المواد" : "Bill of materials deleted",
  });
  revalidatePath("/manufacturing/boms");
}

const orderSchema = z.object({
  bomId: z.string().trim().min(1),
  runs: z.coerce.number().int().min(1),
  note: z.string().trim().max(2000).optional(),
});

export async function createOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط" : "No active tenant",
    });
    return;
  }

  const parsed = orderSchema.safeParse({
    bomId: formData.get("bomId"),
    runs: formData.get("runs") || 1,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "بيانات أمر التصنيع غير صالحة" : "Invalid manufacturing-order data",
    });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const orderNumber = await nextDocNumber(t, tenantId, "MFG_ORDER", "MO-");
      await t.manufacturingOrder.create({
        data: {
          tenantId,
          orderNumber,
          bomId: data.bomId,
          runs: data.runs,
          note: data.note || null,
        },
      });
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر إنشاء أمر التصنيع" : "Could not create the manufacturing order",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم إنشاء أمر التصنيع" : "Manufacturing order created",
  });
  revalidatePath("/manufacturing");
  redirect("/manufacturing");
}

export async function startOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const order = await prisma.manufacturingOrder.findUnique({ where: { id } });
    if (!order || order.status !== "DRAFT") {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "الأمر ليس مسودة" : "Order is not a draft",
      });
      return;
    }
    await prisma.manufacturingOrder.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر بدء أمر التصنيع" : "Could not start the manufacturing order",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "بدأ التصنيع" : "Manufacturing started",
  });
  revalidatePath("/manufacturing");
}

export async function completeOrder(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  const id = String(formData.get("id") ?? "");
  if (!id || !tenantId) return;

  let result: { orderNumber: string; outputUnits: number; totalCost: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      return completeManufacturingOrder(t, { tenantId, orderId: id, userId: user.id });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر إكمال أمر التصنيع"
        : `Could not complete the order${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar
      ? `اكتمل ${result.orderNumber}: ${result.outputUnits} وحدة منتجة`
      : `${result.orderNumber} completed: ${result.outputUnits} units produced`,
  });
  revalidatePath("/manufacturing");
  revalidatePath("/statements");
}

export async function cancelOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const order = await prisma.manufacturingOrder.findUnique({ where: { id } });
    if (!order || !["DRAFT", "IN_PROGRESS"].includes(order.status)) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "لا يمكن إلغاء هذا الأمر" : "This order cannot be cancelled",
      });
      return;
    }
    await prisma.manufacturingOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر إلغاء أمر التصنيع" : "Could not cancel the manufacturing order",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم إلغاء أمر التصنيع" : "Manufacturing order cancelled",
  });
  revalidatePath("/manufacturing");
}
