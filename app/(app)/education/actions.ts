"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { resolveOwnCompanyId } from "@/lib/auth/adminActionScope";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

const programSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1).max(120),
  nameEn: z.string().max(120).optional().or(z.literal("")),
  founder: z.string().min(1).max(120),
  vertical: z.enum(["AI", "FINTECH", "ECOMMERCE", "AGRITECH", "EDTECH", "OTHER"]).default("OTHER"),
  stage: z.enum(["INTAKE", "ACCELERATING", "GRADUATED", "STALLED"]).default("INTAKE"),
  cohort: z.string().max(20).default("2026"),
  fundingJod: z.coerce.number().min(0).default(0),
  teamSize: z.coerce.number().int().min(1).default(1),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export async function createProgram(formData: FormData) {
  await requireRole("MANAGER");
  const ar = getLocale() === "ar";
  // schema.parse() throws on invalid input; without this guard the button just
  // re-renders the form with no message (silent "does nothing"). Toast on any
  // validation/DB failure so the click always produces visible feedback.
  try {
    const data = programSchema.parse({
      companyId: formData.get("companyId"),
      name: formData.get("name"),
      nameEn: formData.get("nameEn") ?? "",
      founder: formData.get("founder"),
      vertical: formData.get("vertical") || "OTHER",
      stage: formData.get("stage") || "INTAKE",
      cohort: formData.get("cohort") || "2026",
      fundingJod: formData.get("fundingJod") ?? 0,
      teamSize: formData.get("teamSize") ?? 1,
      description: formData.get("description") ?? "",
    });
    await prisma.program.create({
      data: {
        companyId: resolveOwnCompanyId(data.companyId, getActiveWorkspaceId()),
        name: data.name,
        nameEn: data.nameEn || null,
        founder: data.founder,
        vertical: data.vertical,
        stage: data.stage,
        cohort: data.cohort,
        fundingJod: data.fundingJod,
        teamSize: data.teamSize,
        description: data.description || null,
      },
    });
  } catch {
    flashToast({
      type: "info", entity: "info", id: "create-program",
      label: ar ? "تعذّر إنشاء البرنامج — تحقّق من المدخلات" : "Couldn't create program — check the inputs",
    });
    revalidatePath("/education");
    return;
  }
  revalidatePath("/education");
  redirect("/education");
}

const stageEnum = z.enum(["INTAKE", "ACCELERATING", "GRADUATED", "STALLED"]);

export async function setProgramStage(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = stageEnum.safeParse(formData.get("stage"));
  if (!id || !parsed.success) return; // reject unknown/malformed stage values
  await prisma.program.update({ where: { id }, data: { stage: parsed.data } });
  revalidatePath("/education");
}

export async function deleteProgram(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ar = getLocale() === "ar";
  try {
    await prisma.program.delete({ where: { id } });
    flashToast({
      type: "info",
      entity: "info",
      id,
      label: ar ? "حُذف البرنامج" : "Program deleted",
    });
  } catch (e) {
    flashToast({
      type: "info",
      entity: "info",
      id,
      label: ar
        ? `تعذّر الحذف: ${(e as Error).message}`
        : `Delete failed: ${(e as Error).message}`,
    });
  }
  revalidatePath("/education");
}
