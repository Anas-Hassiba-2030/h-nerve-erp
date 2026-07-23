"use server";

// Server actions for /admin/fx (docs/HOURANI-ERP-GAPS.md #4 🔴 —
// multi-currency + FX revaluation).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { flashToast } from "@/lib/utils/toast";
import { setExchangeRate, runFxRevaluation } from "@/lib/finance/fx";

const PATH = "/admin/fx";

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
async function tenant(): Promise<string> {
  return ((await getActiveTenantSlug()) ?? "hourani-hotels").slice(0, 64);
}

export async function addExchangeRate(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  const currency = String(formData.get("currency") ?? "").trim().toUpperCase().slice(0, 8);
  const rate = Number(formData.get("rate") ?? 0);
  const asOfRaw = String(formData.get("asOf") ?? "").trim();

  if (!currency || currency === "JOD") return fail(ar ? "عملة غير صالحة" : "invalid currency");
  if (!Number.isFinite(rate) || rate <= 0) return fail(ar ? "السعر يجب أن يكون أكبر من صفر" : "rate must be greater than zero");
  const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
  if (Number.isNaN(asOf.getTime())) return fail(ar ? "تاريخ غير صالح" : "invalid date");

  await setExchangeRate(prisma, { tenantId, currency, rate, asOf });
  await ok(ar ? "تم حفظ سعر الصرف" : "Exchange rate saved");
}

export async function runRevaluationNow(): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  let result: Awaited<ReturnType<typeof runFxRevaluation>> | null = null;
  try {
    result = await prisma.$transaction((tx) => runFxRevaluation(tx as unknown as typeof prisma, { tenantId }));
  } catch (e) {
    console.error("runRevaluationNow failed", e);
    return fail(ar ? "تعذّر تشغيل إعادة التقييم" : "could not run revaluation");
  }

  if (result.posted === 0) {
    return ok(ar ? "لا فروقات صرف لهذه الفترة" : "No FX movement to post this period");
  }
  await ok(
    ar
      ? `تم ترحيل ${result.posted} فاتورة، صافي ${result.totalGainLoss >= 0 ? "ربح" : "خسارة"} ${Math.abs(result.totalGainLoss)} د.أ`
      : `Revalued ${result.posted} invoice${result.posted === 1 ? "" : "s"}, net ${result.totalGainLoss >= 0 ? "gain" : "loss"} JOD ${Math.abs(result.totalGainLoss)}`,
  );
}
