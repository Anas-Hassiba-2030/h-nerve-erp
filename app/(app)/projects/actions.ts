"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { resolveOwnCompanyId } from "@/lib/auth/adminActionScope";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { softDelete, softRestore, deletedLabel, restoredLabel } from "@/lib/db/softDelete";
import { flashToast } from "@/lib/utils/toast";
import {
  parseFormState,
  formStateFromError,
  type FormState,
} from "@/lib/utils/formState";

const projectSchema = z.object({
  companyId: z.string().min(1, "الشركة المالكة مطلوبة"),
  title: z.string().min(1, "العنوان مطلوب").max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  stage: z.enum(["IDEA", "RESEARCH", "PLANNED", "APPROVED", "IN_PROGRESS", "ON_HOLD", "DONE"]).default("IDEA"),
  budgetJod: z.coerce.number().min(0, "الميزانية لا يمكن أن تكون سالبة").default(0),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  startQuarter: z.string().max(20).optional().or(z.literal("")),
  targetQuarter: z.string().max(20).optional().or(z.literal("")),
  kpis: z.string().max(500).optional().or(z.literal("")),
  ownerName: z.string().max(120).optional().or(z.literal("")),
  progressPct: z.coerce.number().min(0).max(100, "النسبة بين 0 و 100").default(0),
});

export async function createProject(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("MANAGER");
  const parsed = parseFormState(projectSchema, {
    companyId: formData.get("companyId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    stage: formData.get("stage") || "IDEA",
    budgetJod: formData.get("budgetJod") ?? 0,
    priority: formData.get("priority") || "MEDIUM",
    startQuarter: formData.get("startQuarter") ?? "",
    targetQuarter: formData.get("targetQuarter") ?? "",
    kpis: formData.get("kpis") ?? "",
    ownerName: formData.get("ownerName") ?? "",
    progressPct: formData.get("progressPct") ?? 0,
  });
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;

  try {
    await prisma.futureProject.create({
      data: {
        companyId: resolveOwnCompanyId(data.companyId, await getActiveWorkspaceId()),
        title: data.title,
        description: data.description || null,
        stage: data.stage,
        budgetJod: data.budgetJod,
        priority: data.priority,
        startQuarter: data.startQuarter || null,
        targetQuarter: data.targetQuarter || null,
        kpis: data.kpis || null,
        ownerName: data.ownerName || null,
        progressPct: data.progressPct,
      },
    });
  } catch (err) {
    return formStateFromError(err);
  }

  revalidatePath("/projects");
  redirect("/projects");
}

export async function setProjectStage(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !stage) return;
  await prisma.futureProject.update({ where: { id }, data: { stage } });
  revalidatePath("/projects");
}

export async function deleteProject(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await softDelete("project", id);
  flashToast({
    type: "deleted",
    entity: "project",
    id,
    label: deletedLabel("project"),
    restorePath: "/api/toast/undo",
  });
}

export async function restoreProject(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await softRestore("project", id);
  flashToast({
    type: "restored",
    entity: "project",
    id,
    label: restoredLabel("project"),
  });
}
