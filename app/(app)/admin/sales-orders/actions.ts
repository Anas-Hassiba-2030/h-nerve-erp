"use server";

// Server actions for /admin/sales-orders (Phase 6). Mirror of the
// purchase-orders actions: parse FormData → call lib/orders.ts → toast
// the helper's operator-facing message. confirm/fulfill revalidate the
// movements + products surfaces because stock (or its availability)
// changed.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { flashToast } from "@/lib/toast";
import { prismaUnscoped } from "@/lib/db";
import {
  createSO,
  findOrCreateCustomer,
  confirmSO,
  fulfillSO,
  cancelSO,
  type SOLineInput,
  type Fulfillment,
} from "@/lib/orders";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

function revalidate(stockMoved = false) {
  revalidatePath("/admin/sales-orders");
  if (stockMoved) {
    revalidatePath("/admin/movements");
    revalidatePath("/admin/products");
  }
}

function toast(label: string) {
  flashToast({ type: "info", entity: "info", label });
}

export async function createSalesOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const customerName = String(formData.get("customer") ?? "").trim();
  const requiredRaw = String(formData.get("requiredBy") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  let lines: SOLineInput[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("linesJson") ?? "[]"));
    if (Array.isArray(parsed)) {
      lines = parsed
        .map((l) => ({
          productId: String(l.productId ?? ""),
          quantity: Number(l.quantity),
          unitPrice:
            l.unitPrice === "" || l.unitPrice == null ? null : Number(l.unitPrice),
        }))
        .filter((l) => l.productId);
    }
  } catch {
    return toast(ar ? "⚠ صيغة البنود غير صالحة" : "⚠ Invalid line data");
  }
  try {
    // Transitional (mirrors createPurchaseOrder): dropdown → customerId;
    // free-text form → name → find-or-create Customer.
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      if (!tenantId) return toast(ar ? "⚠ المستأجر مطلوب" : "⚠ Tenant is required");
      if (!customerName)
        return toast(ar ? "⚠ العميل مطلوب" : "⚠ Customer is required");
      resolvedCustomerId = (
        await findOrCreateCustomer(prismaUnscoped, tenantId, customerName)
      ).id;
    }
    const so = await createSO({
      tenantId,
      customerId: resolvedCustomerId,
      lines,
      requiredBy: requiredRaw ? new Date(requiredRaw) : null,
      note: note || null,
    });
    revalidate();
    toast(ar ? `تم إنشاء أمر البيع ${so.soNumber}` : `Created SO ${so.soNumber}`);
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "create failed"}`);
  }
}

export async function confirmSalesOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const soId = String(formData.get("soId") ?? "").trim();
  if (!soId) return;
  try {
    await confirmSO(soId);
    revalidate();
    toast(ar ? "تم تأكيد أمر البيع" : "SO confirmed");
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "confirm failed"}`);
  }
}

export async function fulfillSalesOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const soId = String(formData.get("soId") ?? "").trim();
  if (!soId) return;
  const fulfillments: Fulfillment[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("ful_")) continue;
    const raw = String(v).trim();
    if (raw === "") continue;
    fulfillments.push({ lineId: k.slice(4), fulfilledQty: Number(raw) });
  }
  if (fulfillments.length === 0) {
    return toast(ar ? "⚠ لم تُدخل أي كميات" : "⚠ No quantities entered");
  }
  try {
    await fulfillSO(soId, fulfillments);
    revalidate(true);
    toast(ar ? "تم تنفيذ أمر البيع" : "SO fulfillment recorded");
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "fulfill failed"}`);
  }
}

export async function cancelSalesOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const soId = String(formData.get("soId") ?? "").trim();
  if (!soId) return;
  try {
    await cancelSO(soId);
    revalidate();
    toast(ar ? "تم إلغاء أمر البيع" : "SO cancelled");
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "cancel failed"}`);
  }
}
