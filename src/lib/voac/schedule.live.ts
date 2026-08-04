// lib/voac/schedule.live.ts — the thin DB twin of schedule.ts.
//
// Same split as runStore.ts / runStore.live.ts: all the decisions live in the
// pure module, and this file only fetches the inputs and hands them over. That
// matters more here than usual, because the alternative is a cron route with
// three queries and a sort buried inside it — code that runs unattended and can
// only be debugged from a log line hours later.
//
// Keeping it here (rather than inline in the route) also means the fire plan
// can be computed WITHOUT executing anything, which is exactly what a dry-run
// verifier needs.

// CROSS-TENANT INTENT: a scheduled fire has no cookie context and must reach
// every enabled roster. Every row read here is explicitly tenant-stamped from
// the roster itself, never inferred from a session.
import { prismaUnscoped } from "@/lib/db/db";
import { parseRoster } from "./roles";
import { planScheduledRuns, runKey, type RosterSchedule, type SchedulePlan } from "./schedule";

/**
 * Build the plan for one fire — which roles are due, which were skipped and why.
 *
 * Pure read. Executes nothing, so it is safe to call from a dry-run check.
 */
export async function buildFirePlan(args: {
  now?: Date;
  maxRuns: number;
}): Promise<SchedulePlan & { rosterCount: number }> {
  const now = args.now ?? new Date();

  const rosterRows = await prismaUnscoped.voacRoster.findMany({
    where: { enabled: true },
    take: 500,
  });

  if (rosterRows.length === 0) {
    return { due: [], skipped: [], considered: 0, rosterCount: 0 };
  }

  const companyIds = rosterRows.map((r) => r.companyId);

  const companies = await prismaUnscoped.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, sector: true },
  });
  const sectorById = new Map(companies.map((c) => [c.id, c.sector]));

  const rosters: RosterSchedule[] = rosterRows.map((r) => ({
    tenantId: r.tenantId,
    companyId: r.companyId,
    sector: sectorById.get(r.companyId) ?? "",
    roleIds: parseRoster(r.roleIds).map((role) => role.id),
    cadenceHours: r.cadenceHours,
    enabled: r.enabled,
  }));

  // Last run per (tenant, company, role), derived from the ledger rather than a
  // denormalized column — a cached "lastRunAt" drifts the first time a run is
  // deleted or backfilled, and then the scheduler silently stops firing.
  const recent = await prismaUnscoped.agentRun.groupBy({
    by: ["tenantId", "companyId", "roleId"],
    _max: { createdAt: true },
    where: { companyId: { in: companyIds } },
  });

  const lastRunByKey = new Map<string, Date>();
  for (const g of recent) {
    // companyId is nullable on AgentRun (null = the Group Broker, which has no
    // roster and is never scheduled here), so skip those rows rather than
    // keying on "null".
    if (!g.companyId || !g._max.createdAt) continue;
    lastRunByKey.set(runKey(g.tenantId, g.companyId, g.roleId), g._max.createdAt);
  }

  const plan = planScheduledRuns({ rosters, lastRunByKey, now, maxRuns: args.maxRuns });
  return { ...plan, rosterCount: rosterRows.length };
}
