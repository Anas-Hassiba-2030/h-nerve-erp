"use server";

// Server actions for /e-invoicing (Phase 27 — hnerve-gap-map.md
// "E-invoicing (gov)" row). Jordan JoFotara UNCERTIFIED v1 scaffold —
// see docs/compliance/JOFOTARA.md. saveSupplierProfile stores the
// tenant's tax config; generateEInvoice builds the local XML/TLV-QR
// record via lib/einvoicing/jofotara.ts. Neither ever calls a live
// ISTD endpoint.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { prepareEInvoice } from "@/lib/einvoicing/jofotara";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

const profileSchema = z.object({
  sellerName: z.string().trim().min(1).max(200),
  taxRegistrationNumber: z.string().trim().min(1).max(20),
  activityNumber: z.string().trim().min(1).max(40),
  incomeSourceSequence: z.string().trim().min(1).max(40),
});

export async function saveSupplierProfile(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط" : "No active tenant" });
    return;
  }

  const parsed = profileSchema.safeParse({
    sellerName: formData.get("sellerName"),
    taxRegistrationNumber: formData.get("taxRegistrationNumber"),
    activityNumber: formData.get("activityNumber"),
    incomeSourceSequence: formData.get("incomeSourceSequence"),
  });
  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات الملف الضريبي غير صالحة" : "Invalid tax profile data" });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.eInvoiceSupplierProfile.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: { ...data, deletedAt: null },
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر حفظ الملف الضريبي" : "Could not save the tax profile" });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم حفظ الملف الضريبي" : "Tax profile saved" });
  revalidatePath("/e-invoicing");
}

export async function generateEInvoice(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId || !tenantId) return;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      await prepareEInvoice(t, { tenantId, invoiceId });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر إنشاء الفاتورة الإلكترونية"
        : `Could not generate the e-invoice${err instanceof Error && err.message.length < 160 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم إنشاء سجل الفاتورة الإلكترونية (غير معتمد)" : "E-invoice record generated (uncertified)" });
  revalidatePath("/e-invoicing");
}
