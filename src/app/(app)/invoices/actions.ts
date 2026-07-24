"use server";

// Server actions for /invoices (Phase 27 — docs/spec/ENTITY-ENGINE-PATTERN.md).
// createInvoice parses the form, computes line totals server-side, and posts
// through lib/finance/invoicing.ts — the shared core also used by
// estimates' convertToInvoice, so the two call sites can't drift.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { reportError } from "@/lib/observability/report";
import { lineInputSchema, computeLineTotals, postInvoiceFromComputed } from "@/lib/finance/invoicing";

const invoiceSchema = z.object({
  customerId: z.string().trim().min(1),
  issueDate: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  currency: z.string().trim().default("JOD"),
  note: z.string().trim().max(2000).optional(),
  lines: z.array(lineInputSchema).min(1),
});

export async function createInvoice(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لإصدار فاتورة له" : "No active tenant to invoice against",
    });
    return;
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(String(formData.get("linesJson") ?? "[]"));
  } catch {
    linesRaw = [];
  }

  const parsed = invoiceSchema.safeParse({
    customerId: formData.get("customerId"),
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
      label: ar ? "بيانات الفاتورة غير صالحة" : "Invalid invoice data",
    });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const computed = await computeLineTotals(t, tenantId, data.lines);
      await postInvoiceFromComputed(t, {
        tenantId,
        customerId: data.customerId,
        currency: data.currency,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        note: data.note,
        computed,
      });
    });
  } catch (err) {
    reportError("invoice.create failed", err, { tenantId, userId: user.id });
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر إنشاء الفاتورة. حاول مرة أخرى."
        : `Could not create the invoice${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (err) {
    reportError("invoice.delete failed", err, { invoiceId: id, userId: user.id });
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر حذف الفاتورة" : "Could not delete the invoice",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حذف الفاتورة" : "Invoice deleted",
  });
  revalidatePath("/invoices");
}
