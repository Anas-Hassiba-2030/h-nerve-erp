"use server";

// Server actions for /admin/warehouses (Phase 9). CRUD over Warehouse.
// Mirrors the suppliers/accounts action conventions: gate(), flashToast
// + revalidate, friendly toast on the unique-code collision, soft
// delete blocked while the warehouse still holds products (the import
// resolver and transfer history must stay resolvable). `code` is
// immutable after create — the import endpoint resolves a free-text
// warehouse to it, so changing it would orphan future imports.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { resolveAdminTenantId } from "@/lib/auth/adminActionScope";
// WAREHOUSE_TYPES must NOT be declared OR re-exported in this "use server"
// file — every export of a "use server" module becomes a server-action
// reference, so the array would reach the client forms as a function
// proxy. Imported here for internal validation only; the client forms
// import it straight from ./warehouseTypes.
import { WAREHOUSE_TYPES } from "./warehouseTypes";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}
function ok(label: string) {
  flashToast({ type: "info", entity: "info", label });
  revalidatePath("/admin/warehouses");
}
function fail(label: string) {
  flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  revalidatePath("/admin/warehouses");
}

function editFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const address =
    String(formData.get("address") ?? "").trim().slice(0, 400) || null;
  const type = String(formData.get("type") ?? "").trim().toUpperCase();
  const active = String(formData.get("active") ?? "") === "true";
  return { name, address, type, active };
}

export async function createWarehouse(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = getLocale() === "ar";
  // Phase 11 authz — never trust a submitted tenantId; resolve against the
  // session. Pinned user → forced to own tenantSlug; cross-tenant ADMIN may pass through.
  const scope = resolveAdminTenantId(user, String(formData.get("tenantId") ?? ""));
  if (!scope) return fail(ar ? "المستأجر مطلوب" : "tenantId is required");
  const tenantId = scope.tenantId.slice(0, 64);
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 24);
  const { name, address, type, active } = editFields(formData);

  if (!code || !name) {
    return fail(
      ar
        ? "الرمز والاسم مطلوبة"
        : "code and name are required",
    );
  }
  if (!WAREHOUSE_TYPES.includes(type as (typeof WAREHOUSE_TYPES)[number])) {
    return fail(
      ar
        ? `النوع يجب أن يكون أحد: ${WAREHOUSE_TYPES.join(", ")}`
        : `type must be one of: ${WAREHOUSE_TYPES.join(", ")}`,
    );
  }
  try {
    await prisma.warehouse.create({
      data: { tenantId, code, name, address, type, active },
    });
  } catch {
    return fail(
      ar
        ? `يوجد مستودع بالرمز ${code} لهذا المستأجر`
        : `a warehouse with code ${code} already exists for this tenant`,
    );
  }
  ok(ar ? `تم إنشاء المستودع ${code}` : `Warehouse ${code} created`);
}

export async function updateWarehouse(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const { name, address, type, active } = editFields(formData);
  if (!name) return fail(ar ? "الاسم مطلوب" : "name is required");
  if (!WAREHOUSE_TYPES.includes(type as (typeof WAREHOUSE_TYPES)[number])) {
    return fail(
      ar
        ? `النوع يجب أن يكون أحد: ${WAREHOUSE_TYPES.join(", ")}`
        : `type must be one of: ${WAREHOUSE_TYPES.join(", ")}`,
    );
  }
  await prisma.warehouse.update({
    where: { id },
    data: { name, address, type, active },
  });
  ok(ar ? "تم تحديث المستودع" : "Warehouse updated");
}

export async function deleteWarehouse(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  // Block soft-delete while the warehouse still holds products — the
  // import resolver and transfer history must stay resolvable. Move or
  // transfer its stock out first.
  const held = await prisma.product.count({
    where: { warehouseId: id, deletedAt: null },
  });
  if (held > 0) {
    return fail(
      ar
        ? `لا يمكن الحذف: المستودع يحوي ${held} منتجاً`
        : `cannot delete: warehouse still holds ${held} product(s)`,
    );
  }
  await prisma.warehouse.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  ok(ar ? "تم حذف المستودع" : "Warehouse deleted");
}
