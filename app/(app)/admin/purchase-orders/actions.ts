"use server";

// Server actions for /admin/purchase-orders (Phase 6).
//
// Thin wrappers over lib/orders.ts: parse FormData → typed args, call
// the helper inside try/catch, surface the helper's descriptive Error
// message as a toast (helper messages are written to be operator-facing,
// e.g. "Receive rejected: ..."). Movement-writing transitions also
// revalidate /admin/movements + /admin/products since stock moved.
//
// Phase 11 authz — tenant scope is enforced via resolveAdminTenantId(): a
// pinned user is FORCED to their own tenantSlug, foreign ids get overridden,
// only a cross-tenant ADMIN (no tenantSlug) may target an arbitrary tenantId.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { resolveAdminTenantId } from "@/lib/auth/adminActionScope";
import {
  createPO,
  findOrCreateSupplier,
  markPOSent,
  receivePO,
  cancelPO,
  type POLineInput,
  type Receipt,
} from "@/lib/finance/orders";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

function revalidate(stockMoved = false) {
  revalidatePath("/admin/purchase-orders");
  if (stockMoved) {
    revalidatePath("/admin/movements");
    revalidatePath("/admin/products");
  }
}

// flashToast is server-flash via cookie; import lazily to keep this file
// focused (same helper /admin/mappings + /admin/products use).
import { flashToast } from "@/lib/utils/toast";
function toast(label: string) {
  flashToast({ type: "info", entity: "info", label });
}

export async function createPurchaseOrder(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = getLocale() === "ar";
  // Phase 11 authz — never trust a submitted tenantId; resolve against the
  // session. Pinned user → forced to own tenantSlug; cross-tenant ADMIN may pass through.
  const scope = resolveAdminTenantId(user, String(formData.get("tenantId") ?? ""));
  if (!scope) return toast(ar ? "⚠ المستأجر مطلوب" : "⚠ Tenant is required");
  const tenantId = scope.tenantId;
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const supplierName = String(formData.get("supplier") ?? "").trim();
  const expectedRaw = String(formData.get("expectedAt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  let lines: POLineInput[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("linesJson") ?? "[]"));
    if (Array.isArray(parsed)) {
      lines = parsed
        .map((l) => ({
          productId: String(l.productId ?? ""),
          quantity: Number(l.quantity),
          unitCost:
            l.unitCost === "" || l.unitCost == null ? null : Number(l.unitCost),
        }))
        .filter((l) => l.productId);
    }
  } catch {
    return toast(ar ? "⚠ صيغة البنود غير صالحة" : "⚠ Invalid line data");
  }
  try {
    // Transitional: the New-PO dropdown (later commit) sends supplierId;
    // the current free-text form sends a name → find-or-create the
    // Supplier. Both paths converge on a real supplierId.
    let resolvedSupplierId = supplierId;
    if (!resolvedSupplierId) {
      // tenantId is guaranteed by the resolveAdminTenantId check at top.
      if (!supplierName)
        return toast(ar ? "⚠ المورّد مطلوب" : "⚠ Supplier is required");
      resolvedSupplierId = (
        await findOrCreateSupplier(prisma, tenantId, supplierName)
      ).id;
    }
    const po = await createPO({
      tenantId,
      supplierId: resolvedSupplierId,
      lines,
      expectedAt: expectedRaw ? new Date(expectedRaw) : null,
      note: note || null,
    });
    revalidate();
    toast(ar ? `تم إنشاء أمر الشراء ${po.poNumber}` : `Created PO ${po.poNumber}`);
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "create failed"}`);
  }
}

export async function markPurchaseOrderSent(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const poId = String(formData.get("poId") ?? "").trim();
  if (!poId) return;
  try {
    await markPOSent(poId);
    revalidate();
    toast(ar ? "تم إرسال أمر الشراء" : "PO marked as Sent");
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "transition failed"}`);
  }
}

export async function receivePurchaseOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const poId = String(formData.get("poId") ?? "").trim();
  if (!poId) return;
  const receipts: Receipt[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("recv_")) continue;
    const raw = String(v).trim();
    if (raw === "") continue;
    receipts.push({ lineId: k.slice(5), receivedQty: Number(raw) });
  }
  if (receipts.length === 0) {
    return toast(ar ? "⚠ لم تُدخل أي كميات" : "⚠ No quantities entered");
  }
  try {
    await receivePO(poId, receipts);
    revalidate(true);
    toast(ar ? "تم استلام أمر الشراء" : "PO receipt recorded");
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "receive failed"}`);
  }
}

export async function cancelPurchaseOrder(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const poId = String(formData.get("poId") ?? "").trim();
  if (!poId) return;
  try {
    await cancelPO(poId);
    revalidate();
    toast(ar ? "تم إلغاء أمر الشراء" : "PO cancelled");
  } catch (e) {
    toast(`⚠ ${e instanceof Error ? e.message : "cancel failed"}`);
  }
}
