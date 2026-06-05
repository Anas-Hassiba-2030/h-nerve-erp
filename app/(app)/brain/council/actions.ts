"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { council } from "@/lib/brain/council.live";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

export async function convene(formData: FormData): Promise<void> {
  await requireUser();
  const ar = getLocale() === "ar";
  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic || topic.length < 6) {
    flashToast({
      type: "info", entity: "info", id: "convene",
      label: ar ? "اكتب موضوعاً أطول (٦ أحرف على الأقل)" : "Topic too short (6+ chars)",
    });
    revalidatePath("/brain/council");
    return;
  }
  // contextRefs is optional — comma-separated node ids
  const refsRaw = String(formData.get("contextRefs") ?? "").trim();
  const contextRefs = refsRaw ? refsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  let sessionId: string | null = null;
  try {
    const session = await council().convene(topic, contextRefs);
    sessionId = session.id;
  } catch (e) {
    flashToast({
      type: "info", entity: "info", id: "convene",
      label: ar ? `تعذّر عقد المجلس: ${(e as Error).message}` : `Could not convene: ${(e as Error).message}`,
    });
    revalidatePath("/brain/council");
    return;
  }
  revalidatePath("/brain/council");
  redirect(`/brain/council/${sessionId}`);
}

export async function deleteSession(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.councilSession.delete({ where: { id } });
  revalidatePath("/brain/council");
}
