"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  generatePlanFromCouncil,
  generatePlanFromInsight,
  commitPlan as commitPlanLib,
  abandonPlan as abandonPlanLib,
  completeStep as completeStepLib,
  blockStep as blockStepLib,
} from "@/lib/brain/planner.live";
import { recordFeedback } from "@/lib/brain/feedback.live";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";

export async function generateFromCouncil(formData: FormData): Promise<void> {
  await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) throw new Error("sessionId required");
  const locale = getLocale() as "ar" | "en";
  const plan = await generatePlanFromCouncil(sessionId, locale);
  revalidatePath("/plans");
  revalidatePath(`/brain/council/${sessionId}`);
  redirect(`/plans/${plan.id}`);
}

export async function generateFromInsight(formData: FormData): Promise<void> {
  await requireUser();
  const insightId = String(formData.get("insightId") ?? "");
  if (!insightId) throw new Error("insightId required");
  const locale = getLocale() as "ar" | "en";
  const plan = await generatePlanFromInsight(insightId, locale);
  revalidatePath("/plans");
  revalidatePath("/insights");
  redirect(`/plans/${plan.id}`);
}

export async function commit(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await commitPlanLib(id, me.id);

  // Phase 7 — feedback signal
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (plan) {
    await recordFeedback({
      kind: "PLAN_COMMITTED",
      targetRef: id,
      targetType: "plan",
      module: deriveModule(plan.targetMetric, plan.sourceCouncilSessionId),
      category: plan.sourceCouncilSessionId ? "council" : (plan.sourceInsightId ? "insight" : "manual"),
      userId: me.id,
    });
  }

  revalidatePath(`/plans/${id}`);
  revalidatePath("/plans");
}

export async function abandon(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const plan = await prisma.plan.findUnique({ where: { id } });
  await abandonPlanLib(id);

  if (plan) {
    await recordFeedback({
      kind: "PLAN_ABANDONED",
      targetRef: id,
      targetType: "plan",
      module: deriveModule(plan.targetMetric, plan.sourceCouncilSessionId),
      category: plan.targetMetric,
      userId: me.id,
    });
  }

  revalidatePath(`/plans/${id}`);
  revalidatePath("/plans");
}

export async function markStepDone(formData: FormData): Promise<void> {
  const me = await requireUser();
  const stepId = String(formData.get("stepId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!stepId) throw new Error("stepId required");
  const step = await prisma.planStep.findUnique({ where: { id: stepId } });
  await completeStepLib(stepId);

  if (step) {
    const plan = await prisma.plan.findUnique({ where: { id: step.planId } });
    await recordFeedback({
      kind: "PLAN_STEP_DONE",
      targetRef: stepId,
      targetType: "plan",
      module: plan ? deriveModule(plan.targetMetric, plan.sourceCouncilSessionId) : undefined,
      category: step.ownerRole.toLowerCase(),
      userId: me.id,
    });
    // If the plan flipped to DONE, record the higher-level signal too.
    const refreshed = await prisma.plan.findUnique({ where: { id: step.planId } });
    if (refreshed?.status === "DONE") {
      await recordFeedback({
        kind: "PLAN_COMPLETED",
        targetRef: refreshed.id,
        targetType: "plan",
        module: deriveModule(refreshed.targetMetric, refreshed.sourceCouncilSessionId),
        category: refreshed.targetMetric,
        userId: me.id,
      });
    }
  }

  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
}

export async function markStepBlocked(formData: FormData): Promise<void> {
  const me = await requireUser();
  const stepId = String(formData.get("stepId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 320) || null;
  if (!stepId) throw new Error("stepId required");
  const step = await prisma.planStep.findUnique({ where: { id: stepId } });
  await blockStepLib(stepId, note);

  if (step) {
    const plan = await prisma.plan.findUnique({ where: { id: step.planId } });
    await recordFeedback({
      kind: "PLAN_STEP_BLOCKED",
      targetRef: stepId,
      targetType: "plan",
      module: plan ? deriveModule(plan.targetMetric, plan.sourceCouncilSessionId) : undefined,
      category: step.ownerRole.toLowerCase(),
      note: note ?? undefined,
      userId: me.id,
    });
  }

  revalidatePath(`/plans/${planId}`);
}

export async function deletePlan(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.plan.delete({ where: { id } });
  revalidatePath("/plans");
  redirect("/plans");
}

/** Map a plan's target metric / source onto a coarse module name for the feedback log. */
function deriveModule(targetMetric: string, sourceCouncilId: string | null): string {
  if (sourceCouncilId) return "GROUP";
  switch ((targetMetric ?? "").toLowerCase()) {
    case "occupancy":   return "HOTELS";
    case "expiry_risk": return "DAIRY";
    case "yield":       return "FARMS";
    case "margin":      return "FINANCE";
    case "revenue":     return "FINANCE";
    case "demand":      return "SUPPLY";
    case "inventory":   return "DAIRY";
    default:            return "GROUP";
  }
}
