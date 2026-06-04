"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { reflect, apply, reject, computeIQ } from "@/lib/brain/meta.reflector";
import { seedMetaHistory } from "@/lib/brain/seedMetaHistory";

export async function reflectNow(): Promise<void> {
  await requireUser();
  const result = await reflect({ scope: "default", windowDays: 7 });
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
  redirect(`/brain/self-tuning/${result.reportId}`);
}

export async function approveReport(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const note = String(formData.get("note") ?? "").slice(0, 320) || undefined;
  await apply(id, { userId: me.id, note });
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
  revalidatePath(`/brain/self-tuning/${id}`);
}

export async function rejectReport(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const note = String(formData.get("note") ?? "").slice(0, 320) || undefined;
  await reject(id, { userId: me.id, note });
  revalidatePath("/brain/iq");
  revalidatePath("/brain/self-tuning");
  revalidatePath(`/brain/self-tuning/${id}`);
}

export async function seedHistory(): Promise<void> {
  await requireUser();
  await seedMetaHistory();
  // Compute fresh IQ snapshot off the seeded data.
  const iq = await computeIQ("default");
  // Don't add another snapshot — the seed already produced 8 weeks ending today.
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
