"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { generateNumber } from "@/lib/utils/utils";
import { logActivity } from "@/lib/auth/activityLog";
import {
  parseFormState,
  formStateFromError,
  type FormState,
} from "@/lib/utils/formState";

const batchSchema = z.object({
  companyId: z.string().min(1, "الشركة المنتجة مطلوبة"),
  product: z.enum(["MILK", "LABNEH", "YOGURT", "CHEESE", "BUTTER", "CREAM"]),
  productAr: z.string().min(1, "الاسم التجاري مطلوب").max(120),
  quantityLiters: z.coerce.number().min(0).default(0),
  qualityGrade: z.enum(["A", "B", "C"]).default("A"),
  fatContent: z.coerce.number().min(0).max(100).default(3.5),
  productionDate: z.string().min(1, "تاريخ الإنتاج مطلوب"),
  expiryDate: z.string().min(1, "تاريخ انتهاء الصلاحية مطلوب"),
  status: z
    .enum(["IN_PRODUCTION", "QC", "READY", "DISTRIBUTED", "RECALLED"])
    .default("IN_PRODUCTION"),
  destination: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function createBatch(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("MANAGER");
  const parsed = parseFormState(batchSchema, {
    companyId: formData.get("companyId"),
    product: formData.get("product"),
    productAr: formData.get("productAr"),
    quantityLiters: formData.get("quantityLiters") ?? 0,
    qualityGrade: formData.get("qualityGrade") || "A",
    fatContent: formData.get("fatContent") ?? 3.5,
    productionDate: formData.get("productionDate"),
    expiryDate: formData.get("expiryDate"),
    status: formData.get("status") || "IN_PRODUCTION",
    destination: formData.get("destination") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;

  // Cross-field check the schema can't easily express on its own.
  if (new Date(data.expiryDate) <= new Date(data.productionDate)) {
    return {
      ok: false,
      errors: { expiryDate: "تاريخ انتهاء الصلاحية يجب أن يكون بعد تاريخ الإنتاج." },
    };
  }

  let batch;
  try {
    batch = await prisma.dairyBatch.create({
      data: {
        companyId: data.companyId,
        batchNumber: generateNumber("MAHA"),
        product: data.product,
        productAr: data.productAr,
        quantityLiters: data.quantityLiters,
        qualityGrade: data.qualityGrade,
        fatContent: data.fatContent,
        productionDate: new Date(data.productionDate),
        expiryDate: new Date(data.expiryDate),
        status: data.status,
        destination: data.destination || null,
        notes: data.notes || null,
      },
    });
  } catch (err) {
    return formStateFromError(err);
  }

  await logActivity({
    action: "CREATE",
    entity: "DAIRY",
    entityId: batch.id,
    summary: `دفعة ألبان ${batch.batchNumber} (${data.productAr}) — ${data.quantityLiters} L`,
    summaryEn: `Dairy batch ${batch.batchNumber} (${data.product}) — ${data.quantityLiters} L`,
    module: "DAIRY",
    meta: { liters: data.quantityLiters, grade: data.qualityGrade },
  });
  revalidatePath("/dairy");
  redirect("/dairy");
}

export async function setBatchStatus(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;
  const before = await prisma.dairyBatch.findUnique({ where: { id } });
  await prisma.dairyBatch.update({ where: { id }, data: { status } });
  if (before) {
    await logActivity({
      action: "UPDATE",
      entity: "DAIRY",
      entityId: id,
      summary: `تحديث حالة دفعة ${before.batchNumber} → ${status}`,
      summaryEn: `Batch ${before.batchNumber} status → ${status}`,
      module: "DAIRY",
      meta: { from: before.status, to: status },
    });
  }
  revalidatePath("/dairy");
}

export async function deleteBatch(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.dairyBatch.findUnique({ where: { id } });
  await prisma.dairyBatch.delete({ where: { id } });
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "DAIRY",
      entityId: id,
      summary: `حذف دفعة ${before.batchNumber}`,
      summaryEn: `Deleted batch ${before.batchNumber}`,
      module: "DAIRY",
    });
  }
  revalidatePath("/dairy");
}
