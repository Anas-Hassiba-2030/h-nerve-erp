"use server";

// Server actions for the (now-redirected) /admin/customers surface (Phase 7).
// The PAGE forwards to the canonical /customers; these actions are RETAINED
// deliberately because createCustomer is the reference implementation of the
// #174 cross-tenant WRITE-leak guard (submitted tenantId → resolveAdminTenantId
// override) that adminActionScope.actions.test.ts asserts. The canonical
// /customers/actions uses activeTenantSlug() instead (no submitted tenantId,
// so leak-proof by construction) — a different, equally-safe model. Do not
// delete these without moving that regression guard.
//
// Mirror of the suppliers actions — soft delete blocked while the customer
// still has non-cancelled sales orders.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { resolveAdminTenantId } from "@/lib/auth/adminActionScope";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

async function ok(label: string) {
  await flashToast({ type: "info", entity: "info", label });
  revalidatePath("/admin/customers");
}
async function fail(label: string) {
  await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath("/admin/customers");
}

function fields(formData: FormData) {
  const s = (k: string, max: number) =>
    String(formData.get(k) ?? "").trim().slice(0, max) || null;
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 200),
    email: s("email", 200),
    phone: s("phone", 60),
    address: s("address", 400),
    paymentTerms: s("paymentTerms", 60),
    notes: s("notes", 1000),
  };
}

export async function createCustomer(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  // Phase 11 authz — never trust a submitted tenantId; resolve against the
  // session. Pinned user → forced to own tenantSlug; cross-tenant ADMIN may pass through.
  const scope = resolveAdminTenantId(user, String(formData.get("tenantId") ?? ""));
  if (!scope) return fail(ar ? "المستأجر مطلوب" : "tenantId is required");
  const tenantId = scope.tenantId.slice(0, 64);
  const f = fields(formData);
  if (!f.name) {
    return fail(ar ? "الاسم مطلوب" : "name is required");
  }
  try {
    await prisma.customer.create({ data: { tenantId, ...f } });
  } catch {
    return fail(
      ar
        ? `يوجد عميل بالاسم «${f.name}» لهذا المستأجر`
        : `a customer named "${f.name}" already exists for this tenant`,
    );
  }
  await ok(ar ? "تم إنشاء العميل" : "Customer created");
}

export async function updateCustomer(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const f = fields(formData);
  if (!f.name) return fail(ar ? "الاسم مطلوب" : "name is required");
  try {
    await prisma.customer.update({ where: { id }, data: f });
  } catch {
    return fail(
      ar ? "تعذّر التحديث (اسم مكرّر؟)" : "update failed (duplicate name?)",
    );
  }
  await ok(ar ? "تم تحديث العميل" : "Customer updated");
}

export async function deleteCustomer(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const openSOs = await prisma.salesOrder.count({
    where: { customerId: id, deletedAt: null, status: { not: "CANCELLED" } },
  });
  if (openSOs > 0) {
    return fail(
      ar
        ? `لا يمكن الحذف: للعميل ${openSOs} أمر بيع غير ملغى`
        : `cannot delete: customer has ${openSOs} non-cancelled SO(s)`,
    );
  }
  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await ok(ar ? "تم حذف العميل" : "Customer deleted");
}
