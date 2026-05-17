"use server";

// Server actions for /admin/brain (Phase 10). Thin wrappers over the
// lib/intelligence engine — gate(), run/dismiss/resolve, flashToast +
// revalidate (the dashboard's AI-signals count reads BrainInsight too,
// so it's revalidated alongside). Form-action shaped (FormData) like
// the rest of the admin family.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { flashToast } from "@/lib/toast";
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
}
function refresh() {
  revalidatePath("/admin/brain");
  revalidatePath("/dashboard");
}

export async function runAnalysis(formData: FormData): Promise<void> {
  await gate();
  const ar = getLocale() === "ar";
  const tenantId =
    String(formData.get("tenantId") ?? "").trim() || "hourani-hotels";
  const r = await runBrainAnalysis(tenantId);
  flashToast({
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
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await engineDismiss(id);
  const ar = getLocale() === "ar";
  flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم تجاهل الرؤية" : "Insight dismissed",
  });
  refresh();
}

export async function resolveInsight(formData: FormData): Promise<void> {
  await gate();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await engineResolve(id);
  const ar = getLocale() === "ar";
  flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم حلّ الرؤية" : "Insight resolved",
  });
  refresh();
}
