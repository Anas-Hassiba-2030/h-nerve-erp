// seedFeedback.ts — populate BrainFeedback with plausible historical
// events so the analyzer has something to learn from. Idempotent: clears
// existing seed rows (where targetRef starts with "seed-") before inserting.
//
// The distribution below is deliberately shaped so the analyzer produces
// 6-8 distinct, defensible patterns covering both "learn from acceptance"
// and "learn from rejection" signals.
//
// Phase 7 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db";

type SeedSpec = {
  kind: string;
  module: string;
  category: string | null;
  count: number;
  // jitter: spread events over the past N days
  windowDays: number;
};

const SEED_SPECS: SeedSpec[] = [
  // FINANCE — user dismisses low-margin alerts
  { kind: "INSIGHT_DISMISSED", module: "FINANCE",  category: "margin_low",   count: 9, windowDays: 30 },
  // FINANCE — user resolves treasury alerts (energy hedge etc.)
  { kind: "INSIGHT_HELPFUL",   module: "FINANCE",  category: "treasury",     count: 5, windowDays: 30 },

  // DAIRY — expiry alerts always actioned
  { kind: "INSIGHT_RESOLVED",  module: "DAIRY",    category: "expiry",       count: 7, windowDays: 30 },
  // DAIRY — ramp recommendations frequently abandoned (production constraints)
  { kind: "PLAN_ABANDONED",    module: "DAIRY",    category: "ramp",         count: 4, windowDays: 45 },

  // HOTELS — F&B promo plans get committed and completed
  { kind: "PLAN_COMMITTED",    module: "HOTELS",   category: "fb_promo",     count: 6, windowDays: 30 },
  { kind: "PLAN_COMPLETED",    module: "HOTELS",   category: "fb_promo",     count: 5, windowDays: 30 },

  // FARMS — moisture alerts always resolved
  { kind: "INSIGHT_RESOLVED",  module: "FARMS",    category: "moisture",     count: 6, windowDays: 30 },
  // FARMS — irrigation plan steps occasionally blocked (valves/contractors)
  { kind: "PLAN_STEP_BLOCKED", module: "FARMS",    category: "irrigation",   count: 4, windowDays: 60 },

  // GROUP — council-sourced plans get committed
  { kind: "PLAN_COMMITTED",    module: "GROUP",    category: "council",      count: 5, windowDays: 30 },

  // EDUCATION — cohort program insights are helpful
  { kind: "INSIGHT_HELPFUL",   module: "EDUCATION", category: "cohort",      count: 4, windowDays: 45 },

  // Memory recalls — labneh expiry memory keeps proving useful
  { kind: "MEMORY_USEFUL",     module: "DAIRY",    category: "expiry",       count: 4, windowDays: 30 },
];

function randomDateWithin(days: number): Date {
  const offsetMs = Math.random() * days * 24 * 3600 * 1000;
  return new Date(Date.now() - offsetMs);
}

export async function seedFeedback(): Promise<{
  cleared: number;
  written: number;
  durationMs: number;
}> {
  const t0 = Date.now();
  // Clear previous seed rows (only ones we authored).
  const cleared = await prisma.brainFeedback.deleteMany({
    where: { targetRef: { startsWith: "seed-" } },
  });

  const data: any[] = [];
  for (const spec of SEED_SPECS) {
    for (let i = 0; i < spec.count; i++) {
      const ts = randomDateWithin(spec.windowDays);
      data.push({
        scope: "default",
        ts,
        kind: spec.kind,
        targetRef: `seed-${spec.module.toLowerCase()}-${spec.category}-${i}`,
        targetType:
          spec.kind.startsWith("INSIGHT") ? "insight"
          : spec.kind.startsWith("PLAN") ? "plan"
          : spec.kind.startsWith("MEMORY") ? "memory"
          : "council",
        module: spec.module,
        category: spec.category,
      });
    }
  }
  await prisma.brainFeedback.createMany({ data });
  return {
    cleared: cleared.count,
    written: data.length,
    durationMs: Date.now() - t0,
  };
}
