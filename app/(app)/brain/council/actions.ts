"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { council } from "@/lib/brain/council.live";
import type { CouncilLens } from "@/lib/brain/council";
import { prisma } from "@/lib/db/db";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

// Bilingual lens labels — mirrors the picker chips so the saved topic reads in
// the user's language (kept here to avoid importing server-only council.live).
const LENS_LABEL: Record<string, { ar: string; en: string }> = {
  finance:        { ar: "المالية", en: "finances" },
  operations:     { ar: "العمليات", en: "operations" },
  supply:         { ar: "سلسلة التوريد", en: "supply" },
  sustainability: { ar: "الاستدامة", en: "sustainability" },
  people:         { ar: "الموظفون", en: "people" },
  analytics:      { ar: "التحليلات", en: "analytics" },
};

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

  // Brief scope — the user assembled a focus from the picker: zero or more
  // companies (empty = whole group) and zero or more lenses (empty = full
  // picture). We fence the sub-agents to that brief and name it in the topic so
  // the record reads "Regarding Maha Dairy · finances — <decision>".
  const companyIdsRaw = String(formData.get("companyIds") ?? "").trim();
  const companyIds = companyIdsRaw ? companyIdsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const lensesRaw = String(formData.get("lenses") ?? "").trim();
  const lenses = (lensesRaw ? lensesRaw.split(",").map((s) => s.trim()).filter(Boolean) : []) as CouncilLens[];

  let finalTopic = topic;
  const labelParts: string[] = [];
  if (companyIds.length) {
    const cos = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { name: true, nameEn: true },
    });
    if (cos.length) labelParts.push(cos.map((c) => (ar ? c.name : c.nameEn || c.name)).join("، "));
  }
  if (lenses.length) labelParts.push(lenses.map((l) => LENS_LABEL[l]?.[ar ? "ar" : "en"] ?? l).join("، "));
  if (labelParts.length) {
    finalTopic = `${ar ? "بخصوص" : "Regarding"} ${labelParts.join(" · ")} — ${topic}`;
  }

  let sessionId: string | null = null;
  try {
    const session = await council().convene(finalTopic, contextRefs, { companyIds, lenses }, ar ? "ar" : "en");
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
