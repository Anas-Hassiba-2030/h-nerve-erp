"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { reflect, apply, reject, computeIQ } from "@/lib/brain/meta.reflector";
import { seedMetaHistory } from "@/lib/brain/seedMetaHistory";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

export async function reflectNow(): Promise<void> {
  await requireUser();
  const ar = getLocale() === "ar";
  let reportId: string | null = null;
  try {
    const result = await reflect({ scope: "default", windowDays: 7 });
    reportId = result.reportId;
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id: "reflect",
      label: ar
        ? `تعذّر التأمل الذاتي: ${(e as Error).message || "خطأ"}`
        : `Self-reflection failed: ${(e as Error).message || "error"}`,
    });
    revalidatePath("/brain/iq");
    return;
  }
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
  redirect(`/brain/self-tuning/${reportId}`);
}

export async function approveReport(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const note = String(formData.get("note") ?? "").slice(0, 320) || undefined;
  try {
    await apply(id, { userId: me.id, note });
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id,
      label: ar
        ? `تعذّر اعتماد التقرير: ${(e as Error).message || "خطأ"}`
        : `Could not approve report: ${(e as Error).message || "error"}`,
    });
    revalidatePath("/brain/iq");
    return;
  }
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
  revalidatePath(`/brain/self-tuning/${id}`);
}

export async function rejectReport(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const note = String(formData.get("note") ?? "").slice(0, 320) || undefined;
  try {
    await reject(id, { userId: me.id, note });
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id,
      label: ar
        ? `تعذّر رفض التقرير: ${(e as Error).message || "خطأ"}`
        : `Could not reject report: ${(e as Error).message || "error"}`,
    });
    revalidatePath("/brain/iq");
    return;
  }
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
  revalidatePath(`/brain/self-tuning/${id}`);
}

export async function seedHistory(): Promise<void> {
  await requireUser();
  const ar = getLocale() === "ar";
  try {
    await seedMetaHistory();
    await computeIQ("default");
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id: "seed-history",
      label: ar
        ? `تعذّر بذر السجل: ${(e as Error).message || "خطأ"}`
        : `History seed failed: ${(e as Error).message || "error"}`,
    });
    revalidatePath("/brain/iq");
    return;
  }
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
}

export async function clearMetaHistory(): Promise<void> {
  await requireUser();
  await prisma.brainIQHistory.deleteMany({});
  await prisma.selfTuningReport.deleteMany({});
  await prisma.brainWeight.deleteMany({});
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
}
