// scripts/seed-brain-all.ts
//
// One-shot: seed every Brain sub-system so the intelligence sub-pages
// aren't empty. Calls each subsystem's library entry point directly
// (bypasses the server-action requireUser gate). Safe to re-run.

import { seedBrainGraph } from "@/lib/brain/seedGraph";
import { seedFederation } from "@/lib/brain/seedFederation";
import { seedFeedback } from "@/lib/brain/seedFeedback";
import { seedMemoryLake } from "@/lib/brain/seedMemories";
import { aggregate } from "@/lib/brain/federation.live";
import { learnPatterns } from "@/lib/brain/feedback.live";
import { runBrainAnalysis } from "@/lib/intelligence/engine";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding every brain subsystem …\n");

  console.log("1/6 graph nodes + edges");
  const g = await seedBrainGraph();
  console.log(`     nodesUpserted=${g.nodesUpserted} edgesUpserted=${g.edgesUpserted}`);

  console.log("2/6 federation peers");
  const f = await seedFederation();
  console.log(`     written=${f.written} cleared=${f.cleared}`);

  console.log("3/6 federation aggregation");
  await aggregate({ scope: "default" });

  console.log("4/6 feedback patterns");
  const fb = await seedFeedback();
  console.log(`     written=${fb.written} cleared=${fb.cleared}`);

  console.log("5/6 memory lake");
  const m = await seedMemoryLake();
  console.log(`     written=${m.written}`);

  console.log("6/6 brain analysis per tenant");
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true },
  });
  for (const t of tenants) {
    const r = await runBrainAnalysis(t.slug);
    console.log(`     ${t.slug.padEnd(18)} gen=${r.generated} upd=${r.updated} unc=${r.unchanged}`);
  }

  // Learn patterns from feedback
  try {
    await learnPatterns({ scope: "default", windowDays: 60, minEvidence: 3 });
    console.log("\n     learnPatterns OK");
  } catch (e) {
    console.log("\n     learnPatterns skipped:", e instanceof Error ? e.message : e);
  }

  await prisma.$disconnect();
  console.log("\nAll brain subsystems seeded.");
}

main().catch((e) => { console.error(e); process.exit(1); });
