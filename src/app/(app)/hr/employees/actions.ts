"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { nextDocNumber } from "@/lib/finance/invoicing";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

function readFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200) || null;
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const department = String(formData.get("department") ?? "").trim().slice(0, 80) || null;
  const position = String(formData.get("position") ?? "").trim().slice(0, 80) || null;
  const baseSalary = Number(formData.get("baseSalary") ?? 0) || 0;
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000) || null;
  return { name, email, phone, department, position, baseSalary, note };
}

export async function createEmployee(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط لإضافة موظف له" : "No active tenant to add an employee to" });
    return;
  }

  const { name, email, phone, department, position, baseSalary, note } = readFields(formData);
  if (!name) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اسم الموظف مطلوب" : "Employee name is required" });
    return;
  }
  if (baseSalary < 0) {
    await flashToast({ type: "info", entity: "info", label: ar ? "الراتب لا يمكن أن يكون سالباً" : "Salary cannot be negative" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const employeeNumber = await nextDocNumber(t, tenantId, "EMPLOYEE", "EMP-");
      await tx.employee.create({
        data: { tenantId, employeeNumber, name, email, phone, department, position, baseSalary, note },
      });
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    await flashToast({
      type: "info",
      entity: "info",
      label:
        code === "P2002"
          ? ar ? "رقم الموظف مستخدم بالفعل" : "That employee number is already in use"
          : ar ? "تعذر إنشاء الموظف" : "Could not create the employee",
    });
    return;
  }

  revalidatePath("/hr/employees");
  redirect("/hr/employees");
}

export async function updateEmployee(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { name, email, phone, department, position, baseSalary, note } = readFields(formData);
  if (!name) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اسم الموظف مطلوب" : "Employee name is required" });
    return;
  }

  try {
    await prisma.employee.update({
      where: { id },
      data: { name, email, phone, department, position, baseSalary, note },
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر تحديث الموظف" : "Could not update the employee" });
    return;
  }

  revalidatePath("/hr/employees");
  redirect("/hr/employees");
}

export async function terminateEmployee(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.employee.update({
    where: { id },
    data: { status: "TERMINATED", terminationDate: new Date() },
  });
  await flashToast({ type: "info", entity: "info", label: ar ? "تم إنهاء خدمة الموظف" : "Employee terminated" });
  revalidatePath("/hr/employees");
}

export async function deleteEmployee(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payslipCount = await prisma.payslip.count({ where: { employeeId: id } });
  if (payslipCount > 0) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? `لا يمكن الحذف: للموظف ${payslipCount} كشف راتب` : `cannot delete: employee has ${payslipCount} payslip(s)`,
    });
    return;
  }

  await prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
  await flashToast({ type: "info", entity: "info", label: ar ? "تم حذف الموظف" : "Employee deleted" });
  revalidatePath("/hr/employees");
}
