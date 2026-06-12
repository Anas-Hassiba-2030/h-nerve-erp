"use server";

// Server actions for /admin/brain (Phase 10). Thin wrappers over the
// lib/intelligence engine — gate(), run/dismiss/resolve, flashToast +
// revalidate (the dashboard's AI-signals count reads BrainInsight too,
// so it's revalidated alongside). Form-action shaped (FormData) like
// the rest of the admin family.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { prisma } from "@/lib/db/db";
import { resolveAdminTenantId } from "@/lib/auth/adminActionScope";
import {
  runBrainAnalysis,
  dismissInsight as engineDismiss,
  resolveInsight as engineResolve,
} from "@/lib/intelligence/engine";

async function gate() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}
function refresh() {
  revalidatePath("/admin/brain");
  revalidatePath("/dashboard");
}
async function warn(label: string) {
  await flashToast({ type: "info", entity: "info", label: `⚠ ${label}` });
  refresh();
}

export async function runAnalysis(formData: FormData): Promise<void> {
  const user = await gate();
  const ar = (await getLocale()) === "ar";
  // ISOLATION-FIX — never trust the submitted tenantId. runBrainAnalysis
  // reads+writes that tenant's data via the UNSCOPED client, so a pinned
  // operator who passed a foreign tenantId would otherwise read and write
  // BrainInsight into another tenant. resolveAdminTenantId forces a pinned
  // caller to their own tenantSlug; a cross-tenant ADMIN may target any
  // tenant (default "hourani-hotels" in single-tenant mode).
  const scope = resolveAdminTenantId(
    user,
    String(formData.get("tenantId") ?? "").trim() || "hourani-hotels",
  );
  if (!scope) return warn(ar ? "المستأجر مطلوب" : "Tenant is required");
  // The engine touches the DB; a failure here would otherwise throw an
  // uncaught 500. Convert it to a toast like the dismiss/resolve siblings.
  let r: Awaited<ReturnType<typeof runBrainAnalysis>>;
  try {
    r = await runBrainAnalysis(scope.tenantId);
  } catch (e) {
    return warn(
      ar
        ? `فشل التحليل: ${e instanceof Error ? e.message : ""}`
        : `Analysis failed: ${e instanceof Error ? e.message : ""}`,
    );
  }
  await flashToast({
    type: "info",
    entity: "info",
    label: ar
      ? `التحليل: ${r.generated} جديدة، ${r.updated} محدّثة، ${r.unchanged} دون تغيير`
      : `Analysis: ${r.generated} new, ${r.updated} updated, ${r.unchanged} unchanged`,
  });
  refresh();
}

export async function dismissInsight(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  // ISOLATION-FIX — the engine dismisses via the UNSCOPED client (by id,
  // no tenant check), so verify ownership through the SCOPED client first:
  // findUnique returns null when the insight is outside the caller's active
  // tenant (a pinned operator), so another tenant's signal can't be
  // dismissed. ADMIN (no tenant cookie) passes through and may act on any.
  const owned = await prisma.brainInsight.findUnique({ where: { id }, select: { id: true } });
  if (!owned) return warn(ar ? "الرؤية غير موجودة" : "Insight not found");
  await engineDismiss(id);
  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم تجاهل الرؤية" : "Insight dismissed",
  });
  refresh();
}

export async function resolveInsight(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  // ISOLATION-FIX — same ownership gate as dismissInsight: the engine
  // resolves via the UNSCOPED client by id, so confirm the insight is in
  // the caller's active tenant through the SCOPED client before resolving.
  const owned = await prisma.brainInsight.findUnique({ where: { id }, select: { id: true } });
  if (!owned) return warn(ar ? "الرؤية غير موجودة" : "Insight not found");
  await engineResolve(id);
  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حلّ الرؤية" : "Insight resolved",
  });
  refresh();
}
