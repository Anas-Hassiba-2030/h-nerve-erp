"use server";

// Server actions for /customers (Phase 27 — bill-to entity for Invoice,
// docs/spec/ENTITY-ENGINE-PATTERN.md). Tenant-scoped opaque tenantId, same
// family as Product/Supplier/LedgerAccount — mirrors admin/warehouses'
// action conventions (gate + flashToast + revalidate).

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

export async function createCustomer(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await getActiveTenantSlug();
  if (!tenantId) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لا يوجد مستأجر نشط لإضافة عميل له" : "No active tenant to add a customer to",
    });
    return;
  }

  const { name, email, phone, address, paymentTerms, notes } = readFields(formData);
  if (!name) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اسم العميل مطلوب" : "Customer name is required" });
    return;
  }

  try {
    await prisma.customer.create({
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
            ? `يوجد عميل باسم "${name}" لهذا المستأجر`
            : `a customer named "${name}" already exists for this tenant`
          : ar
            ? "تعذر إنشاء العميل"
            : "Could not create the customer",
    });
    return;
  }

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { name, email, phone, address, paymentTerms, notes } = readFields(formData);
  if (!name) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اسم العميل مطلوب" : "Customer name is required" });
    return;
  }

  try {
    await prisma.customer.update({
      where: { id },
      data: { name, email, phone, address, paymentTerms, notes },
    });
  } catch {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذر تحديث العميل" : "Could not update the customer" });
    return;
  }

  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomer(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Block soft-delete while the customer still has invoices — mirrors the
  // warehouse-holds-products guard in admin/warehouses/actions.ts.
  const invoiceCount = await prisma.invoice.count({ where: { customerId: id, deletedAt: null } });
  if (invoiceCount > 0) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? `لا يمكن الحذف: للعميل ${invoiceCount} فاتورة`
        : `cannot delete: customer has ${invoiceCount} invoice(s)`,
    });
    return;
  }

  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  await flashToast({ type: "info", entity: "info", label: ar ? "تم حذف العميل" : "Customer deleted" });
  revalidatePath("/customers");
}
