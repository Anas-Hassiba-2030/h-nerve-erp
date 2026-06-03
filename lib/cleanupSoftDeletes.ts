import { prisma } from "./db";

// Hard-delete records that have been soft-deleted for more than this many ms.
export const SOFT_DELETE_GRACE_MS = 24 * 60 * 60 * 1000; // 24h

// Sweeps every soft-deletable model and hard-deletes anything past the grace
// window. Idempotent: running it twice in a row removes nothing the second
// time.
//
// WHERE TO WIRE THIS UP (Railway has no built-in cron):
//
//  - A Railway cron service or external scheduler (cron-job.org / GitHub
//    Actions `schedule`) hitting a route handler
//    `app/api/cron/cleanup-soft-deletes/route.ts` that calls
//    `runSoftDeleteCleanup()` and returns counts. Protect it with a
//    `CRON_SECRET` header check. See docs/DEPLOYMENT.md § scheduled refresh.
//
//  - Self-hosted: a node-cron or system cron entry that invokes
//    `tsx scripts/cleanup-soft-deletes.ts` (a thin wrapper that imports and
//    calls this function).
//
// Until one of those is in place, soft-deletes accumulate forever in the DB
// but stay invisible to the UI thanks to the `deletedAt: null` filters on the
// list pages.
export async function runSoftDeleteCleanup(): Promise<{
  tasks: number;
  projects: number;
  insights: number;
  forecasts: number;
}> {
  const cutoff = new Date(Date.now() - SOFT_DELETE_GRACE_MS);
  const where = { deletedAt: { lt: cutoff } } as const;

  const [tasks, projects, insights, forecasts] = await Promise.all([
    prisma.task.deleteMany({ where }),
    prisma.futureProject.deleteMany({ where }),
    prisma.aIInsight.deleteMany({ where }),
    prisma.supplyForecast.deleteMany({ where }),
  ]);

  return {
    tasks: tasks.count,
    projects: projects.count,
    insights: insights.count,
    forecasts: forecasts.count,
  };
}
