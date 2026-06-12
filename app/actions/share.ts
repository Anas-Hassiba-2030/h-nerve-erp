"use server";

// Universal internal sharing. Any live object — an insight, a plan, a What-If
// scenario, a dashboard metric — can be pushed to:
//   • the Council  → a CouncilDiscussion subject (then sub-agents can debate it)
//   • a colleague  → straight into their direct-message feed
//
// The reusable <ShareMenu> client component drives both. These actions are
// object-agnostic: they take a plain title + body summary (+ optional ref so the
// receiving surface can deep-link back), so a new surface is a 2-line add.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { ensureDirectThread, markThreadRead } from "@/lib/utils/messages";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";

/** Share ANY object to the Council as a discussion subject. */
export async function shareToCouncil(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = (await getLocale()) === "ar";
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const insightId = String(formData.get("insightId") ?? "").trim() || null;
  if (!title || !body) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد محتوى للمشاركة" : "Nothing to share" });
    return;
  }
  try {
    await prisma.councilDiscussion.create({
      data: {
        title,
        body,
        insightId,
        sharedByUserId: me.id,
        // tenantId is auto-stamped by the scoped middleware when a workspace is
        // active; a cross-tenant ADMIN falls back to the group slug.
        ...(me.tenantSlug ? { tenantId: me.tenantSlug } : { tenantId: "hourani-hotels" }),
        status: "OPEN",
      },
    });
  } catch (e) {
    await flashToast({
      type: "info", entity: "info",
      label: ar ? `تعذّرت المشاركة: ${(e as Error).message}` : `Share failed: ${(e as Error).message}`,
    });
    revalidatePath("/brain/council");
    return;
  }
  await flashToast({ type: "info", entity: "info", label: ar ? "تمت المشاركة مع المجلس" : "Shared to the Council" });
  revalidatePath("/brain/council");
  redirect("/brain/council");
}

/** Share ANY object straight into a colleague's direct-message feed. */
export async function shareToMember(formData: FormData): Promise<void> {
  const me = await requireUser();
  const ar = (await getLocale()) === "ar";
  const toUserId = String(formData.get("toUserId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 300);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const refType = String(formData.get("refType") ?? "").trim() || null;
  const refId = String(formData.get("refId") ?? "").trim() || null;

  if (!toUserId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اختر زميلاً أولاً" : "Pick a colleague first" });
    return;
  }
  if (toUserId === me.id) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يمكنك المشاركة مع نفسك" : "Can't share to yourself" });
    return;
  }
  if (!title) {
    await flashToast({ type: "info", entity: "info", label: ar ? "لا يوجد محتوى للمشاركة" : "Nothing to share" });
    return;
  }

  let threadId = "";
  try {
    // Guard: target must be a real user (the picker is server-rendered, but
    // never trust the posted id).
    const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true, name: true } });
    if (!target) {
      await flashToast({ type: "info", entity: "info", label: ar ? "الزميل غير موجود" : "Colleague not found" });
      return;
    }
    threadId = await ensureDirectThread(me.id, toUserId);
    const text = (ar ? `📤 شاركك ${me.name}: ${title}` : `📤 ${me.name} shared: ${title}`) + (body ? `\n\n${body}` : "");
    await prisma.message.create({
      data: { threadId, authorId: me.id, body: text.slice(0, 4000), refType, refId },
    });
    await prisma.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    await markThreadRead(threadId, me.id);
  } catch (e) {
    await flashToast({
      type: "info", entity: "info",
      label: ar ? `تعذّرت المشاركة: ${(e as Error).message}` : `Share failed: ${(e as Error).message}`,
    });
    revalidatePath("/messages");
    return;
  }
  await flashToast({ type: "info", entity: "info", label: ar ? "تمت المشاركة في محادثة الزميل" : "Shared to their inbox" });
  revalidatePath("/messages");
  redirect(`/messages/${threadId}`);
}
