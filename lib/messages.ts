// Messaging helpers — server-only.
// Threads can be DIRECT (between two users), GROUP, or ENTITY (anchored
// to a specific record like a forecast or booking).

import "server-only";
import { prisma } from "./db";

export type ThreadKind = "DIRECT" | "GROUP" | "ENTITY";

/** Find or create a direct 1-1 thread between two users. */
export async function ensureDirectThread(
  userIdA: string,
  userIdB: string,
): Promise<string> {
  // Find an existing direct thread that has both participants
  const candidates = await prisma.messageThread.findMany({
    where: {
      kind: "DIRECT",
      participants: { some: { userId: userIdA } },
    },
    include: { participants: true },
    take: 50,
  });
  const existing = candidates.find((t) => {
    const ids = t.participants.map((p) => p.userId);
    return ids.length === 2 && ids.includes(userIdA) && ids.includes(userIdB);
  });
  if (existing) return existing.id;

  const t = await prisma.messageThread.create({
    data: {
      kind: "DIRECT",
      createdById: userIdA,
      participants: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
  });
  return t.id;
}

/** Total unread count for a user across all threads. */
export async function unreadCountFor(userId: string): Promise<number> {
  const parts = await prisma.threadParticipant.findMany({
    where: { userId },
    select: { threadId: true, lastReadAt: true },
  });
  if (parts.length === 0) return 0;
  let total = 0;
  for (const p of parts) {
    const since = p.lastReadAt ?? new Date(0);
    const n = await prisma.message.count({
      where: {
        threadId: p.threadId,
        authorId: { not: userId },
        deletedAt: null,
        createdAt: { gt: since },
      },
    });
    total += n;
  }
  return total;
}

/** List threads for a user with last-message preview + unread count. */
export async function listThreadsFor(userId: string) {
  const parts = await prisma.threadParticipant.findMany({
    where: { userId },
    include: {
      thread: {
        include: {
          participants: { include: { user: true } },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { author: true },
          },
        },
      },
    },
  });

  // Sort by last message timestamp (newest first)
  const enriched = await Promise.all(
    parts.map(async (p) => {
      const since = p.lastReadAt ?? new Date(0);
      const unread = await prisma.message.count({
        where: {
          threadId: p.threadId,
          authorId: { not: userId },
          deletedAt: null,
          createdAt: { gt: since },
        },
      });
      const last = p.thread.messages[0];
      return {
        thread: p.thread,
        last,
        unread,
        muted: p.muted,
        lastReadAt: p.lastReadAt,
      };
    }),
  );

  enriched.sort((a, b) => {
    const ta = a.last?.createdAt.getTime() ?? a.thread.createdAt.getTime();
    const tb = b.last?.createdAt.getTime() ?? b.thread.createdAt.getTime();
    return tb - ta;
  });
  return enriched;
}

/** Mark a thread as read up to now for a user. */
export async function markThreadRead(threadId: string, userId: string) {
  await prisma.threadParticipant.updateMany({
    where: { threadId, userId },
    data: { lastReadAt: new Date() },
  });
}
