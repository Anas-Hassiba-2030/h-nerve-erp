"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { ensureDirectThread, markThreadRead } from "@/lib/utils/messages";
import { flashToast } from "@/lib/utils/toast";
import { getLocale } from "@/lib/i18n/i18n.server";
import { logActivity } from "@/lib/auth/activityLog";

const sendSchema = z.object({
  threadId: z.string().min(1),
  // Phase NS-2 — body OR imageUrl is now sufficient (one or both).
  // The composer enforces the user-facing min-1 requirement.
  body: z.string().max(4000).default(""),
  refType: z.string().max(40).optional(),
  refId: z.string().max(80).optional(),
  // Data URI (image/png, image/jpeg, image/webp, image/gif). Hard
  // cap at ~1.4 MB which corresponds to ~1 MB of binary at base64
  // overhead. Larger uploads are rejected client-side by the picker.
  imageUrl: z
    .string()
    .max(1_400_000)
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const ar = (await getLocale()) === "ar";
  // parse() + the empty/participant guards all throw; without a catch a failed
  // send just vanishes with no feedback. Toast on failure only (a successful
  // send shouldn't nag — the new message appearing IS the confirmation).
  let threadId = "";
  try {
    const data = sendSchema.parse({
      threadId: formData.get("threadId"),
      body: formData.get("body") ?? "",
      refType: formData.get("refType") ?? undefined,
      refId: formData.get("refId") ?? undefined,
      imageUrl: formData.get("imageUrl") ?? undefined,
    });
    threadId = data.threadId;
    // After parse: require at least one of (trimmed body, imageUrl). A
    // whitespace-only body ("   ") is not a message.
    const trimmedBody = data.body.trim();
    if (!trimmedBody && !data.imageUrl) {
      throw new Error("empty");
    }

    // Verify the user is a participant of this thread
    const part = await prisma.threadParticipant.findFirst({
      where: { threadId: data.threadId, userId: user.id },
    });
    if (!part) throw new Error("forbidden");

    await prisma.message.create({
      data: {
        threadId: data.threadId,
        authorId: user.id,
        body: trimmedBody,
        imageUrl: data.imageUrl ?? null,
        refType: data.refType ?? null,
        refId: data.refId ?? null,
      },
    });
    await prisma.messageThread.update({
      where: { id: data.threadId },
      data: { updatedAt: new Date() },
    });
    await markThreadRead(data.threadId, user.id);

    await logActivity({
      action: "CREATE",
      entity: "USER",
      entityId: data.threadId,
      summary: `رسالة جديدة من ${user.name}`,
      summaryEn: `New message from ${user.name}`,
      module: "MESSAGES",
    });
  } catch (e) {
    const msg = (e as Error)?.message;
    await flashToast({
      type: "info", entity: "info", id: "send-msg",
      label: msg === "forbidden"
        ? (ar ? "لست عضواً في هذه المحادثة" : "You're not a participant of this thread")
        : (ar ? "تعذّر إرسال الرسالة" : "Couldn't send the message"),
    });
    revalidatePath("/messages");
    if (threadId) revalidatePath(`/messages/${threadId}`);
    return;
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${threadId}`);
}

const startSchema = z.object({
  toUserId: z.string().min(1),
  body: z.string().min(1).max(4000).optional(),
});

export async function startDirectThread(formData: FormData) {
  const user = await requireUser();
  const ar = (await getLocale()) === "ar";
  let threadId = "";
  try {
    const data = startSchema.parse({
      toUserId: formData.get("toUserId"),
      body: formData.get("body") ?? undefined,
    });
    if (data.toUserId === user.id) throw new Error("self");

    threadId = await ensureDirectThread(user.id, data.toUserId);
    if (data.body) {
      await prisma.message.create({
        data: {
          threadId,
          authorId: user.id,
          body: data.body,
        },
      });
      await prisma.messageThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });
      await markThreadRead(threadId, user.id);
    }
  } catch (e) {
    const msg = (e as Error)?.message;
    await flashToast({
      type: "info", entity: "info", id: "start-thread",
      label: msg === "self"
        ? (ar ? "لا يمكنك مراسلة نفسك" : "You can't message yourself")
        : (ar ? "تعذّر بدء المحادثة" : "Couldn't start the conversation"),
    });
    revalidatePath("/messages");
    return;
  }
  revalidatePath("/messages");
  redirect(`/messages/${threadId}`);
}

export async function markRead(formData: FormData) {
  const user = await requireUser();
  const threadId = String(formData.get("threadId") ?? "");
  if (!threadId) return;
  await markThreadRead(threadId, user.id);
  revalidatePath("/messages");
}
