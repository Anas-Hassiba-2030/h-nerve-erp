// lib/voac/schedule.ts — deciding WHICH roles run on a scheduled fire.
//
// The driver can run one role. A cron fires against a whole group. Between
// those two sits the question this module answers: of every role on every
// roster of every tenant, which ones actually run right now?
//
// Getting this wrong is expensive in a way the request-scoped path never was.
// A single fire that fans out across 200 tenants × 5 roles is 1,000 LLM
// conversations nobody asked for, and the bill arrives before anyone notices.
// So the scheduler is pure, hard-capped, and — like the proposal budget — it
// REPORTS what it skipped instead of silently truncating.
//
// Cadence is per-roster, not per-role: an operator thinks "review this company
// daily", not "run the yield controller every 18 hours".

export type RosterSchedule = {
  tenantId: string;
  companyId: string;
  sector: string;
  roleIds: string[];
  cadenceHours: number;
  enabled: boolean;
};

export type DueRun = {
  tenantId: string;
  companyId: string;
  sector: string;
  roleId: string;
  /** Hours since this role last ran; null when it has never run. */
  staleHours: number | null;
};

export type SkippedRun = {
  key: string;
  reason: string;
};

export type SchedulePlan = {
  due: DueRun[];
  skipped: SkippedRun[];
  /** Everything considered, so a log line can report coverage honestly. */
  considered: number;
};

/** Stable key for a (tenant, company, role) triple. */
export function runKey(tenantId: string, companyId: string, roleId: string): string {
  return `${tenantId}::${companyId}::${roleId}`;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 3_600_000;
}

/**
 * Build the plan for one cron fire.
 *
 * Ordering is by staleness, most-stale first, so a cap truncates the freshest
 * work rather than starving whichever tenant sorts last alphabetically. A
 * never-run role is treated as infinitely stale — it should go first, because
 * a roster that has never produced anything is the one most likely to be
 * misconfigured, and finding that out is worth a run.
 */
export function planScheduledRuns(args: {
  rosters: RosterSchedule[];
  /** runKey → the last time that role ran. Absent means never. */
  lastRunByKey: Map<string, Date>;
  now: Date;
  /** Hard ceiling on runs started by ONE fire. */
  maxRuns: number;
}): SchedulePlan {
  const { rosters, lastRunByKey, now, maxRuns } = args;
  const skipped: SkippedRun[] = [];
  const candidates: DueRun[] = [];
  let considered = 0;

  for (const r of rosters) {
    if (!r.enabled) {
      skipped.push({
        key: `${r.tenantId}::${r.companyId}`,
        reason: "Roster is disabled.",
      });
      continue;
    }
    if (r.roleIds.length === 0) {
      skipped.push({
        key: `${r.tenantId}::${r.companyId}`,
        reason: "Roster has no roles enabled.",
      });
      continue;
    }

    for (const roleId of r.roleIds) {
      considered += 1;
      const key = runKey(r.tenantId, r.companyId, roleId);
      const last = lastRunByKey.get(key);

      if (!last) {
        candidates.push({ tenantId: r.tenantId, companyId: r.companyId, sector: r.sector, roleId, staleHours: null });
        continue;
      }

      const age = hoursBetween(now, last);
      // A non-positive cadence would make every role due on every fire — treat
      // it as a misconfiguration and skip loudly rather than spending on it.
      if (!Number.isFinite(r.cadenceHours) || r.cadenceHours <= 0) {
        skipped.push({ key, reason: `Invalid cadence (${r.cadenceHours}h) — refusing to schedule.` });
        continue;
      }
      if (age < r.cadenceHours) {
        skipped.push({
          key,
          reason: `Ran ${age.toFixed(1)}h ago; cadence is ${r.cadenceHours}h.`,
        });
        continue;
      }
      candidates.push({ tenantId: r.tenantId, companyId: r.companyId, sector: r.sector, roleId, staleHours: age });
    }
  }

  // Most stale first; never-run (null) sorts ahead of everything.
  candidates.sort((a, b) => {
    if (a.staleHours === null && b.staleHours === null) return a.roleId.localeCompare(b.roleId);
    if (a.staleHours === null) return -1;
    if (b.staleHours === null) return 1;
    return b.staleHours - a.staleHours;
  });

  const cap = Math.max(0, maxRuns);
  const due = candidates.slice(0, cap);

  for (const over of candidates.slice(cap)) {
    skipped.push({
      key: runKey(over.tenantId, over.companyId, over.roleId),
      reason: `Over the per-fire cap of ${cap}; will be picked up next fire (most-stale first).`,
    });
  }

  return { due, skipped, considered };
}
