"use server";

// Phase V3-P5 — Share to Council. Server action used by the
// "MessageSquareShare" buttons on every insight card across the app.
// Writes a CouncilDiscussion row scoped to the user's active tenant.
// Tenant scoping is enforced by the workspaceScope middleware via
// TENANT_SCOPED_MODELS — we just call prisma.councilDiscussion.create.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { flashToast } from "@/lib/toast";
import { getLocale } from "@/lib/i18n.server";

export async function shareInsightToCouncil(formData: FormData): Promise<void> {
  const me = await requireUser();
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const insightId = String(formData.get("insightId") ?? "").trim() || null;
  if (!title || !body) return;

  await prisma.councilDiscussion.create({
    data: {
      title,
      body,
      insightId,
      sharedByUserId: me.id,
      // tenantId is auto-stamped by workspaceScope middleware when
      // the active workspace cookie is set; ADMIN with no tenant
      // falls back to the literal slug provided here.
      ...(me.tenantSlug ? { tenantId: me.tenantSlug } : { tenantId: "hourani-hotels" }),
      status: "OPEN",
    },
  });

  const ar = getLocale() === "ar";
  flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تمت المشاركة مع المجلس" : "Shared with the Council",
  });
  revalidatePath("/brain/council");
  redirect("/brain/council");
}

// Phase V3-NEW-5 — reply on a Council discussion thread. ADMIN +
// EXECUTIVE may post replies; other roles can read but not write.
export async function replyToDiscussion(formData: FormData): Promise<void> {
  const me = await requireUser();
  if (!["ADMIN", "EXECUTIVE"].includes(me.role)) {
    throw new Error("forbidden");
  }
  const discussionId = String(formData.get("discussionId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!discussionId || !body) return;

  // Resolve parent thread to inherit tenantId (denormalized for
  // direct middleware scoping on CouncilReply).
  const parent = await prisma.councilDiscussion.findUnique({
    where: { id: discussionId },
    select: { tenantId: true },
  });
  if (!parent) return;

  await prisma.councilReply.create({
    data: {
      discussionId,
      tenantId: parent.tenantId,
      authorUserId: me.id,
      body,
    },
  });

  // Touch the discussion so list views can sort by recent activity.
  await prisma.councilDiscussion.update({
    where: { id: discussionId },
    data: { updatedAt: new Date() },
  });

  const ar = getLocale() === "ar";
  flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم نشر الرد في المجلس" : "Reply posted to council",
  });
  revalidatePath(`/brain/council/discussion/${discussionId}`);
  revalidatePath("/brain/council");
}
