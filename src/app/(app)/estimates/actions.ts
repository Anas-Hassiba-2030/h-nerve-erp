"use server";

// Server actions for /estimates (Phase 27 — docs/spec/ENTITY-ENGINE-PATTERN.md,
// hnerve-gap-map.md build order #4). Same shape as Invoice, no journal
// posting (a quote is not an accounting event). convertToInvoice reuses the
// shared core in lib/finance/invoicing.ts — the same code path invoices'
// createInvoice uses — so a converted estimate posts identically to a
// hand-created invoice.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import {
  lineInputSchema,
  computeLineTotals,
  postInvoiceFromComputed,
  nextDocNumber,
} from "@/lib/finance/invoicing";

const estimateSchema = z.object({
  customerId: z.string().trim().min(1),
  issueDate: z.string().trim().optional(),
  expiryDate: z.string().trim().optional(),
  currency: z.string().trim().default("JOD"),
  note: z.string().trim().max(2000).optional(),
  lines: z.array(lineInputSchema).min(1),
});

export async function createEstimate(formData: FormData): Promise<void> {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لإنشاء عرض سعر له" : "No active tenant to create an estimate for",
    });
    return;
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(String(formData.get("linesJson") ?? "[]"));
  } catch {
    linesRaw = [];
  }

  const parsed = estimateSchema.safeParse({
    customerId: formData.get("customerId"),
    issueDate: formData.get("issueDate"),
    expiryDate: formData.get("expiryDate"),
    currency: formData.get("currency") || "JOD",
    note: formData.get("note") ?? "",
    lines: linesRaw,
  });

  if (!parsed.success) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "بيانات عرض السعر غير صالحة" : "Invalid estimate data",
    });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const computed = await computeLineTotals(t, tenantId, data.lines);
      const estimateNumber = await nextDocNumber(t, tenantId, "ESTIMATE", "EST-");

      await t.estimate.create({
        data: {
          tenantId,
          estimateNumber,
          customerId: data.customerId,
          status: "DRAFT",
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          currency: data.currency,
          subtotal: computed.subtotal,
          taxTotal: computed.taxTotal,
          total: computed.total,
          note: data.note || null,
          lines: {
            create: computed.linesWithTax.map((l) => ({
              productId: l.productId || null,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxRateId: l.taxRateId || null,
              lineTotal: l.lineTotal + l.tax,
            })),
          },
        },
      });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر إنشاء عرض السعر. حاول مرة أخرى."
        : `Could not create the estimate${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  revalidatePath("/estimates");
  redirect("/estimates");
}

export async function deleteEstimate(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await prisma.estimate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذر حذف عرض السعر" : "Could not delete the estimate",
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حذف عرض السعر" : "Estimate deleted",
  });
  revalidatePath("/estimates");
}

export async function convertToInvoice(formData: FormData): Promise<void> {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  const id = String(formData.get("id") ?? "");
  if (!id || !tenantId) return;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!estimate || estimate.deletedAt) {
    await flashToast({ type: "info", entity: "info", label: ar ? "عرض السعر غير موجود" : "Estimate not found" });
    return;
  }
  if (estimate.status === "CONVERTED") {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تم تحويل عرض السعر مسبقاً" : "This estimate was already converted",
    });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      const rawLines = estimate.lines.map((l) => ({
        productId: l.productId ?? "",
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRateId: l.taxRateId ?? "",
      }));
      const computed = await computeLineTotals(t, tenantId, rawLines);
      const invoice = await postInvoiceFromComputed(t, {
        tenantId,
        customerId: estimate.customerId,
        currency: estimate.currency,
        note: estimate.note,
        computed,
      });
      await t.estimate.update({
        where: { id: estimate.id },
        data: { status: "CONVERTED", convertedInvoiceId: invoice.id },
      });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر تحويل عرض السعر إلى فاتورة"
        : `Could not convert the estimate${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  revalidatePath("/estimates");
  revalidatePath("/invoices");
  redirect("/invoices");
}
