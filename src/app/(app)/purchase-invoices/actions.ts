"use server";

// Server actions for /purchase-invoices (Phase 27 — hnerve-gap-map.md
// "Purchases" row, mirror of /invoices against Supplier). Posts through
// lib/finance/purchasing.ts (Purchases/COGS debit, AP credit).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { lineInputSchema, computeLineTotals, postPurchaseInvoiceFromComputed } from "@/lib/finance/purchasing";

const purchaseInvoiceSchema = z.object({
  supplierId: z.string().trim().min(1),
  issueDate: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  currency: z.string().trim().default("JOD"),
  note: z.string().trim().max(2000).optional(),
  lines: z.array(lineInputSchema).min(1),
});

export async function createPurchaseInvoice(formData: FormData): Promise<void> {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لتسجيل فاتورة مشتريات له" : "No active tenant to bill a purchase against",
    });
    return;
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(String(formData.get("linesJson") ?? "[]"));
  } catch {
    linesRaw = [];
  }

  const parsed = purchaseInvoiceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    currency: formData.get("currency") || "JOD",
    note: formData.get("note") ?? "",
    lines: linesRaw,
  });

  if (!parsed.success) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "بيانات فاتورة المشتريات غير صالحة" : "Invalid purchase invoice data",
    });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const computed = await computeLineTotals(t, tenantId, data.lines);
      await postPurchaseInvoiceFromComputed(t, {
        tenantId,
        supplierId: data.supplierId,
        currency: data.currency,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        note: data.note,
        computed,
      });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر تسجيل فاتورة المشتريات. حاول مرة أخرى."
        : `Could not create the purchase invoice${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  revalidatePath("/purchase-invoices");
  redirect("/purchase-invoices");
}

export async function deletePurchaseInvoice(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await prisma.purchaseInvoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر حذف فاتورة المشتريات" : "Could not delete the purchase invoice",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حذف فاتورة المشتريات" : "Purchase invoice deleted",
  });
  revalidatePath("/purchase-invoices");
}
