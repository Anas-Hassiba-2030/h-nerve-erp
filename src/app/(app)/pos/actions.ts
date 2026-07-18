"use server";

// Server actions for /pos (Phase 27 — hnerve-gap-map.md "POS" row).
// Cash-session open/close + checkout/void. Checkout posts through
// lib/pos/pos.ts — the SOLD movements + Treasury/Revenue JournalEntry
// happen in one transaction.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { openCashSession, closeCashSession, completePosSale, voidPosSale } from "@/lib/pos/pos";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER", "STAFF"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

const openSchema = z.object({
  treasuryId: z.string().trim().min(1),
  openingFloat: z.coerce.number().min(0),
});

export async function openSession(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط" : "No active tenant" });
    return;
  }

  const parsed = openSchema.safeParse({
    treasuryId: formData.get("treasuryId"),
    openingFloat: formData.get("openingFloat") || 0,
  });
  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات الجلسة غير صالحة" : "Invalid session data" });
    return;
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      await openCashSession(t, { tenantId, treasuryId: data.treasuryId, openingFloat: data.openingFloat, userId: user.id });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر فتح جلسة الصندوق"
        : `Could not open the cash session${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم فتح جلسة الصندوق" : "Cash session opened" });
  revalidatePath("/pos");
  redirect("/pos");
}

const closeSchema = z.object({
  sessionId: z.string().trim().min(1),
  closingCash: z.coerce.number().min(0),
});

export async function closeSession(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) return;

  const parsed = closeSchema.safeParse({
    sessionId: formData.get("sessionId"),
    closingCash: formData.get("closingCash") || 0,
  });
  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات الإغلاق غير صالحة" : "Invalid close data" });
    return;
  }
  const data = parsed.data;

  let result: { variance: unknown };
  try {
    result = await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      return closeCashSession(t, { tenantId, sessionId: data.sessionId, closingCash: data.closingCash, userId: user.id });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر إغلاق جلسة الصندوق"
        : `Could not close the cash session${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? `تم إغلاق الجلسة — الفرق ${result.variance}` : `Session closed — variance ${result.variance}`,
  });
  revalidatePath("/pos");
}

const saleLineSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
});

const saleSchema = z.object({
  sessionId: z.string().trim().min(1),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
  discountTotal: z.coerce.number().min(0).optional(),
  taxTotal: z.coerce.number().min(0).optional(),
  lines: z.array(saleLineSchema).min(1),
});

export async function checkout(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  if (!tenantId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد مستأجر نشط" : "No active tenant" });
    return;
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(String(formData.get("linesJson") ?? "[]"));
  } catch {
    linesRaw = [];
  }

  const parsed = saleSchema.safeParse({
    sessionId: formData.get("sessionId"),
    paymentMethod: formData.get("paymentMethod") || "CASH",
    discountTotal: formData.get("discountTotal") || 0,
    taxTotal: formData.get("taxTotal") || 0,
    lines: linesRaw,
  });
  if (!parsed.success) {
    await flashToast({ type: "info", entity: "info", label: ar ? "بيانات البيع غير صالحة" : "Invalid sale data" });
    return;
  }
  const data = parsed.data;

  let result: { saleNumber: string; total: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      return completePosSale(t, {
        tenantId,
        sessionId: data.sessionId,
        lines: data.lines,
        paymentMethod: data.paymentMethod,
        discountTotal: data.discountTotal,
        taxTotal: data.taxTotal,
        userId: user.id,
      });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر إتمام عملية البيع"
        : `Could not complete the sale${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? `تم البيع ${result.saleNumber}: ${result.total}` : `Sale ${result.saleNumber} completed: ${result.total}`,
  });
  revalidatePath("/pos");
  revalidatePath("/statements");
}

export async function voidSale(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !tenantId || !reason) {
    await flashToast({ type: "info", entity: "info", label: ar ? "سبب الإلغاء مطلوب" : "Void reason is required" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const t = tx as unknown as typeof prisma;
      await voidPosSale(t, { tenantId, saleId: id, reason, userId: user.id });
    });
  } catch (err) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? "تعذر إلغاء عملية البيع"
        : `Could not void the sale${err instanceof Error && err.message.length < 120 ? `: ${err.message}` : ""}`,
    });
    return;
  }

  await flashToast({ type: "info", entity: "info", label: ar ? "تم إلغاء عملية البيع" : "Sale voided" });
  revalidatePath("/pos");
  revalidatePath("/statements");
}
