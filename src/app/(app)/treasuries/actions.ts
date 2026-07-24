"use server";

// Server actions for /treasuries (Phase 27 — hnerve-gap-map.md "Payments"
// row). A treasury is a cash box or bank account; creating one bootstraps
// its own LedgerAccount in the same transaction so payments post real
// double-entry immediately. Mirrors admin/warehouses' action conventions.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { reportError } from "@/lib/observability/report";
import { ensureLedgerAccount } from "@/lib/finance/invoicing";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

export async function createTreasury(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لإضافة خزينة له" : "No active tenant to add a treasury to",
    });
    return;
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const type = String(formData.get("type") ?? "CASH").trim().toUpperCase();
  const currency = String(formData.get("currency") ?? "JOD").trim().slice(0, 3).toUpperCase() || "JOD";
  const accountCode = String(formData.get("accountCode") ?? "").trim().slice(0, 20);

  if (!name || !accountCode) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "الاسم ورمز الحساب مطلوبان" : "Name and account code are required",
    });
    return;
  }
  if (!["CASH", "BANK"].includes(type)) {
    await flashToast({ type: "info", entity: "info", label: ar ? "نوع غير صالح" : "Invalid type" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const ledgerAccount = await ensureLedgerAccount(t, tenantId, accountCode, name, "ASSET");
      await t.treasury.create({
        data: { tenantId, name, type, currency, accountCode, ledgerAccountId: ledgerAccount.id },
      });
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // P2002 is a unique-constraint hit: the operator reused an account code.
    // That is expected user error with a clear message below, not an incident
    // — reporting it would bury real faults in noise.
    if (code !== "P2002") {
      reportError("treasury.create failed", err, { tenantId, accountCode, userId: user.id });
    }
    await flashToast({
      type: "info",
      entity: "info",
      label:
        code === "P2002"
          ? ar
            ? `رمز الحساب ${accountCode} مستخدم بالفعل`
            : `account code ${accountCode} is already in use`
          : ar
            ? "تعذر إنشاء الخزينة"
            : "Could not create the treasury",
    });
    return;
  }

  revalidatePath("/treasuries");
  redirect("/treasuries");
}

export async function deleteTreasury(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [inCount, outCount] = await Promise.all([
    prisma.payment.count({ where: { treasuryId: id } }),
    prisma.supplierPayment.count({ where: { treasuryId: id } }),
  ]);
  const held = inCount + outCount;
  if (held > 0) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? `لا يمكن الحذف: للخزينة ${held} عملية دفع`
        : `cannot delete: treasury has ${held} payment(s)`,
    });
    return;
  }

  await prisma.treasury.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  await flashToast({ type: "info", entity: "info", label: ar ? "تم حذف الخزينة" : "Treasury deleted" });
  revalidatePath("/treasuries");
}
