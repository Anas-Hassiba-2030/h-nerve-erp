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
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { nextDocNumber } from "@/lib/finance/invoicing";
import { completeManufacturingOrder } from "@/lib/manufacturing/manufacturing";
import { plannedWorkOrderMinutes, workOrderLaborCost } from "@/lib/manufacturing/routing";

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

const bomOperationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  workCenterId: z.string().trim().min(1),
  durationMinutes: z.coerce.number().min(1),
});

const bomByproductSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
  costSharePercent: z.coerce.number().min(0).max(100),
  isScrap: z.coerce.boolean(),
});

const bomSchema = z.object({
  name: z.string().trim().min(1).max(200),
  productId: z.string().trim().min(1),
  outputQty: z.coerce.number().int().min(1),
  laborCost: z.coerce.number().min(0),
  overheadCost: z.coerce.number().min(0),
  note: z.string().trim().max(2000).optional(),
  lines: z.array(bomLineSchema).min(1),
  operations: z.array(bomOperationSchema).max(50).default([]),
  byproducts: z.array(bomByproductSchema).max(20).default([]),
});

export async function createBom(formData: FormData): Promise<void> {
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

  const parseJson = (field: string): unknown => {
    try {
      return JSON.parse(String(formData.get(field) ?? "[]"));
    } catch {
      return [];
    }
  };

  const parsed = bomSchema.safeParse({
    name: formData.get("name"),
    productId: formData.get("productId"),
    outputQty: formData.get("outputQty") || 1,
    laborCost: formData.get("laborCost") || 0,
    overheadCost: formData.get("overheadCost") || 0,
    note: formData.get("note") ?? "",
    lines: parseJson("linesJson"),
    operations: parseJson("operationsJson"),
    byproducts: parseJson("byproductsJson"),
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

  const shareSum = data.byproducts.reduce((s, b) => s + b.costSharePercent, 0);
  if (shareSum > 100 || data.byproducts.some((b) => b.productId === data.productId)) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "بيانات المنتجات الثانوية غير صالحة (حصص الكلفة > 100% أو منتج مكرر)"
        : "Invalid byproducts (cost shares over 100%, or the output product listed as its own byproduct)",
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
          operations: {
            create: data.operations.map((o, i) => ({
              sequence: (i + 1) * 10,
              name: o.name,
              workCenterId: o.workCenterId,
              durationMinutes: o.durationMinutes,
            })),
          },
          byproducts: {
            create: data.byproducts.map((b) => ({
              productId: b.productId,
              quantity: b.quantity,
              costSharePercent: b.costSharePercent,
              isScrap: b.isScrap,
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
  const tenantId = await activeTenantSlug();
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
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        bom: { include: { operations: { include: { workCenter: true }, orderBy: { sequence: "asc" } } } },
        workOrders: { select: { id: true } },
      },
    });
    if (!order || order.status !== "DRAFT") {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "الأمر ليس مسودة" : "Order is not a draft",
      });
      return;
    }

    // v2 routing: materialize one work order per BOM operation, freezing
    // the work-center rate + efficiency-adjusted duration NOW so later
    // work-center edits never rewrite this order's plan. createMany first,
    // status flip last — the D1-safe write order (CLAUDE.md ledger rule).
    if (order.bom.operations.length > 0 && order.workOrders.length === 0) {
      await prisma.workOrder.createMany({
        data: order.bom.operations.map((op) => ({
          tenantId: order.tenantId,
          orderId: order.id,
          operationId: op.id,
          workCenterId: op.workCenterId,
          sequence: op.sequence,
          name: op.name,
          plannedMinutes: plannedWorkOrderMinutes({
            durationMinutes: Number(op.durationMinutes),
            runs: order.runs,
            efficiency: op.workCenter.efficiency,
            setupMinutes: Number(op.workCenter.setupMinutes),
            cleanupMinutes: Number(op.workCenter.cleanupMinutes),
          }),
          costPerHour: Number(op.workCenter.costPerHour),
        })),
      });
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

// ── Work-order lifecycle (v2 routing stages) ────────────────────────────

export async function startWorkOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: { order: { include: { workOrders: { select: { sequence: true, status: true } } } } },
    });
    if (!wo || wo.status !== "PENDING" || wo.order.status !== "IN_PROGRESS") {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "لا يمكن بدء هذه المرحلة" : "This stage cannot be started",
      });
      return;
    }
    // Sequential gating (Odoo "waiting for another WO"): every earlier
    // stage must be finished or cancelled first.
    const blocked = wo.order.workOrders.some(
      (s) => s.sequence < wo.sequence && s.status !== "DONE" && s.status !== "CANCELLED",
    );
    if (blocked) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "أكمل المراحل السابقة أولاً" : "Finish the earlier stages first",
      });
      return;
    }
    await prisma.workOrder.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر بدء المرحلة" : "Could not start the stage",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "بدأت المرحلة" : "Stage started",
  });
  revalidatePath("/manufacturing");
}

export async function completeWorkOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const actualRaw = String(formData.get("actualMinutes") ?? "").trim();
  const actualParsed = actualRaw === "" ? null : Number(actualRaw);
  if (actualParsed != null && (!Number.isFinite(actualParsed) || actualParsed < 0)) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "الدقائق الفعلية غير صالحة" : "Invalid actual minutes",
    });
    return;
  }

  try {
    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo || wo.status !== "IN_PROGRESS") {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "المرحلة ليست قيد التنفيذ" : "Stage is not in progress",
      });
      return;
    }
    const minutes = actualParsed ?? Number(wo.plannedMinutes);
    await prisma.workOrder.update({
      where: { id },
      data: {
        status: "DONE",
        finishedAt: new Date(),
        actualMinutes: actualParsed,
        laborCost: workOrderLaborCost({ minutes, costPerHour: Number(wo.costPerHour) }),
      },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر إكمال المرحلة" : "Could not complete the stage",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "اكتملت المرحلة" : "Stage completed",
  });
  revalidatePath("/manufacturing");
}

export async function cancelWorkOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo || !["PENDING", "IN_PROGRESS"].includes(wo.status)) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar ? "لا يمكن إلغاء هذه المرحلة" : "This stage cannot be cancelled",
      });
      return;
    }
    await prisma.workOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر إلغاء المرحلة" : "Could not cancel the stage",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "أُلغيت المرحلة" : "Stage cancelled",
  });
  revalidatePath("/manufacturing");
}

export async function completeOrder(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
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
    // Cascade: open routing stages die with the order.
    await prisma.workOrder.updateMany({
      where: { orderId: id, status: { in: ["PENDING", "IN_PROGRESS"] } },
      data: { status: "CANCELLED" },
    });
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

// ── Work centers (v2 routing reference data) ────────────────────────────

const workCenterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().max(200).optional(),
  costPerHour: z.coerce.number().min(0),
  efficiency: z.coerce.number().int().min(1).max(500),
  setupMinutes: z.coerce.number().min(0),
  cleanupMinutes: z.coerce.number().min(0),
  note: z.string().trim().max(2000).optional(),
});

export async function createWorkCenter(formData: FormData): Promise<void> {
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

  const parsed = workCenterSchema.safeParse({
    name: formData.get("name"),
    nameEn: formData.get("nameEn") ?? "",
    costPerHour: formData.get("costPerHour") || 0,
    efficiency: formData.get("efficiency") || 100,
    setupMinutes: formData.get("setupMinutes") || 0,
    cleanupMinutes: formData.get("cleanupMinutes") || 0,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "بيانات مركز العمل غير صالحة" : "Invalid work-center data",
    });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const code = await nextDocNumber(t, tenantId, "WORK_CENTER", "WC-");
      await t.workCenter.create({
        data: {
          tenantId,
          code,
          name: data.name,
          nameEn: data.nameEn || null,
          costPerHour: data.costPerHour,
          efficiency: data.efficiency,
          setupMinutes: data.setupMinutes,
          cleanupMinutes: data.cleanupMinutes,
          note: data.note || null,
        },
      });
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر إنشاء مركز العمل" : "Could not create the work center",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم إنشاء مركز العمل" : "Work center created",
  });
  revalidatePath("/manufacturing/workcenters");
}

export async function toggleWorkCenter(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const wc = await prisma.workCenter.findUnique({ where: { id } });
    if (!wc || wc.deletedAt) return;
    await prisma.workCenter.update({ where: { id }, data: { active: !wc.active } });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر تحديث مركز العمل" : "Could not update the work center",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم تحديث مركز العمل" : "Work center updated",
  });
  revalidatePath("/manufacturing/workcenters");
}

export async function deleteWorkCenter(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    const openWoCount = await prisma.workOrder.count({
      where: { workCenterId: id, status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    if (openWoCount > 0) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar
          ? "لا يمكن حذف مركز عمل لديه مراحل قيد التنفيذ"
          : "Cannot delete a work center with stages still in progress",
      });
      return;
    }
    const opCount = await prisma.bomOperation.count({ where: { workCenterId: id } });
    if (opCount > 0) {
      await flashToast({
        type: "info",
        entity: "info",
        label: ar
          ? "لا يمكن حذف مركز عمل تستخدمه قوائم المواد"
          : "Cannot delete a work center used by BOM operations",
      });
      return;
    }
    await prisma.workCenter.update({ where: { id }, data: { deletedAt: new Date() } });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر حذف مركز العمل" : "Could not delete the work center",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حذف مركز العمل" : "Work center deleted",
  });
  revalidatePath("/manufacturing/workcenters");
}
