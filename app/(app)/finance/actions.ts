"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { generateNumber } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";

const txSchema = z.object({
  companyId: z.string().min(1),
  kind: z.enum(["REVENUE", "EXPENSE", "TRANSFER"]),
  category: z.string().min(1).max(120),
  amount: z.coerce.number().min(0),
  currency: z.string().min(3).max(3).default("JOD"),
  description: z.string().max(500).optional().or(z.literal("")),
  occurredAt: z.string().min(1),
});

export async function createTransaction(formData: FormData) {
  // Phase D: recording money movements is a privileged mutation.
  const user = await requireRole("MANAGER");
  const data = txSchema.parse({
    companyId: formData.get("companyId"),
    kind: formData.get("kind"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "JOD",
    description: formData.get("description") ?? "",
    occurredAt: formData.get("occurredAt"),
  });

  const tx = await prisma.transaction.create({
    data: {
      companyId: data.companyId,
      reference: generateNumber("TX"),
      kind: data.kind,
      category: data.category,
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      description: data.description || null,
      occurredAt: new Date(data.occurredAt),
      createdById: user.id,
    },
  });
  await logActivity({
    action: "CREATE",
    entity: "TRANSACTION",
    entityId: tx.id,
    summary: `${data.kind === "REVENUE" ? "إيراد" : data.kind === "EXPENSE" ? "مصروف" : "تحويل"} ${tx.reference} — ${data.amount} ${data.currency}`,
    summaryEn: `${data.kind} ${tx.reference} — ${data.amount} ${data.currency}`,
    module: "FINANCE",
    meta: { kind: data.kind, amount: data.amount, currency: data.currency },
  });
  revalidatePath("/finance");
  redirect("/finance");
}

export async function deleteTransaction(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.transaction.findUnique({ where: { id } });
  await prisma.transaction.delete({ where: { id } });
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "TRANSACTION",
      entityId: id,
      summary: `حذف معاملة ${before.reference} (${before.amount} ${before.currency})`,
      summaryEn: `Deleted transaction ${before.reference}`,
      module: "FINANCE",
    });
  }
  revalidatePath("/finance");
}
