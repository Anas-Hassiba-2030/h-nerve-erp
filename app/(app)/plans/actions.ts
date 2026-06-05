"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import {
  generatePlanFromCouncil,
  generatePlanFromInsight,
  commitPlan as commitPlanLib,
  abandonPlan as abandonPlanLib,
  completeStep as completeStepLib,
  blockStep as blockStepLib,
} from "@/lib/brain/planner.live";
import { recordFeedback } from "@/lib/brain/feedback.live";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";

export async function generateFromCouncil(formData: FormData): Promise<void> {
  await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const locale = getLocale() as "ar" | "en";
  const ar = locale === "ar";
  if (!sessionId) {
    flashToast({ type: "info", entity: "info", id: "gen", label: ar ? "معرف الجلسة مفقود" : "Session id missing" });
    revalidatePath("/plans");
    return;
  }
  let planId: string | null = null;
  try {
    const plan = await generatePlanFromCouncil(sessionId, locale);
    planId = plan.id;
  } catch (e) {
    flashToast({
      type: "info", entity: "info", id: "gen",
      label: ar ? `تعذّر توليد الخطة: ${(e as Error).message}` : `Could not generate plan: ${(e as Error).message}`,
    });
    revalidatePath("/plans");
    return;
  }
  revalidatePath("/plans");
  revalidatePath(`/brain/council/${sessionId}`);
  redirect(`/plans/${planId}`);
}

export async function generateFromInsight(formData: FormData): Promise<void> {
  await requireUser();
  const insightId = String(formData.get("insightId") ?? "");
  const locale = getLocale() as "ar" | "en";
  const ar = locale === "ar";
  if (!insightId) {
    flashToast({ type: "info", entity: "info", id: "gen", label: ar ? "معرف الإشارة مفقود" : "Insight id missing" });
    revalidatePath("/plans");
    return;
  }
  let planId: string | null = null;
  try {
    const plan = await generatePlanFromInsight(insightId, locale);
    planId = plan.id;
  } catch (e) {
    flashToast({
      type: "info", entity: "info", id: "gen",
      label: ar ? `تعذّر توليد الخطة: ${(e as Error).message}` : `Could not generate plan: ${(e as Error).message}`,
    });
    revalidatePath("/plans");
    revalidatePath("/insights");
    return;
  }
  revalidatePath("/plans");
  revalidatePath("/insights");
  redirect(`/plans/${planId}`);
}

export async function commit(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  let plan: Awaited<ReturnType<typeof prisma.plan.findUnique>> = null;
  try {
    await commitPlanLib(id, me.id);
    // Phase 7 — feedback signal
    plan = await prisma.plan.findUnique({ where: { id } });
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
  } catch (e) {
    flashToast({
      type: "info", entity: "info", id: "commit",
      label: ar ? `تعذّر اعتماد الخطة: ${(e as Error).message}` : `Could not commit plan: ${(e as Error).message}`,
    });
    revalidatePath(`/plans/${id}`);
    revalidatePath("/plans");
    return;
  }

  // Visible confirmation. The plan flips to ACTIVE in place (chip + KPI update),
  // but without a toast the click reads as "nothing happened" — the user can't
  // tell where the plan went. Name it + its new state so the result is obvious.
  const goal = plan ? (ar ? plan.goal : ((plan as any).goalEn || plan.goal)) : "";
  flashToast({
    type: "info", entity: "info", id: "commit",
    label: ar ? `اعتُمدت الخطة وأصبحت قيد التنفيذ: ${goal}` : `Plan committed — now active: ${goal}`,
  });
  revalidatePath(`/plans/${id}`);
  revalidatePath("/plans");
}

export async function abandon(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = getLocale() === "ar";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const plan = await prisma.plan.findUnique({ where: { id } });
  try {
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
  } catch (e) {
    flashToast({
      type: "info", entity: "info", id: "abandon",
      label: ar ? `تعذّر إلغاء الخطة: ${(e as Error).message}` : `Could not abandon plan: ${(e as Error).message}`,
    });
    revalidatePath(`/plans/${id}`);
    revalidatePath("/plans");
    return;
  }

  const goal = plan ? (ar ? plan.goal : ((plan as any).goalEn || plan.goal)) : "";
  flashToast({
    type: "info", entity: "info", id: "abandon",
    label: ar ? `أُلغيت الخطة: ${goal}` : `Plan abandoned: ${goal}`,
  });
  revalidatePath(`/plans/${id}`);
  revalidatePath("/plans");
}

export async function markStepDone(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = getLocale() === "ar";
  const stepId = String(formData.get("stepId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!stepId) throw new Error("stepId required");
  const step = await prisma.planStep.findUnique({ where: { id: stepId } });
  let planCompleted = false;
  try {
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
        planCompleted = true;
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
  } catch (e) {
    flashToast({
      type: "info", entity: "info", id: "step-done",
      label: ar ? `تعذّر إكمال الخطوة: ${(e as Error).message}` : `Could not complete step: ${(e as Error).message}`,
    });
    revalidatePath(`/plans/${planId}`);
    revalidatePath("/plans");
    return;
  }

  flashToast({
    type: "info", entity: "info", id: "step-done",
    label: planCompleted
      ? (ar ? "اكتملت الخطة بالكامل ✓" : "Plan fully completed ✓")
      : (ar ? "أُنجزت الخطوة" : "Step marked done"),
  });
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
}

export async function markStepBlocked(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = getLocale() === "ar";
  const stepId = String(formData.get("stepId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 320) || null;
  if (!stepId) throw new Error("stepId required");
  const step = await prisma.planStep.findUnique({ where: { id: stepId } });
  try {
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
  } catch (e) {
    flashToast({
      type: "info", entity: "info", id: "step-blocked",
      label: ar ? `تعذّر تعليق الخطوة: ${(e as Error).message}` : `Could not block step: ${(e as Error).message}`,
    });
    revalidatePath(`/plans/${planId}`);
    return;
  }

  flashToast({
    type: "info", entity: "info", id: "step-blocked",
    label: ar ? "عُلّقت الخطوة" : "Step marked blocked",
  });
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/plans");
}

export async function deletePlan(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
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
