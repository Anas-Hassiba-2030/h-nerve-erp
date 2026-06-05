"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { softDelete, softRestore, deletedLabel, restoredLabel } from "@/lib/db/softDelete";
import { flashToast } from "@/lib/utils/toast";
import { logActivity } from "@/lib/auth/activityLog";
import { runEngine, persistInsights } from "@/lib/ai/aiEngine";
import { getLocale } from "@/lib/i18n/i18n.server";
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
  // ISO-4 — pin a manually-authored insight to the author's active workspace
  // so a pinned operator's signals stay company-scoped; a cross-company ADMIN
  // (no active workspace) leaves it NULL = group-wide. The scoped middleware
  // enforces the same rule on the write.
  const created = await prisma.aIInsight.create({
    data: {
      module: data.module,
      severity: data.severity,
      title: data.title,
      body: data.body,
      authorId: user.id,
      companyId: getActiveWorkspaceId(),
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
  const locale = getLocale();
  const ar = locale === "ar";
  // ISO-4 ownership — the scoped client nulls an insight outside the caller's
  // workspace (shared-company guard), so a null row means foreign or gone.
  // Bail before the write so a pinned operator can't flip another company's
  // insight by id. Surface the bail as a toast so the user knows the click
  // landed but the row isn't theirs to touch (silent return reads as broken).
  const before = await prisma.aIInsight.findUnique({ where: { id } });
  if (!before) {
    flashToast({
      type: "info",
      entity: "insight",
      id,
      label: ar ? "هذه الإشارة ليست في مساحة عملك الحالية" : "This signal isn't in your active workspace",
    });
    revalidatePath("/insights");
    return;
  }
  await prisma.aIInsight.update({ where: { id }, data: { status } });
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
  // Visible confirmation — without this the row just greys out silently and
  // users (rightly) wonder whether the click actually fired.
  flashToast({
    type: "info",
    entity: "insight",
    id,
    label: ar
      ? (status === "RESOLVED" ? `حُلّت: ${before.title}` : `الحالة → ${status}`)
      : (status === "RESOLVED" ? `Resolved: ${before.title}` : `Status → ${status}`),
  });
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
  // ISO-4 ownership — null row = foreign/gone; bail before soft-deleting.
  const before = await prisma.aIInsight.findUnique({ where: { id } });
  if (!before) return;
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
  const locale = getLocale();
  const ar = locale === "ar";
  if (!ids.length) {
    flashToast({
      type: "info",
      entity: "insight",
      id: "bulk-resolve",
      label: ar ? "لا توجد إشارات مفتوحة لإغلاقها" : "No open signals to resolve",
    });
    revalidatePath("/insights");
    return;
  }
  const result = await prisma.aIInsight.updateMany({
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
  flashToast({
    type: "info",
    entity: "insight",
    id: "bulk-resolve",
    label: ar
      ? `حُلّت ${result.count} إشارات`
      : `Resolved ${result.count} signals`,
  });
  revalidatePath("/insights");
  revalidatePath("/dashboard");
}

export async function bulkDeleteInsights(ids: string[]) {
  const me = await requireRole("MANAGER");
  const locale = getLocale();
  const ar = locale === "ar";
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
  flashToast({
    type: "info",
    entity: "insight",
    id: "bulk-delete",
    label: ar ? `حُذفت ${ids.length} إشارات` : `Deleted ${ids.length} signals`,
  });
  revalidatePath("/insights");
}

export async function restoreInsight(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // ISO-4 ownership — findUnique returns the (soft-deleted) row only when the
  // caller's workspace owns it or it's group-wide; null = foreign/gone, bail.
  const after = await prisma.aIInsight.findUnique({ where: { id } });
  if (!after) return;
  await softRestore("insight", id);
  await logActivity({
    action: "RESTORE",
    entity: "INSIGHT",
    entityId: id,
    summary: `استعادة إشارة "${after.title}"`,
    summaryEn: `Restored insight "${after.title}"`,
  });
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

  // Every failure path must surface a toast — a silent throw makes the click
  // look broken even when the auth + DB layer are working correctly.
  try {
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
  } catch (e) {
    const msg = (e as Error).message || "unknown";
    flashToast({
      type: "info",
      entity: "insight",
      id,
      label: lc === "ar"
        ? `تعذّر توليد الخطة: ${msg}`
        : `Could not generate plan: ${msg}`,
    });
  }

  revalidatePath("/insights");
  revalidatePath("/plans");
}

// === AI ENGINE — runs heuristics across all modules and persists fresh insights ===
export async function runAiEngine() {
  const user = await requireUser();
  const locale = getLocale();
  const lc: "ar" | "en" = locale === "ar" ? "ar" : "en";

  // The engine runs ~10 parallel heuristics; if any one throws (schema drift,
  // missing table, scoping mismatch) Promise.all rejects and the whole action
  // dies silently. Catch + toast so the user always sees the click landed.
  try {
    const generated = await runEngine();
    const { created, skipped } = await persistInsights(generated, user.id);

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
  } catch (e) {
    const msg = (e as Error).message || "unknown";
    flashToast({
      type: "info",
      entity: "insight",
      id: "ai-engine",
      label: lc === "ar"
        ? `تعذّر تشغيل المحرك: ${msg}`
        : `Engine failed: ${msg}`,
    });
  }

  revalidatePath("/insights");
  revalidatePath("/dashboard");
}
