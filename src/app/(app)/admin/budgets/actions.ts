"use server";

// Server actions for /admin/budgets — budgeting/forecasting against the
// ledger (docs/HOURANI-ERP-GAPS.md #10 ⚪). Sets an ANNUAL budget per
// ledger account; /statements reads it back to show budget-vs-actual on
// the income statement.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { flashToast } from "@/lib/utils/toast";

const PATH = "/admin/budgets";

async function gate() {
  const user = await getCurrentUser();
  if (!hasRole(user, "MANAGER")) throw new Error("forbidden");
  return user;
}
async function ok(label: string) {
  await flashToast({ type: "info", entity: "info", label });
  revalidatePath(PATH);
  revalidatePath("/statements");
}
async function fail(label: string) {
  await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath(PATH);
}
async function tenant(): Promise<string> {
  return ((await getActiveTenantSlug()) ?? "hourani-hotels").slice(0, 64);
}

export async function setBudget(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  const accountCode = String(formData.get("accountCode") ?? "").trim();
  const year = Number(formData.get("year") ?? 0);
  const amount = Number(formData.get("amount") ?? 0);

  if (!accountCode) return fail(ar ? "الحساب مطلوب" : "account is required");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(ar ? "سنة غير صالحة" : "invalid year");
  if (!Number.isFinite(amount) || amount < 0) return fail(ar ? "المبلغ غير صالح" : "invalid amount");

  const account = await prisma.ledgerAccount.findFirst({ where: { code: accountCode, tenantId } });
  if (!account) return fail(ar ? "الحساب غير موجود" : "account not found");

  await prisma.budget.upsert({
    where: { tenantId_accountCode_year: { tenantId, accountCode, year } },
    create: { tenantId, accountCode, year, amount },
    update: { amount },
  });

  await ok(ar ? "تم حفظ الميزانية" : "Budget saved");
}

export async function deleteBudget(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return fail(ar ? "معرّف غير صالح" : "invalid id");

  const budget = await prisma.budget.findFirst({ where: { id, tenantId } });
  if (!budget) return fail(ar ? "الميزانية غير موجودة" : "budget not found");

  await prisma.budget.delete({ where: { id } });
  await ok(ar ? "تم حذف الميزانية" : "Budget removed");
}
