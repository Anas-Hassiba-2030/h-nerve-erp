// scripts/seed/ensure-demo-docs.ts
//
// DEMO-DOCS TOP-UP — runs on every deploy (railway.toml), independently of
// seed-if-empty.ts. Production was seeded before the demo document corpus
// existed in the seed, so a DB that has companies but ZERO documents leaves
// the brain's document retrieval with nothing to cite ("no contract loaded").
//
// This inserts the demo corpus ONLY when the Document table is empty, so it:
//   • fixes an already-seeded prod DB that pre-dates the documents, and
//   • never touches a DB where a user has uploaded their own documents.
//
// Idempotent and non-blocking — a hiccup can never fail the deploy.
//
//   npx tsx scripts/seed/ensure-demo-docs.ts

import { PrismaClient } from "@prisma/client";
import { seedDemoDocuments } from "../../prisma/seedDemoDocuments";

async function main() {
  const prisma = new PrismaClient();
  try {
    const docs = await prisma.document.count();
    if (docs > 0) {
      console.log(`[ensure-demo-docs] ${docs} document(s) already present — skipping.`);
      return;
    }
    // Attribute to an admin if one exists, else leave unattributed.
    const admin =
      (await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } }))?.id ?? null;
    const n = await seedDemoDocuments(prisma, admin);
    console.log(`[ensure-demo-docs] ✓ inserted ${n} demo documents.`);
  } catch (e) {
    console.error("[ensure-demo-docs] non-fatal error:", e);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ensure-demo-docs] fatal:", e);
    process.exit(0); // never block deploy
  });
