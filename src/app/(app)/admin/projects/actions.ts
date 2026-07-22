"use server";

// Server actions for /admin/projects — project accounting / timesheets
// (docs/HOURANI-ERP-GAPS.md #9 🟠, the last item on the ranked build
// order). Distinct from /projects (FutureProject, the strategic idea
// board) — see prisma/schema/projects.prisma's header. Deliberately
// NOT wired into the ledger this phase: a computed budget-vs-actual
// read from logged TimesheetEntry hours + ProjectExpense lines
// (lib/projects/projects.ts).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { flashToast } from "@/lib/utils/toast";
import { hourlyRateFromMonthlySalary } from "@/lib/hr/attendance";

const PATH = "/admin/projects";

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

export async function createProjectAcct(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  const code = String(formData.get("code") ?? "").trim().slice(0, 40);
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  const budget = Number(formData.get("budget") ?? 0);
  const status = String(formData.get("status") ?? "PLANNING").trim().toUpperCase();
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();

  if (!code || !name) return fail(ar ? "الرمز والاسم مطلوبان" : "code and name are required");
  if (!Number.isFinite(budget) || budget < 0) return fail(ar ? "الميزانية غير صالحة" : "invalid budget");
  const VALID_STATUS = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
  if (!VALID_STATUS.includes(status)) return fail(ar ? "حالة غير صالحة" : "invalid status");

  try {
    await prisma.project.create({
      data: {
        tenantId,
        code,
        name,
        description,
        budget,
        status,
        startDate: startDateRaw ? new Date(startDateRaw) : null,
        endDate: endDateRaw ? new Date(endDateRaw) : null,
      },
    });
  } catch (e) {
    console.error("createProjectAcct failed", e);
    return fail(ar ? "تعذّر إنشاء المشروع — تحقّق من الرمز" : "could not create project — check the code is unique");
  }

  await ok(ar ? "تم إنشاء المشروع" : "Project created");
}

export async function logTimesheetEntry(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  const projectId = String(formData.get("projectId") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const hours = Number(formData.get("hours") ?? 0);
  const billable = formData.get("billable") === "on";
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const rateOverrideRaw = String(formData.get("hourlyRate") ?? "").trim();

  if (!projectId || !employeeId || !dateRaw) {
    return fail(ar ? "المشروع والموظف والتاريخ مطلوبة" : "project, employee, and date are required");
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return fail(ar ? "الساعات يجب أن تكون بين 0 و24" : "hours must be greater than 0 and at most 24");
  }

  const [project, employee] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null } }),
    prisma.employee.findFirst({ where: { id: employeeId, tenantId, deletedAt: null } }),
  ]);
  if (!project) return fail(ar ? "المشروع غير موجود" : "project not found");
  if (!employee) return fail(ar ? "الموظف غير موجود" : "employee not found");
  if (project.status !== "ACTIVE" && project.status !== "PLANNING") {
    return fail(ar ? "لا يمكن تسجيل ساعات على مشروع غير نشط" : "cannot log hours against a project that isn't active");
  }

  const hourlyRate = rateOverrideRaw
    ? Number(rateOverrideRaw)
    : hourlyRateFromMonthlySalary(Number(employee.baseSalary));
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return fail(ar ? "معدل الساعة غير صالح" : "invalid hourly rate");
  }

  await prisma.timesheetEntry.create({
    data: {
      tenantId,
      projectId,
      employeeId,
      date: new Date(dateRaw),
      hours,
      hourlyRate: rateOverrideRaw ? hourlyRate : null,
      billable,
      note,
    },
  });

  await ok(ar ? "تم تسجيل الساعات" : "Timesheet entry logged");
}

export async function logProjectExpense(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await tenant();

  const projectId = String(formData.get("projectId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const amount = Number(formData.get("amount") ?? 0);

  if (!projectId || !description) return fail(ar ? "المشروع والوصف مطلوبان" : "project and description are required");
  if (!Number.isFinite(amount) || amount <= 0) return fail(ar ? "المبلغ يجب أن يكون أكبر من صفر" : "amount must be greater than zero");

  const project = await prisma.project.findFirst({ where: { id: projectId, tenantId, deletedAt: null } });
  if (!project) return fail(ar ? "المشروع غير موجود" : "project not found");

  await prisma.projectExpense.create({
    data: { tenantId, projectId, description, amount },
  });

  await ok(ar ? "تم تسجيل المصروف" : "Expense logged");
}
