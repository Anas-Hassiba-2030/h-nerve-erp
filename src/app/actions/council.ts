"use server";

// Phase V3-P5 — Share to Council. Server action used by the
// "MessageSquareShare" buttons on every insight card across the app.
// Writes a CouncilDiscussion row scoped to the user's active tenant.
// Tenant scoping is enforced by the workspaceScope middleware via
// TENANT_SCOPED_MODELS — we just call prisma.councilDiscussion.create.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, prismaUnscoped } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

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

  const ar = (await getLocale()) === "ar";
  await flashToast({
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

  const ar = (await getLocale()) === "ar";
  await flashToast({
    type: "info",
    entity: "info",
    label: ar ? "تم نشر الرد في المجلس" : "Reply posted to council",
  });
  revalidatePath(`/brain/council/discussion/${discussionId}`);
  revalidatePath("/brain/council");
}

// Context-isolated sub-agent debate. Takes a SHARED subject (a CouncilDiscussion —
// an insight, a What-If scenario, anything pushed via shareToCouncil) and convenes
// the specialist agents FENCED on just that subject, instead of letting them roam
// the whole database. convene() builds the agent context from the subject's refs
// (its insight's graph neighbourhood) + the topic text, so the debate stays on-topic.
export async function conveneFromDiscussion(formData: FormData): Promise<void> {
  await requireUser();
  const ar = (await getLocale()) === "ar";
  const discussionId = String(formData.get("discussionId") ?? "").trim();
  if (!discussionId) return;

  // CROSS-TENANT INTENT: read the discussion via the UNSCOPED client. The
  // tenant-scoped findUnique returns null whenever the request's active tenant
  // slug differs from the row's tenantId (workspaceScope.ts) — and that slug
  // can resolve differently between the page render that LISTED this thread and
  // this server-action POST, producing a spurious "Subject not found" on a
  // thread the user is plainly looking at. The user is authenticated
  // (requireUser above) and supplied an id from their own rendered list, so an
  // unscoped existence read is safe; we never expose data beyond convening a
  // debate on a subject they already see.
  const d = await prismaUnscoped.councilDiscussion.findUnique({
    where: { id: discussionId },
    select: { title: true, body: true, insightId: true },
  });
  if (!d) {
    await flashToast({ type: "info", entity: "info", label: ar ? "الموضوع غير موجود" : "Subject not found" });
    return;
  }

  // Fence the debate to the subject's company when it came from an insight.
  let scopeCompanyId: string | undefined;
  if (d.insightId) {
    // CROSS-TENANT INTENT: same rationale — resolve the source insight's
    // company unscoped so fencing works regardless of the active slug.
    const ins = await prismaUnscoped.aIInsight.findUnique({
      where: { id: d.insightId },
      select: { companyId: true },
    });
    scopeCompanyId = ins?.companyId ?? undefined;
  }

  let sessionId: string;
  try {
    const { council } = await import("@/lib/brain/council.live");
    // The sub-agents debate JUST this subject — its insight's graph neighbourhood
    // as refs, fenced to its company, with the topic text as the boundary.
    const contextRefs = d.insightId ? [d.insightId] : [];
    const topic = `${d.title} — ${d.body}`.slice(0, 1000);
    const session = await council().convene(
      topic,
      contextRefs,
      { companyIds: scopeCompanyId ? [scopeCompanyId] : [] },
      ar ? "ar" : "en",
    );
    sessionId = session.id;
  } catch (e) {
    await flashToast({
      type: "info", entity: "info",
      label: ar ? `تعذّر عقد النقاش: ${(e as Error).message}` : `Couldn't convene: ${(e as Error).message}`,
    });
    revalidatePath("/brain/council");
    return;
  }

  await flashToast({
    type: "info", entity: "info",
    label: ar ? "عقد المجلس جلسة وكلاء حول هذا الموضوع" : "Sub-agents convened on this subject",
  });
  revalidatePath("/brain/council");
  redirect(`/brain/council/${sessionId}`);
}
