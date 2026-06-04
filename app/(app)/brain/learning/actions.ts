"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { learnPatterns } from "@/lib/brain/feedback.live";
import { seedFeedback as seedFeedbackLib } from "@/lib/brain/seedFeedback";
import { prisma } from "@/lib/db/db";

export async function learnNow(): Promise<void> {
  await requireUser();
  await learnPatterns({ scope: "default", windowDays: 60, minEvidence: 3 });
  revalidatePath("/brain/learning");
}

export async function seedFeedback(): Promise<void> {
  await requireUser();
  await seedFeedbackLib();
  await learnPatterns({ scope: "default", windowDays: 60, minEvidence: 3 });
  revalidatePath("/brain/learning");
}

export async function togglePattern(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const cur = await prisma.brainPattern.findUnique({ where: { id } });
  if (!cur) return;
  const next = cur.status === "ENABLED" ? "DISABLED" : "ENABLED";
  await prisma.brainPattern.update({
    where: { id },
    data: { status: next },
  });
  revalidatePath("/brain/learning");
}

export async function unlearnPattern(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.brainPattern.update({
    where: { id },
    data: { status: "UNLEARNED" },
  });
  revalidatePath("/brain/learning");
}

export async function deletePattern(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.brainPattern.delete({ where: { id } });
  revalidatePath("/brain/learning");
}

export async function clearAllFeedback(): Promise<void> {
  await requireUser();
  await prisma.brainPattern.deleteMany({});
  await prisma.brainFeedback.deleteMany({});
  revalidatePath("/brain/learning");
}
