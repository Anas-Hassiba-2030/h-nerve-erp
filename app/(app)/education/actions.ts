"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

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
  await requireUser();
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
      companyId: data.companyId,
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
  revalidatePath("/education");
  redirect("/education");
}

export async function setProgramStage(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !stage) return;
  await prisma.program.update({ where: { id }, data: { stage } });
  revalidatePath("/education");
}

export async function deleteProgram(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.program.delete({ where: { id } });
  revalidatePath("/education");
}
