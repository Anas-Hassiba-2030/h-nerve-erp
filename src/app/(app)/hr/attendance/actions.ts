"use server";

// Server actions for /hr/attendance (docs/HOURANI-ERP-GAPS.md #7 🟠).
// clockIn/clockOut upsert ONE Attendance row per (employee, day) — a
// second clock-in the same day updates the same row rather than
// creating a duplicate shift's worth of hours. Overtime computed from
// these rows feeds PayrollRun via lib/hr/payroll.ts, not here — this
// file only ever writes Attendance/Shift/ShiftAssignment rows.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { isLateClockIn } from "@/lib/hr/attendance";

const PATH = "/hr/attendance";

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
function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export async function createShift(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!name) return fail(ar ? "الاسم مطلوب" : "name is required");
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
    return fail(ar ? "صيغة الوقت يجب أن تكون HH:MM" : "time must be in HH:MM format");
  }

  const tenantId = await tenant();
  try {
    await prisma.shift.create({ data: { tenantId, name, startTime, endTime } });
  } catch {
    return fail(ar ? `الاسم "${name}" مستخدم بالفعل` : `name "${name}" is already in use`);
  }
  await ok(ar ? "تمت إضافة الوردية" : "Shift added");
}

export async function assignShift(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const shiftId = String(formData.get("shiftId") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  if (!employeeId || !shiftId || !dateRaw) {
    return fail(ar ? "الموظف والوردية والتاريخ مطلوبة" : "employee, shift, and date are required");
  }
  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) return fail(ar ? "تاريخ غير صالح" : "invalid date");

  const tenantId = await tenant();
  try {
    // A re-assignment for the same employee/day REPLACES the prior shift
    // rather than stacking a second one — one shift per person per day.
    await prisma.shiftAssignment.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { tenantId, employeeId, shiftId, date },
      update: { shiftId },
    });
  } catch {
    return fail(ar ? "تعذّر تعيين الوردية" : "could not assign the shift");
  }
  await ok(ar ? "تم تعيين الوردية" : "Shift assigned");
}

export async function clockIn(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  if (!employeeId) return fail(ar ? "الموظف مطلوب" : "employee is required");

  const tenantId = await tenant();
  const date = todayUtcMidnight();
  const now = new Date();

  const assignment = await prisma.shiftAssignment.findUnique({
    where: { employeeId_date: { employeeId, date } },
    include: { shift: true },
  });
  const status = assignment && isLateClockIn(now, assignment.shift.startTime) ? "LATE" : "PRESENT";

  try {
    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { tenantId, employeeId, date, clockIn: now, status },
      update: { clockIn: now, status },
    });
  } catch {
    return fail(ar ? "تعذّر تسجيل الحضور" : "could not clock in");
  }
  await ok(ar ? "تم تسجيل الحضور" : "Clocked in");
}

export async function clockOut(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  if (!employeeId) return fail(ar ? "الموظف مطلوب" : "employee is required");

  const date = todayUtcMidnight();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (!existing || !existing.clockIn) {
    return fail(ar ? "لم يسجَّل حضور اليوم بعد" : "no clock-in recorded today yet");
  }

  try {
    await prisma.attendance.update({
      where: { employeeId_date: { employeeId, date } },
      data: { clockOut: now },
    });
  } catch {
    return fail(ar ? "تعذّر تسجيل الانصراف" : "could not clock out");
  }
  await ok(ar ? "تم تسجيل الانصراف" : "Clocked out");
}
