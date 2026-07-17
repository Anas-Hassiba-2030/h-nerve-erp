"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export async function createLeaveRequest(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";

  const employeeId = String(formData.get("employeeId") ?? "");
  const type = String(formData.get("type") ?? "ANNUAL");
  const startDate = new Date(String(formData.get("startDate") ?? ""));
  const endDate = new Date(String(formData.get("endDate") ?? ""));
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000) || null;

  if (!employeeId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات الإجازة غير مكتملة" : "Leave request is missing required fields" });
    return;
  }
  if (endDate < startDate) {
    await flashToast({ type: "info", entity: "info", label: ar ? "تاريخ الانتهاء قبل تاريخ البدء" : "End date is before start date" });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    await flashToast({ type: "info", entity: "info", label: ar ? "الموظف غير موجود" : "Employee not found" });
    return;
  }

  await prisma.leaveRequest.create({
    data: {
      tenantId: employee.tenantId,
      employeeId,
      type,
      startDate,
      endDate,
      days: daysBetween(startDate, endDate),
      note,
    },
  });

  revalidatePath("/hr/leave");
  redirect("/hr/leave");
}

export async function decideLeaveRequest(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["APPROVED", "REJECTED"].includes(decision)) return;

  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave || leave.status !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({ where: { id }, data: { status: decision } });
    if (decision === "APPROVED") {
      await tx.employee.update({ where: { id: leave.employeeId }, data: { status: "ON_LEAVE" } });
    }
  });

  await flashToast({
    type: "info",
    entity: "info",
    label:
      decision === "APPROVED"
        ? ar ? "تمت الموافقة على الإجازة" : "Leave request approved"
        : ar ? "تم رفض الإجازة" : "Leave request rejected",
  });
  revalidatePath("/hr/leave");
}
