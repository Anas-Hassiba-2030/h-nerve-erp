"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ensureDirectThread, markThreadRead } from "@/lib/messages";
import { logActivity } from "@/lib/activityLog";

const sendSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(4000),
  refType: z.string().max(40).optional(),
  refId: z.string().max(80).optional(),
});

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const data = sendSchema.parse({
    threadId: formData.get("threadId"),
    body: formData.get("body"),
    refType: formData.get("refType") ?? undefined,
    refId: formData.get("refId") ?? undefined,
  });

  // Verify the user is a participant of this thread
  const part = await prisma.threadParticipant.findFirst({
    where: { threadId: data.threadId, userId: user.id },
  });
  if (!part) throw new Error("Forbidden");

  await prisma.message.create({
    data: {
      threadId: data.threadId,
      authorId: user.id,
      body: data.body,
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

  revalidatePath("/messages");
  revalidatePath(`/messages/${data.threadId}`);
}

const startSchema = z.object({
  toUserId: z.string().min(1),
  body: z.string().min(1).max(4000).optional(),
});

export async function startDirectThread(formData: FormData) {
  const user = await requireUser();
  const data = startSchema.parse({
    toUserId: formData.get("toUserId"),
    body: formData.get("body") ?? undefined,
  });
  if (data.toUserId === user.id) throw new Error("Cannot message yourself");

  const threadId = await ensureDirectThread(user.id, data.toUserId);
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
