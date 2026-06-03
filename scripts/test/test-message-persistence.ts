// scripts/test-message-persistence.ts
//
// BUG-B — verify chat messages persist to the DB and survive a refetch,
// including the NS-2 imageUrl carryover.
//
//   npx tsx scripts/test-message-persistence.ts
//
// sendMessage() is a "use server" action that calls requireUser()/cookies()
// and can't run outside a request scope, so this exercises its persistence
// core directly: prisma.message.create(...) (exactly what the action does)
// + the same findMany refetch the thread page uses. Creates a throwaway
// thread, asserts, then fully cleans up.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1×1 transparent PNG data URI — mirrors what the NS-2 composer posts.
const TEST_IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let failures = 0;
function check(label: string, cond: boolean, detail?: string) {
  console.log(`  ${cond ? "✓" : "✗"} ${label}${detail ? `  (${detail})` : ""}`);
  if (!cond) failures++;
}

async function main() {
  const users = await prisma.user.findMany({ take: 2, select: { id: true, name: true } });
  if (users.length < 2) throw new Error("need ≥2 users — seed first");
  const [a, b] = users;
  console.log(`\nParticipants: ${a.name} / ${b.name}`);

  // Throwaway thread + participants.
  const thread = await prisma.messageThread.create({
    data: {
      kind: "DIRECT",
      createdById: a.id,
      participants: { create: [{ userId: a.id }, { userId: b.id }] },
    },
  });
  console.log(`Thread: ${thread.id}`);

  try {
    const BODY = `persistence-probe-${Date.now()}`;

    // --- Persistence core (mirror of sendMessage's prisma.message.create) ---
    const created = await prisma.message.create({
      data: { threadId: thread.id, authorId: a.id, body: BODY, imageUrl: TEST_IMG },
    });
    await prisma.messageThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });

    // --- Refetch exactly as app/(app)/messages/[id]/page.tsx does ---
    const refetched = await prisma.message.findMany({
      where: { threadId: thread.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: true },
    });

    const found = refetched.find((m) => m.id === created.id);
    check("message persisted + retrieved after refetch", !!found, found?.id);
    check("body survived round-trip", found?.body === BODY);
    check("imageUrl (NS-2) survived round-trip", found?.imageUrl === TEST_IMG, found?.imageUrl ? "data URI present" : "null");
    check("author relation resolves", !!found?.author?.id, found?.author?.name);

    console.log("\n── Summary ───────────────────────────────────");
    console.log(`  created id   : ${created.id}`);
    console.log(`  refetch count: ${refetched.length}`);
    console.log(`  body match   : ${found?.body === BODY ? "YES" : "NO"}`);
    console.log(`  image match  : ${found?.imageUrl === TEST_IMG ? "YES" : "NO"}`);
    console.log("──────────────────────────────────────────────");
  } finally {
    // Full cleanup — never leave probe data in the DB.
    await prisma.message.deleteMany({ where: { threadId: thread.id } });
    await prisma.threadParticipant.deleteMany({ where: { threadId: thread.id } });
    await prisma.messageThread.delete({ where: { id: thread.id } });
    console.log("\ncleanup: probe thread + message removed");
  }

  console.log(`\n${failures === 0 ? "ALL PASS ✓" : `${failures} FAILURE(S) ✗`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
