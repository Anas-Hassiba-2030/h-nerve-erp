"use server";

// Server actions for /hr/payroll (hnerve-gap-map.md "HR" row, HRM half).
// runPayrollAction posts one JournalEntry for the whole run (Salary
// Expense debit / Treasury credit) — idempotent per (tenantId,
// periodYear, periodMonth), checked here before calling the core so a
// second click for the same month is a clean no-op with a toast, not a
// unique-constraint error.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { runPayroll } from "@/lib/hr/payroll";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

export async function runPayrollAction(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط" : "No active tenant" });
    return;
  }

  const treasuryId = String(formData.get("treasuryId") ?? "");
  if (!treasuryId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اختر خزينة للصرف منها" : "Select a treasury to pay from" });
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const existing = await prisma.payrollRun.findUnique({
    where: { tenantId_periodYear_periodMonth: { tenantId, periodYear: year, periodMonth: month } },
  });
  if (existing) {
    await flashToast({ type: "info", entity: "info", label: ar ? "تم تشغيل مسير رواتب هذا الشهر بالفعل" : "Payroll has already run for this month" });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      return runPayroll(t, { tenantId, year, month, treasuryId });
    });
    await flashToast({
      type: "info",
      entity: "info",
      label: !result
        ? ar
          ? "لا موظفين نشطين لتشغيل الرواتب لهم"
          : "No active employees to run payroll for"
        : ar
          ? `تم صرف رواتب ${result.employeeCount} موظف بإجمالي ${result.total.toFixed(2)}`
          : `Paid ${result.employeeCount} employee(s), total ${result.total.toFixed(2)}`,
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر تشغيل الرواتب" : "Could not run payroll" });
    return;
  }

  revalidatePath("/hr/payroll");
  revalidatePath("/statements");
}
