"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { softDelete, softRestore, deletedLabel, restoredLabel } from "@/lib/softDelete";
import { flashToast } from "@/lib/toast";
import { logActivity } from "@/lib/activityLog";
import { runEngine, persistInsights } from "@/lib/aiEngine";
import { getLocale } from "@/lib/i18n.server";
import { recordFeedback } from "@/lib/brain/feedback.live";

const insightSchema = z.object({
  module: z.enum(["HOTELS", "DAIRY", "FARMS", "SUPPLY", "FINANCE", "EDUCATION"]),
  severity: z.enum(["INFO", "WARN", "CRITICAL", "OPPORTUNITY"]).default("INFO"),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
});

export async function createInsight(formData: FormData) {
  const user = await requireUser();
  const data = insightSchema.parse({
    module: formData.get("module"),
    severity: formData.get("severity") || "INFO",
    title: formData.get("title"),
    body: formData.get("body"),
  });
  const created = await prisma.aIInsight.create({
    data: {
      module: data.module,
      severity: data.severity,
      title: data.title,
      body: data.body,
      authorId: user.id,
      status: "OPEN",
    },
  });
  await logActivity({
    action: "INSIGHT",
    entity: "INSIGHT",
    entityId: created.id,
    summary: `إشارة جديدة: ${data.title}`,
    summaryEn: `New insight: ${data.title}`,
    module: data.module,
    meta: { severity: data.severity },
  });
  revalidatePath("/insights");
  redirect("/insights");
}

export async function setInsightStatus(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;
  const before = await prisma.aIInsight.findUnique({ where: { id } });
  await prisma.aIInsight.update({ where: { id }, data: { status } });
  if (before) {
    await logActivity({
      action: status === "RESOLVED" ? "APPROVE" : "UPDATE",
      entity: "INSIGHT",
      entityId: id,
      summary: `حالة الإشارة "${before.title}" → ${status}`,
      summaryEn: `Insight "${before.title}" status → ${status}`,
      meta: { from: before.status, to: status },
    });
    // Phase 7 — feedback signal
    if (status === "RESOLVED") {
      await recordFeedback({
        kind: "INSIGHT_RESOLVED",
        targetRef: id,
        targetType: "insight",
        module: before.module,
        category: deriveInsightCategory(before),
        userId: me.id,
      });
    } else if (status === "ACKNOWLEDGED") {
      await recordFeedback({
        kind: "INSIGHT_HELPFUL",
        targetRef: id,
        targetType: "insight",
        module: before.module,
        category: deriveInsightCategory(before),
        userId: me.id,
      });
    }
  }
  revalidatePath("/insights");
}

/** Quick-and-dirty category derivation from insight title/body. */
function deriveInsightCategory(i: { title: string; body: string; module: string }): string | undefined {
  const t = (i.title + " " + i.body).toLowerCase();
  if (/expir|انتهاء|labneh|لبنة/.test(t)) return "expiry";
  if (/margin|هامش/.test(t)) return "margin_low";
  if (/moisture|رطوبة/.test(t)) return "moisture";
  if (/treasury|energy|طاقة/.test(t)) return "treasury";
  if (/cohort|كوهورت/.test(t)) return "cohort";
  if (/promo|عرض/.test(t)) return "fb_promo";
  return undefined;
}

export async function deleteInsight(formData: FormData) {
  const me = await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.aIInsight.findUnique({ where: { id } });
  await softDelete("insight", id);
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "INSIGHT",
      entityId: id,
      summary: `حذف إشارة "${before.title}"`,
      summaryEn: `Deleted insight "${before.title}"`,
    });
    // Phase 7 — dismissal is the strongest negative signal we have
    await recordFeedback({
      kind: "INSIGHT_DISMISSED",
      targetRef: id,
      targetType: "insight",
      module: before.module,
      category: deriveInsightCategory(before),
      userId: me.id,
    });
  }
  flashToast({
    type: "deleted",
    entity: "insight",
    id,
    label: deletedLabel("insight"),
    restorePath: "/api/toast/undo",
  });
}

export async function bulkResolveInsights(ids: string[]) {
  const me = await requireRole("MANAGER");
  if (!ids.length) return;
  await prisma.aIInsight.updateMany({
    where: { id: { in: ids } },
    data: { status: "RESOLVED" },
  });
  await logActivity({
    action: "UPDATE",
    entity: "INSIGHT",
    entityId: ids[0],
    summary: `حل جماعي لـ ${ids.length} إشارات`,
    summaryEn: `Bulk resolved ${ids.length} insights`,
    meta: { ids, count: ids.length },
  });
  revalidatePath("/insights");
  revalidatePath("/dashboard");
}

export async function bulkDeleteInsights(ids: string[]) {
  const me = await requireRole("MANAGER");
  if (!ids.length) return;
  for (const id of ids) {
    await softDelete("insight", id);
  }
  await logActivity({
    action: "DELETE",
    entity: "INSIGHT",
    entityId: ids[0],
    summary: `حذف جماعي لـ ${ids.length} إشارات`,
    summaryEn: `Bulk deleted ${ids.length} insights`,
    meta: { ids, count: ids.length },
  });
  revalidatePath("/insights");
}

export async function restoreInsight(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await softRestore("insight", id);
  const after = await prisma.aIInsight.findUnique({ where: { id } });
  if (after) {
    await logActivity({
      action: "RESTORE",
      entity: "INSIGHT",
      entityId: id,
      summary: `استعادة إشارة "${after.title}"`,
      summaryEn: `Restored insight "${after.title}"`,
    });
  }
  flashToast({
    type: "restored",
    entity: "insight",
    id,
    label: restoredLabel("insight"),
  });
}

// === PLANNER — generate an action plan from an insight via the Brain's planner ===
export async function generateInsightPlan(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const locale = getLocale();
  const lc: "ar" | "en" = locale === "ar" ? "ar" : "en";
  if (!id) return;

  const { generatePlanFromInsight } = await import("@/lib/brain/planner.live");
  const plan = await generatePlanFromInsight(id, lc);

  await logActivity({
    action: "INSIGHT",
    entity: "INSIGHT",
    entityId: plan.id,
    summary: `خطة مولّدة من إشارة: ${plan.goal}`,
    summaryEn: `Plan generated from insight: ${(plan as any).goalEn ?? plan.goal}`,
  });

  flashToast({
    type: "info",
    entity: "info",
    id: plan.id,
    label: lc === "ar"
      ? `خطة جديدة: ${plan.goal}`
      : `New plan: ${(plan as any).goalEn ?? plan.goal}`,
  });

  revalidatePath("/insights");
  revalidatePath("/plans");
}

// === AI ENGINE — runs heuristics across all modules and persists fresh insights ===
export async function runAiEngine() {
  const user = await requireUser();
  const locale = getLocale();
  const lc: "ar" | "en" = locale === "ar" ? "ar" : "en";

  const generated = await runEngine();
  const { created, skipped } = await persistInsights(generated, user.id, lc);

  await logActivity({
    action: "INSIGHT",
    entity: "INSIGHT",
    summary: `محرك AI: ${created} إشارة جديدة (${skipped} مكررة)`,
    summaryEn: `AI engine: ${created} new insights (${skipped} skipped)`,
  });

  flashToast({
    type: "info",
    entity: "insight",
    id: "ai-engine",
    label: lc === "ar"
      ? `محرك الذكاء: ${created} إشارة جديدة${skipped ? ` · ${skipped} مكررة تم تخطيها` : ""}`
      : `AI engine: ${created} new insights${skipped ? ` · ${skipped} duplicates skipped` : ""}`,
  });

  revalidatePath("/insights");
  revalidatePath("/dashboard");
}
