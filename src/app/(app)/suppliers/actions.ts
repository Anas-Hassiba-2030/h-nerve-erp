"use server";

// Server actions for /suppliers — the bill-from entity for PurchaseInvoice,
// mirrors /customers exactly (same tenant-scoped Supplier family). Existed
// as a Prisma model with no CRUD surface until now, same gap Customer had
// before Invoice.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

function readFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 200) || null;
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const address = String(formData.get("address") ?? "").trim().slice(0, 400) || null;
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim().slice(0, 60) || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000) || null;
  return { name, email, phone, address, paymentTerms, notes };
}

export async function createSupplier(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لإضافة مورّد له" : "No active tenant to add a supplier to",
    });
    return;
  }

  const { name, email, phone, address, paymentTerms, notes } = readFields(formData);
  if (!name) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اسم المورّد مطلوب" : "Supplier name is required" });
    return;
  }

  try {
    await prisma.supplier.create({
      data: { tenantId, name, email, phone, address, paymentTerms, notes },
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    await flashToast({
      type: "info",
      entity: "info",
      label:
        code === "P2002"
          ? ar
            ? `يوجد مورّد باسم "${name}" لهذا المستأجر`
            : `a supplier named "${name}" already exists for this tenant`
          : ar
            ? "تعذر إنشاء المورّد"
            : "Could not create the supplier",
    });
    return;
  }

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplier(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { name, email, phone, address, paymentTerms, notes } = readFields(formData);
  if (!name) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اسم المورّد مطلوب" : "Supplier name is required" });
    return;
  }

  try {
    await prisma.supplier.update({
      where: { id },
      data: { name, email, phone, address, paymentTerms, notes },
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر تحديث المورّد" : "Could not update the supplier" });
    return;
  }

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function deleteSupplier(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [poCount, piCount, productCount] = await Promise.all([
    prisma.purchaseOrder.count({ where: { supplierId: id, deletedAt: null } }),
    prisma.purchaseInvoice.count({ where: { supplierId: id, deletedAt: null } }),
    prisma.product.count({ where: { supplierId: id, deletedAt: null } }),
  ]);
  const held = poCount + piCount + productCount;
  if (held > 0) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? `لا يمكن الحذف: للمورّد ${held} سجلاً مرتبطاً`
        : `cannot delete: supplier has ${held} linked record(s)`,
    });
    return;
  }

  await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  await flashToast({ type: "info", entity: "info", label: ar ? "تم حذف المورّد" : "Supplier deleted" });
  revalidatePath("/suppliers");
}
