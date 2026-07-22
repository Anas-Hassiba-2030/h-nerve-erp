"use server";

// Server actions for /admin/recurring-invoices (docs/HOURANI-ERP-GAPS.md
// #11 ⚪ — relevant if the incubator charges programme fees monthly).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { flashToast } from "@/lib/utils/toast";
import { computeNextRunDate, runDueRecurringInvoices, clampDayOfMonth } from "@/lib/finance/recurring";

const PATH = "/admin/recurring-invoices";

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

export async function createRecurringInvoice(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  const customerId = String(formData.get("customerId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const amount = Number(formData.get("amount") ?? 0);
  const dayOfMonthRaw = Number(formData.get("dayOfMonth") ?? 1);

  if (!customerId || !description) return fail(ar ? "العميل والوصف مطلوبان" : "customer and description are required");
  if (!Number.isFinite(amount) || amount <= 0) return fail(ar ? "المبلغ يجب أن يكون أكبر من صفر" : "amount must be greater than zero");
  if (!Number.isFinite(dayOfMonthRaw)) return fail(ar ? "يوم الشهر غير صالح" : "invalid day of month");

  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } });
  if (!customer) return fail(ar ? "العميل غير موجود" : "customer not found");

  const dayOfMonth = clampDayOfMonth(dayOfMonthRaw);
  await prisma.recurringInvoiceTemplate.create({
    data: {
      tenantId,
      customerId,
      description,
      amount,
      dayOfMonth,
      nextRunDate: computeNextRunDate(new Date(), dayOfMonth),
    },
  });

  await ok(ar ? "تم إنشاء الفاتورة الدورية" : "Recurring invoice created");
}

export async function toggleRecurringInvoice(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();
  const id = String(formData.get("id") ?? "").trim();

  const template = await prisma.recurringInvoiceTemplate.findFirst({ where: { id, tenantId, deletedAt: null } });
  if (!template) return fail(ar ? "غير موجود" : "not found");

  await prisma.recurringInvoiceTemplate.update({ where: { id }, data: { active: !template.active } });
  await ok(template.active ? (ar ? "تم الإيقاف" : "Paused") : (ar ? "تم التفعيل" : "Activated"));
}

export async function runRecurringInvoicesNow(): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  let posted = 0;
  try {
    const result = await prisma.$transaction((tx) =>
      runDueRecurringInvoices(tx as unknown as typeof prisma, { tenantId }),
    );
    posted = result.posted;
  } catch (e) {
    console.error("runRecurringInvoicesNow failed", e);
    return fail(ar ? "تعذّر تشغيل الفواتير الدورية" : "could not run recurring invoices");
  }

  await ok(
    posted === 0
      ? (ar ? "لا فواتير مستحقة اليوم" : "No invoices due today")
      : ar
        ? `تم إصدار ${posted} فاتورة`
        : `Posted ${posted} invoice${posted === 1 ? "" : "s"}`,
  );
}
