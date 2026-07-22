"use server";

// Server actions for /admin/cost-centers (docs/HOURANI-ERP-GAPS.md #2 🔴
// — the analytic dimension on JournalLine). Mirrors treasuries/actions.ts.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

export async function createCostCenter(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();

  const code = String(formData.get("code") ?? "").trim().slice(0, 20);
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!code || !name) {
    await flashToast({ type: "info", entity: "info", label: ar ? "الرمز والاسم مطلوبان" : "Code and name are required" });
    return;
  }

  try {
    await prisma.costCenter.create({ data: { tenantId, code, name } });
  } catch (err) {
    const dbCode = (err as { code?: string })?.code;
    await flashToast({
      type: "info",
      entity: "info",
      label:
        dbCode === "P2002"
          ? ar
            ? `الرمز ${code} مستخدم بالفعل`
            : `code ${code} is already in use`
          : ar
            ? "تعذّر إنشاء مركز التكلفة"
            : "Could not create the cost centre",
    });
    return;
  }

  revalidatePath("/admin/cost-centers");
}

export async function deleteCostCenter(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const used = await prisma.journalLine.count({ where: { costCenterId: id } });
  if (used > 0) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? `لا يمكن الحذف: مستخدم في ${used} قيداً` : `cannot delete: used on ${used} journal line(s)`,
    });
    return;
  }

  await prisma.costCenter.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  revalidatePath("/admin/cost-centers");
}
