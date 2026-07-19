"use server";

// Server actions for /purchase-payments — the payables mirror of
// /payments. createSupplierPayment posts through lib/finance/purchasing.ts
// postSupplierPayment (AP debit / Treasury credit), then recomputes the
// applied purchase invoice's status (UNPAID → PARTIAL → PAID/OVERPAID)
// from the real sum of payments against it — never trusts a client-sent
// status. No update/delete action: payments are immutable once posted.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import {
  postSupplierPayment,
  getPurchaseInvoicePaidTotal,
  statusForPaid,
} from "@/lib/finance/purchasing";

const supplierPaymentSchema = z.object({
  supplierId: z.string().trim().min(1),
  purchaseInvoiceId: z.string().trim().optional().or(z.literal("")),
  treasuryId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().default("JOD"),
  method: z.string().trim().default("CASH"),
  paidAt: z.string().trim().optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function createSupplierPayment(formData: FormData): Promise<void> {
  await requireUser();
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

  const parsed = supplierPaymentSchema.safeParse({
    supplierId: formData.get("supplierId"),
    purchaseInvoiceId: formData.get("purchaseInvoiceId") ?? "",
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

      if (data.purchaseInvoiceId) {
        const inv = await t.purchaseInvoice.findUniqueOrThrow({ where: { id: data.purchaseInvoiceId } });
        if (inv.tenantId !== tenantId) throw new Error("Cross-tenant purchase invoice");
        if (inv.supplierId !== data.supplierId) throw new Error("Purchase invoice belongs to a different supplier");
      }

      await postSupplierPayment(t, {
        tenantId,
        supplierId: data.supplierId,
        purchaseInvoiceId: data.purchaseInvoiceId || null,
        treasuryId: data.treasuryId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
        note: data.note,
      });

      if (data.purchaseInvoiceId) {
        const inv = await t.purchaseInvoice.findUniqueOrThrow({ where: { id: data.purchaseInvoiceId } });
        const paidTotal = await getPurchaseInvoicePaidTotal(t, data.purchaseInvoiceId);
        const status = statusForPaid(Number(inv.total), paidTotal);
        await t.purchaseInvoice.update({ where: { id: data.purchaseInvoiceId }, data: { status } });
      }
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر تسجيل الدفعة. حاول مرة أخرى."
        : `Could not record the payment${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  revalidatePath("/purchase-payments");
  revalidatePath("/purchase-invoices");
  revalidatePath("/treasuries");
  redirect("/purchase-payments");
}
