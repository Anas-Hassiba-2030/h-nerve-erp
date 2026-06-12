"use server";

// Server actions for /admin/suppliers (Phase 7). CRUD over Supplier.
// Mirrors the mappings/products action conventions: gate(), flashToast
// + revalidate, friendly toast on the unique-name collision, soft
// delete blocked while the supplier still has non-cancelled POs.
//
// Phase 11 authz — tenant scope enforced via resolveAdminTenantId() on
// createSupplier; update/delete operate by id and are scoped at the Prisma
// client (Supplier is in TENANT_SCOPED_MODELS in lib/workspaceScope.ts), so a
// foreign-tenant row simply 404s for a pinned user.

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
  revalidatePath("/admin/suppliers");
}
async function fail(label: string) {
  await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath("/admin/suppliers");
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

export async function createSupplier(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  // Phase 11 authz — pinned user can only create a supplier in their own tenant.
  const scope = resolveAdminTenantId(user, String(formData.get("tenantId") ?? ""));
  if (!scope) return fail(ar ? "المستأجر مطلوب" : "tenantId is required");
  const tenantId = scope.tenantId.slice(0, 64);
  const f = fields(formData);
  if (!f.name) {
    return fail(ar ? "الاسم مطلوب" : "name is required");
  }
  try {
    await prisma.supplier.create({ data: { tenantId, ...f } });
  } catch {
    return fail(
      ar
        ? `يوجد مورّد بالاسم «${f.name}» لهذا المستأجر`
        : `a supplier named "${f.name}" already exists for this tenant`,
    );
  }
  await ok(ar ? "تم إنشاء المورّد" : "Supplier created");
}

export async function updateSupplier(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const f = fields(formData);
  if (!f.name) return fail(ar ? "الاسم مطلوب" : "name is required");
  try {
    await prisma.supplier.update({ where: { id }, data: f });
  } catch {
    return fail(
      ar ? "تعذّر التحديث (اسم مكرّر؟)" : "update failed (duplicate name?)",
    );
  }
  await ok(ar ? "تم تحديث المورّد" : "Supplier updated");
}

export async function deleteSupplier(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  // Block soft-delete while non-cancelled POs still reference it — the
  // history must stay resolvable. Reverse/cancel those first.
  const activePOs = await prisma.purchaseOrder.count({
    where: { supplierId: id, deletedAt: null, status: { not: "CANCELLED" } },
  });
  if (activePOs > 0) {
    return fail(
      ar
        ? `لا يمكن الحذف: للمورّد ${activePOs} أمر شراء غير ملغى`
        : `cannot delete: supplier has ${activePOs} non-cancelled PO(s)`,
    );
  }
  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await ok(ar ? "تم حذف المورّد" : "Supplier deleted");
}
