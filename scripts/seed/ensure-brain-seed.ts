// scripts/seed/ensure-brain-seed.ts
//
// BRAIN TOP-UP — runs on every deploy (railway.toml), independently of
// seed-if-empty.ts. A production DB that has companies but an EMPTY causal
// graph leaves every /brain/* page blank (graph, memory, learning, council),
// which reads as "the intelligence layer is dead" during a pitch.
//
// This seeds the brain subsystems ONLY when the causal graph is empty
// (BrainNode count === 0), so it:
//   • fixes an already-seeded prod DB that never got the brain data, and
//   • NEVER clears a DB where the brain has accumulated real signal.
//
// The guard matters: seedFederation()/seedFeedback() CLEAR-then-write, so they
// are destructive if re-run. Gating the whole thing on an empty graph keeps the
// top-up purely additive on any populated DB (same contract as ensure-demo-docs).
//
// Deliberately does NOT call runBrainAnalysis() — that hits the LLM per tenant
// and would spend API credits on every deploy. Graph/federation/feedback/memory
// are all local upserts/writes, no model calls, so this is free + fast.
//
// Idempotent and non-blocking — a hiccup can never fail the deploy.
//
//   npx tsx scripts/seed/ensure-brain-seed.ts

import { PrismaClient } from "@prisma/client";
import { seedBrainGraph } from "@/lib/brain/seedGraph";
import { seedFederation } from "@/lib/brain/seedFederation";
import { seedFeedback } from "@/lib/brain/seedFeedback";
import { seedMemoryLake } from "@/lib/brain/seedMemories";

async function main() {
  const prisma = new PrismaClient();
  try {
    const nodes = await prisma.brainNode.count();
    if (nodes > 0) {
      console.log(`[ensure-brain-seed] ${nodes} graph node(s) already present — skipping.`);
      return;
    }
    console.log("[ensure-brain-seed] empty causal graph detected — seeding brain subsystems…");

    const g = await seedBrainGraph();
    console.log(`[ensure-brain-seed]   graph: nodes=${g.nodesUpserted} edges=${g.edgesUpserted}`);

    const f = await seedFederation();
    console.log(`[ensure-brain-seed]   federation: written=${f.written}`);

    const fb = await seedFeedback();
    console.log(`[ensure-brain-seed]   feedback: written=${fb.written}`);

    const m = await seedMemoryLake();
    console.log(`[ensure-brain-seed]   memory: written=${m.written}`);

    console.log("[ensure-brain-seed] ✓ brain subsystems seeded.");
  } catch (e) {
    console.error("[ensure-brain-seed] non-fatal error:", e);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ensure-brain-seed] fatal:", e);
    process.exit(0); // never block deploy
  });
