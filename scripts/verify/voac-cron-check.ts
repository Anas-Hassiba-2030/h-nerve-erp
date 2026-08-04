// scripts/verify/voac-cron-check.ts
//
// DRY RUN of the scheduled VOAC fire. Prints exactly what /api/cron/voac would
// execute, and executes nothing.
//
// Why this exists: a cron route runs unattended, and its failures are read from
// a log line hours later — if at all. The risky part is not the fan-out, it is
// the three queries that decide what is due (a groupBy over a NULLABLE
// companyId, a roster parse, a sector join). This calls the exact same
// buildFirePlan() the route calls, so the queries are proven without spending a
// single token.
//
//   DATABASE_URL="file:./dev.db" \
//   npx tsx --tsconfig tsconfig.scripts.json scripts/verify/voac-cron-check.ts
//
// Read-only. Safe against any database, including production.

import { makePrismaClient } from "../_prisma";

const MAX_RUNS_PER_FIRE = 12; // keep in step with the route

async function main() {
  // Force the client to initialise before the lib module imports it.
  makePrismaClient();
  const { buildFirePlan } = await import("../../src/lib/voac/schedule.live");

  console.log("=".repeat(66));
  console.log("VOAC SCHEDULED FIRE — DRY RUN (nothing is executed)");
  console.log("=".repeat(66));

  const plan = await buildFirePlan({ maxRuns: MAX_RUNS_PER_FIRE });

  console.log(`\nEnabled rosters : ${plan.rosterCount}`);
  console.log(`Roles considered: ${plan.considered}`);
  console.log(`Would run now   : ${plan.due.length}  (cap ${MAX_RUNS_PER_FIRE})`);
  console.log(`Skipped         : ${plan.skipped.length}`);

  if (plan.due.length) {
    console.log("\n--- WOULD RUN (most stale first) ---");
    for (const d of plan.due) {
      const age = d.staleHours === null ? "never run" : `${d.staleHours.toFixed(1)}h ago`;
      console.log(`  ${d.roleId.padEnd(32)} ${d.sector.padEnd(12)} last: ${age}`);
    }
  }

  if (plan.skipped.length) {
    console.log("\n--- SKIPPED (nothing is dropped silently) ---");
    for (const s of plan.skipped.slice(0, 15)) console.log(`  ${s.key}\n    ${s.reason}`);
    if (plan.skipped.length > 15) console.log(`  … and ${plan.skipped.length - 15} more`);
  }

  // The accounting invariant the pure module guarantees — assert it against
  // real data too, because a query returning the wrong shape would break it
  // in a way unit tests cannot see.
  const accounted = plan.due.length + plan.skipped.length;
  const ok = accounted === plan.considered;
  console.log(`\n${"=".repeat(66)}`);
  console.log(
    ok
      ? `OK — every one of ${plan.considered} considered role(s) is either due or explained.`
      : `MISMATCH — ${plan.considered} considered but ${accounted} accounted for. Work is being dropped silently.`,
  );
  if (!ok) process.exitCode = 1;

  if (plan.rosterCount === 0) {
    console.log("\nNote: no enabled rosters yet. A roster is created lazily on a");
    console.log("company's first run — seed one with scripts/seed/seed-voac-demo.ts");
    console.log("or run the driver once via scripts/verify/voac-smoke.ts.");
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error("voac-cron-check failed:", e);
    process.exit(1);
  });
