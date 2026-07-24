"use server";

// Server actions for /payments (Phase 27 — hnerve-gap-map.md "Payments"
// row). createPayment posts through lib/finance/invoicing.ts postPayment
// (Treasury debit / AR credit), then recomputes the applied invoice's
// status (UNPAID → PARTIAL → PAID/OVERPAID) from the real sum of payments
// against it — never trusts a client-sent status. No update/delete
// action: payments are immutable once posted (see the model comment).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { reportError } from "@/lib/observability/report";
import { postPayment, getInvoicePaidTotal, statusForPaid } from "@/lib/finance/invoicing";

const paymentSchema = z.object({
  customerId: z.string().trim().min(1),
  invoiceId: z.string().trim().optional().or(z.literal("")),
  treasuryId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().default("JOD"),
  method: z.string().trim().default("CASH"),
  paidAt: z.string().trim().optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function createPayment(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لتسجيل دفعة له" : "No active tenant to record a payment against",
    });
    return;
  }

  const parsed = paymentSchema.safeParse({
    customerId: formData.get("customerId"),
    invoiceId: formData.get("invoiceId") ?? "",
    treasuryId: formData.get("treasuryId"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "JOD",
    method: formData.get("method") || "CASH",
    paidAt: formData.get("paidAt"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "بيانات الدفعة غير صالحة" : "Invalid payment data",
    });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;

      if (data.invoiceId) {
        const invoice = await t.invoice.findUniqueOrThrow({ where: { id: data.invoiceId } });
        if (invoice.tenantId !== tenantId) throw new Error("Cross-tenant invoice");
        if (invoice.customerId !== data.customerId) throw new Error("Invoice belongs to a different customer");
      }

      await postPayment(t, {
        tenantId,
        customerId: data.customerId,
        invoiceId: data.invoiceId || null,
        treasuryId: data.treasuryId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
        note: data.note,
      });

      if (data.invoiceId) {
        const invoice = await t.invoice.findUniqueOrThrow({ where: { id: data.invoiceId } });
        const paidTotal = await getInvoicePaidTotal(t, data.invoiceId);
        const status = statusForPaid(Number(invoice.total), paidTotal);
        await t.invoice.update({ where: { id: data.invoiceId }, data: { status } });
      }
    });
  } catch (err) {
    reportError("payment.record failed", err, {
      tenantId,
      invoiceId: data.invoiceId,
      userId: user.id,
    });
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر تسجيل الدفعة. حاول مرة أخرى."
        : `Could not record the payment${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/treasuries");
  redirect("/payments");
}
