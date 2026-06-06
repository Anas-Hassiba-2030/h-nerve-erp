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

  // Subject scope — the user picks WHICH unit the council debates. "group" (or
  // empty) = the whole federation; a companyId fences the sub-agents to that unit
  // only (no other companies' data) and names it in the topic.
  let finalTopic = topic;
  let scopeCompanyId: string | undefined;
  const scopeRaw = String(formData.get("scope") ?? "").trim();
  if (scopeRaw && scopeRaw !== "group") {
    const co = await prisma.company.findUnique({
      where: { id: scopeRaw },
      select: { id: true, name: true, nameEn: true },
    });
    if (co) {
      scopeCompanyId = co.id;
      const label = ar ? co.name : (co.nameEn || co.name);
      finalTopic = `${ar ? "بخصوص" : "Regarding"} ${label} — ${topic}`;
    }
  }

  let sessionId: string | null = null;
  try {
    const session = await council().convene(finalTopic, contextRefs, scopeCompanyId);
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
