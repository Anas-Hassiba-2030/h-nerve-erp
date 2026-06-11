// GET /api/learning/patterns?weeks=12
//
// Aggregates the raw BrainFeedback log into a weekly trend — the data
// behind the Feedback Loop's learning curve (Phase 7). Each user action
// on a brain artefact (dismiss / commit / abandon / mark-useful …) is a
// signal; this bins those signals by ISO week and by kind so the UI can
// draw how the brain's accept-vs-reject balance moves over time.
//
// Auth-gated like the rest of the brain surface: session OR CRON_SECRET.
//
// Phase 7 of docs/PHASES-INTELLIGENCE.md.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isCronAuthorized } from "@/lib/auth/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polarity of each feedback kind — kept in sync with lib/brain/feedback.live.ts
// digest(). Duplicated (not imported) so this public surface stays decoupled
// from the brain internals the parallel workstream owns.
const ACCEPTED = new Set([
  "INSIGHT_HELPFUL",
  "INSIGHT_RESOLVED",
  "PLAN_COMMITTED",
  "PLAN_COMPLETED",
  "PLAN_STEP_DONE",
  "MEMORY_USEFUL",
  "OUTCOME_RIGHT",
]);
const REJECTED = new Set([
  "INSIGHT_DISMISSED",
  "PLAN_ABANDONED",
  "PLAN_STEP_BLOCKED",
  "MEMORY_IRRELEVANT",
  "OUTCOME_WRONG",
  "RECOMMENDATION_OVERRIDDEN",
]);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type WeekBucket = {
  week: string; // ISO date of the week's Monday (UTC)
  total: number;
  accepted: number;
  rejected: number;
  neutral: number;
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const machineOk = isCronAuthorized(req.headers.get("authorization"));
  if (!user && !machineOk) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const weeksRaw = Number(req.nextUrl.searchParams.get("weeks"));
  const weeks = Number.isFinite(weeksRaw)
    ? Math.min(Math.max(Math.trunc(weeksRaw), 1), 52)
    : 12;

  const nowMonday = startOfIsoWeekUtc(new Date());
  const since = new Date(nowMonday.getTime() - (weeks - 1) * WEEK_MS);

  const rows = await prisma.brainFeedback.findMany({
    where: { ts: { gte: since } },
    select: { ts: true, kind: true, module: true },
    orderBy: { ts: "asc" },
  });

  // Pre-seed every week in range so the trend line has no gaps.
  const buckets = new Map<string, WeekBucket>();
  for (let i = 0; i < weeks; i++) {
    const wk = new Date(since.getTime() + i * WEEK_MS);
    const key = isoDate(wk);
    buckets.set(key, { week: key, total: 0, accepted: 0, rejected: 0, neutral: 0 });
  }

  const byKind: Record<string, number> = {};
  const byModule: Record<string, number> = {};

  for (const r of rows) {
    const key = isoDate(startOfIsoWeekUtc(r.ts));
    const b = buckets.get(key);
    if (b) {
      b.total += 1;
      if (ACCEPTED.has(r.kind)) b.accepted += 1;
      else if (REJECTED.has(r.kind)) b.rejected += 1;
      else b.neutral += 1;
    }
    byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    const mod = r.module ?? "GROUP";
    byModule[mod] = (byModule[mod] ?? 0) + 1;
  }

  const series = Array.from(buckets.values());
  return NextResponse.json({
    totalEvents: rows.length,
    weeks: series,
    byKind,
    byModule,
  });
}

/** Monday 00:00 UTC of the week containing `d`. Deterministic, TZ-free. */
function startOfIsoWeekUtc(d: Date): Date {
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = u.getUTCDay(); // 0=Sun..6=Sat
  const deltaToMonday = (dow + 6) % 7; // Mon→0, Sun→6
  u.setUTCDate(u.getUTCDate() - deltaToMonday);
  return u;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
