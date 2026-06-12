"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { learnPatterns } from "@/lib/brain/feedback.live";
import { seedFeedback as seedFeedbackLib } from "@/lib/brain/seedFeedback";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";

export async function learnNow(): Promise<void> {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  try {
    await learnPatterns({ scope: "default", windowDays: 60, minEvidence: 3 });
  } catch (e) {
    await flashToast({ type: "info", entity: "info", id: "learn", label: ar ? `تعذّر التعلّم: ${(e as Error).message}` : `Learn failed: ${(e as Error).message}` });
    revalidatePath("/brain/learning");
    return;
  }
  revalidatePath("/brain/learning");
}

export async function seedFeedback(): Promise<void> {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  try {
    await seedFeedbackLib();
    await learnPatterns({ scope: "default", windowDays: 60, minEvidence: 3 });
  } catch (e) {
    await flashToast({ type: "info", entity: "info", id: "seed-fb", label: ar ? `تعذّر البذر: ${(e as Error).message}` : `Seed failed: ${(e as Error).message}` });
    revalidatePath("/brain/learning");
    return;
  }
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
