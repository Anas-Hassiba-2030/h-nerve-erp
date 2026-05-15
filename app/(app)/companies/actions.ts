"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import {
  parseFormState,
  formStateFromError,
  type FormState,
} from "@/lib/formState";

const companySchema = z.object({
  code: z.string().min(2, "الكود قصير جداً (حد أدنى حرفان)").max(12, "الكود طويل (حد أقصى 12 حرف)").transform((s) => s.trim().toUpperCase()),
  name: z.string().min(1, "الاسم العربي مطلوب").max(120),
  nameEn: z.string().min(1, "English name required").max(120),
  sector: z.enum(["HOSPITALITY", "DAIRY", "AGRICULTURE", "EDUCATION", "INVESTMENT", "TRADE"]),
  country: z.string().min(2).max(2).default("JO"),
  city: z.string().max(80).optional().or(z.literal("")),
  foundedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional().or(z.literal("").transform(() => undefined)),
  employees: z.coerce.number().int().min(0).default(0),
  status: z.enum(["ACTIVE", "PAUSED", "RAMPING"]).default("ACTIVE"),
  description: z.string().max(2000).optional().or(z.literal("")),
});

function read(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    nameEn: formData.get("nameEn"),
    sector: formData.get("sector"),
    country: formData.get("country") || "JO",
    city: formData.get("city") ?? "",
    foundedYear: formData.get("foundedYear") ?? "",
    employees: formData.get("employees") ?? 0,
    status: formData.get("status") || "ACTIVE",
    description: formData.get("description") ?? "",
  };
}

export async function createCompany(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = parseFormState(companySchema, read(formData));
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.company.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        nameEn: parsed.data.nameEn,
        sector: parsed.data.sector,
        country: parsed.data.country,
        city: parsed.data.city || null,
        foundedYear:
          typeof parsed.data.foundedYear === "number"
            ? parsed.data.foundedYear
            : null,
        employees: parsed.data.employees,
        status: parsed.data.status,
        description: parsed.data.description || null,
      },
    });
  } catch (err) {
    return formStateFromError(err);
  }

  revalidatePath("/companies");
  redirect("/companies");
}

export async function updateCompany(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = parseFormState(companySchema, read(formData));
  if (!parsed.ok) return parsed.state;

  try {
    await prisma.company.update({
      where: { id },
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        nameEn: parsed.data.nameEn,
        sector: parsed.data.sector,
        country: parsed.data.country,
        city: parsed.data.city || null,
        foundedYear:
          typeof parsed.data.foundedYear === "number"
            ? parsed.data.foundedYear
            : null,
        employees: parsed.data.employees,
        status: parsed.data.status,
        description: parsed.data.description || null,
      },
    });
  } catch (err) {
    return formStateFromError(err);
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}/edit`);
  redirect("/companies");
}

export async function deleteCompany(formData: FormData) {
  // Phase D: deleting a whole company cascades to every child record
  // (hotels, dairy, farms, transactions…). ADMIN only — server-side
  // backstop even though the UI hides the control for lower roles.
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.company.delete({ where: { id } });
  revalidatePath("/companies");
}
