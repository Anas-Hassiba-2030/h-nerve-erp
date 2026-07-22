"use server";

// Server actions for /maintenance (docs/HOURANI-ERP-GAPS.md #5 🟠).
// Lifecycle validated by lib/maintenance/maintenance.ts's transition
// table; starting an order tied to a WorkCenter takes it offline
// (active=false) so the manufacturing reassignment path (which already
// gates on active:true) can't schedule new work there, and completing
// or cancelling brings it back — see workCenterShouldBeActive's comment
// for exactly when.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { canTransition, workCenterShouldBeActive, type MaintenanceStatus } from "@/lib/maintenance/maintenance";

const PATH = "/maintenance";

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

export async function createMaintenanceOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";

  const type = String(formData.get("type") ?? "CORRECTIVE").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim().slice(0, 300);
  const assetId = String(formData.get("assetId") ?? "").trim() || null;
  const workCenterId = String(formData.get("workCenterId") ?? "").trim() || null;
  const scheduledRaw = String(formData.get("scheduledAt") ?? "").trim();

  if (!description) return fail(ar ? "الوصف مطلوب" : "description is required");
  if (!["CORRECTIVE", "PREVENTIVE"].includes(type)) return fail(ar ? "نوع غير صالح" : "invalid type");
  if (!assetId && !workCenterId) {
    return fail(ar ? "اختر أصلاً أو مركز عمل" : "choose an asset or a work centre");
  }
  if (assetId && workCenterId) {
    return fail(ar ? "اختر أصلاً أو مركز عمل، وليس كليهما" : "choose an asset OR a work centre, not both");
  }

  const tenantId = await tenant();
  try {
    await prisma.maintenanceOrder.create({
      data: {
        tenantId,
        type,
        description,
        assetId,
        workCenterId,
        scheduledAt: scheduledRaw ? new Date(scheduledRaw) : null,
      },
    });
  } catch {
    return fail(ar ? "تعذّر إنشاء أمر الصيانة" : "could not create the maintenance order");
  }
  await ok(ar ? "تم إنشاء أمر الصيانة" : "Maintenance order created");
}

async function setStatus(id: string, next: MaintenanceStatus, extra?: { cost?: number | null }) {
  const ar = (await getLocale()) === "ar";
  const order = await prisma.maintenanceOrder.findFirst({
    where: { id },
    select: { id: true, status: true, workCenterId: true },
  });
  if (!order) return fail(ar ? "أمر الصيانة غير موجود" : "maintenance order not found");
  if (!canTransition(order.status as MaintenanceStatus, next)) {
    return fail(ar ? `لا يمكن الانتقال من ${order.status} إلى ${next}` : `cannot move from ${order.status} to ${next}`);
  }

  const now = new Date();
  const data: Record<string, unknown> = { status: next };
  if (next === "IN_PROGRESS") data.startedAt = now;
  if (next === "DONE") {
    data.completedAt = now;
    if (extra?.cost != null) data.cost = extra.cost;
  }

  try {
    await prisma.maintenanceOrder.update({ where: { id }, data });
    if (order.workCenterId) {
      await prisma.workCenter.update({
        where: { id: order.workCenterId },
        data: { active: workCenterShouldBeActive(next) },
      });
    }
  } catch {
    return fail(ar ? "تعذّر تحديث أمر الصيانة" : "could not update the maintenance order");
  }

  const LABEL: Record<MaintenanceStatus, { ar: string; en: string }> = {
    SCHEDULED: { ar: "مجدول", en: "scheduled" },
    IN_PROGRESS: { ar: "قيد التنفيذ — مركز العمل غير متاح الآن", en: "in progress — the work centre is now offline" },
    DONE: { ar: "منجز", en: "done" },
    CANCELLED: { ar: "ملغى", en: "cancelled" },
  };
  await ok(ar ? `أمر الصيانة ${LABEL[next].ar}` : `Maintenance order ${LABEL[next].en}`);
}

export async function startMaintenanceOrder(formData: FormData): Promise<void> {
  await gate();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await setStatus(id, "IN_PROGRESS");
}

export async function completeMaintenanceOrder(formData: FormData): Promise<void> {
  await gate();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const costRaw = String(formData.get("cost") ?? "").trim();
  const cost = costRaw ? Number(costRaw) : null;
  await setStatus(id, "DONE", { cost });
}

export async function cancelMaintenanceOrder(formData: FormData): Promise<void> {
  await gate();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await setStatus(id, "CANCELLED");
}
