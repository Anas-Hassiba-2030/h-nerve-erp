"use server";

// Server actions for /admin/suppliers (Phase 7). CRUD over Supplier.
// Mirrors the mappings/products action conventions: gate(), flashToast
// + revalidate, friendly toast on the unique-name collision, soft
// delete blocked while the supplier still has non-cancelled POs.
//
// TODO(Phase 11): per-tenant authz — any ADMIN/EXECUTIVE/MANAGER may
// edit any tenant's supplier (same posture as the rest of the family).

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { prismaUnscoped } from "@/lib/db";
import { flashToast } from "@/lib/toast";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
}

function ok(label: string) {
  flashToast({ type: "info", entity: "info", label });
  revalidatePath("/admin/suppliers");
}
function fail(label: string) {
  flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
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
  await gate();
  const ar = getLocale() === "ar";
  const tenantId = String(formData.get("tenantId") ?? "").trim().slice(0, 64);
  const f = fields(formData);
  if (!tenantId || !f.name) {
    return fail(ar ? "المستأجر والاسم مطلوبان" : "tenantId and name are required");
  }
  try {
    await prismaUnscoped.supplier.create({ data: { tenantId, ...f } });
  } catch {
    return fail(
      ar
        ? `يوجد مورّد بالاسم «${f.name}» لهذا المستأجر`
        : `a supplier named "${f.name}" already exists for this tenant`,
    );
  }
  ok(ar ? "تم إنشاء المورّد" : "Supplier created");
}

export async function updateSupplier(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const f = fields(formData);
  if (!f.name) return fail(ar ? "الاسم مطلوب" : "name is required");
  try {
    await prismaUnscoped.supplier.update({ where: { id }, data: f });
  } catch {
    return fail(
      ar ? "تعذّر التحديث (اسم مكرّر؟)" : "update failed (duplicate name?)",
    );
  }
  ok(ar ? "تم تحديث المورّد" : "Supplier updated");
}

export async function deleteSupplier(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  // Block soft-delete while non-cancelled POs still reference it — the
  // history must stay resolvable. Reverse/cancel those first.
  const activePOs = await prismaUnscoped.purchaseOrder.count({
    where: { supplierId: id, deletedAt: null, status: { not: "CANCELLED" } },
  });
  if (activePOs > 0) {
    return fail(
      ar
        ? `لا يمكن الحذف: للمورّد ${activePOs} أمر شراء غير ملغى`
        : `cannot delete: supplier has ${activePOs} non-cancelled PO(s)`,
    );
  }
  await prismaUnscoped.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  ok(ar ? "تم حذف المورّد" : "Supplier deleted");
}
