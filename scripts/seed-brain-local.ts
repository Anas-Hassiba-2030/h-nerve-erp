// scripts/seed-brain-local.ts
//
// Populates the Brain subsystem tables that prisma/seed.ts skips, so every
// /brain/* page shows real content out of the box instead of an empty-state
// CTA. Pure computation + deterministic STUB generators — makes ZERO
// Anthropic calls (the key is commented in .env; council runs in stub mode).
//
//   npx tsx scripts/seed-brain-local.ts
//
// Idempotent-ish: the seed helpers each clear+rebuild their own tables. Safe
// to re-run. Local-only; do not commit the data.

import { prisma } from "../lib/db";
import { seedBrainGraph } from "../lib/brain/seedGraph";
import { seedMemoryLake } from "../lib/brain/seedMemories";
import { seedFeedback } from "../lib/brain/seedFeedback";
import { learnPatterns } from "../lib/brain/feedback.live";
import { seedFederation } from "../lib/brain/seedFederation";
import { aggregate } from "../lib/brain/federation.live";
import { council } from "../lib/brain/council.live";

async function step(label: string, fn: () => Promise<unknown>) {
  process.stdout.write(`• ${label} … `);
  try {
    const r = await fn();
    console.log(`ok${r && typeof r === "object" ? "" : ""}`);
  } catch (e) {
    console.log(`FAILED: ${(e as Error).message}`);
  }
}

async function main() {
  console.log("\nSeeding Brain subsystems (STUB, zero API)\n");

  await step("Causal graph (nodes + edges)", () => seedBrainGraph());
  await step("Memory lake", () => seedMemoryLake());
  await step("Feedback events + pattern learning", async () => {
    await seedFeedback();
    await learnPatterns({ scope: "default", windowDays: 60, minEvidence: 3 });
  });
  await step("Federation peers + aggregate", async () => {
    await seedFederation();
    await aggregate({ scope: "default" });
  });
  await step("Council session: Maha Q3 ramp", () =>
    council().convene("Should we ramp Maha cheese production for Q3 to capture the Arena conference uplift?", []),
  );
  await step("Council session: Arena occupancy dip", () =>
    council().convene("Arena Sofia occupancy is forecast to drop 15% next month — what should we pre-empt?", []),
  );

  // Report counts so the run is self-verifying.
  const [nodes, edges, mem, patterns, fed, sessions] = await Promise.all([
    prisma.brainNode.count(),
    prisma.brainEdge.count(),
    prisma.memory.count(),
    prisma.brainPattern.count(),
    prisma.federationPattern.count(),
    prisma.councilSession.count(),
  ]);
  console.log(
    `\nCounts → nodes=${nodes} edges=${edges} memories=${mem} patterns=${patterns} federation=${fed} council=${sessions}`,
  );
  console.log("\nDone. Open /brain/graph, /brain/memory, /brain/learning, /brain/benchmarks, /brain/council.\n");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
