"use server";

// Server actions for /admin/quality — QMS (docs/HOURANI-ERP-GAPS.md #6).
//
// Two write paths:
//   createCheckPoint — define a check (name, stage, optional numeric range)
//   recordCheck      — record a result against a product/lot; a numeric
//                       checkpoint auto-evaluates pass/fail via
//                       lib/quality/quality.ts, a pass/fail-only checkpoint
//                       requires the operator's explicit verdict. A FAILED
//                       check always quarantines its lot — see
//                       lotStatusAfterCheck's comment for why a pass never
//                       auto-releases one.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { evaluateMeasurement, lotStatusAfterCheck } from "@/lib/quality/quality";

const PATH = "/admin/quality";

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

export async function createCheckPoint(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const stage = String(formData.get("stage") ?? "").trim().toUpperCase();
  const productId = String(formData.get("productId") ?? "").trim() || null;
  const minRaw = String(formData.get("minValue") ?? "").trim();
  const maxRaw = String(formData.get("maxValue") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim().slice(0, 20) || null;

  if (!name) return fail(ar ? "الاسم مطلوب" : "name is required");
  if (!["RECEIPT", "PRODUCTION", "TRANSFER"].includes(stage)) {
    return fail(ar ? "مرحلة غير صالحة" : "invalid stage");
  }
  const minValue = minRaw ? Number(minRaw) : null;
  const maxValue = maxRaw ? Number(maxRaw) : null;
  if ((minRaw && Number.isNaN(minValue)) || (maxRaw && Number.isNaN(maxValue))) {
    return fail(ar ? "الحد الأدنى/الأقصى يجب أن يكون رقماً" : "min/max must be numbers");
  }
  if (minValue !== null && maxValue !== null && minValue > maxValue) {
    return fail(ar ? "الحد الأدنى أكبر من الحد الأقصى" : "min is greater than max");
  }

  const tenantId = await tenant();
  try {
    await prisma.qualityCheckPoint.create({
      data: { tenantId, name, stage, productId, minValue, maxValue, unit },
    });
  } catch {
    return fail(ar ? `الاسم "${name}" مستخدم بالفعل` : `name "${name}" is already in use`);
  }
  await ok(ar ? "تمت إضافة نقطة الفحص" : "Checkpoint added");
}

export async function recordCheck(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";

  const checkPointId = String(formData.get("checkPointId") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim();
  const lotId = String(formData.get("lotId") ?? "").trim() || null;
  const measuredRaw = String(formData.get("measuredValue") ?? "").trim();
  const manualVerdict = String(formData.get("verdict") ?? "").trim(); // "PASS" | "FAIL" | ""
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  if (!checkPointId || !productId) {
    return fail(ar ? "نقطة الفحص والمنتج مطلوبان" : "checkpoint and product are required");
  }

  const checkPoint = await prisma.qualityCheckPoint.findFirst({
    where: { id: checkPointId, deletedAt: null },
    select: { id: true, tenantId: true, minValue: true, maxValue: true },
  });
  if (!checkPoint) return fail(ar ? "نقطة الفحص غير موجودة" : "checkpoint not found");

  const measuredValue = measuredRaw ? Number(measuredRaw) : null;
  if (measuredRaw && Number.isNaN(measuredValue)) {
    return fail(ar ? "القيمة المقاسة يجب أن تكون رقماً" : "measured value must be a number");
  }

  const autoVerdict = evaluateMeasurement(
    { minValue: checkPoint.minValue !== null ? Number(checkPoint.minValue) : null, maxValue: checkPoint.maxValue !== null ? Number(checkPoint.maxValue) : null },
    measuredValue,
  );
  const passed = autoVerdict !== null ? autoVerdict : manualVerdict === "PASS";
  if (autoVerdict === null && !["PASS", "FAIL"].includes(manualVerdict)) {
    return fail(
      ar
        ? "هذه نقطة فحص بلا حدود رقمية — اختر نجاح أو فشل يدوياً"
        : "this checkpoint has no numeric range — pick pass or fail manually",
    );
  }

  const tenantId = await tenant(checkPoint.tenantId);

  try {
    await prisma.qualityCheck.create({
      data: {
        tenantId,
        checkPointId,
        productId,
        lotId,
        measuredValue,
        passed,
        note,
        checkedById: user?.id ?? null,
      },
    });

    if (lotId) {
      const lot = await prisma.stockLot.findFirst({ where: { id: lotId }, select: { status: true } });
      if (lot) {
        const nextStatus = lotStatusAfterCheck(passed, lot.status);
        if (nextStatus !== lot.status) {
          await prisma.stockLot.update({ where: { id: lotId }, data: { status: nextStatus } });
        }
      }
    }
  } catch {
    return fail(ar ? "تعذّر تسجيل نتيجة الفحص" : "could not record the check result");
  }

  if (!passed) {
    await ok(ar ? "فشل الفحص — تم إيقاف الدفعة (إن وُجدت)" : "Check FAILED — lot quarantined (if one was given)");
  } else {
    await ok(ar ? "تم تسجيل نجاح الفحص" : "Check recorded — passed");
  }
}
