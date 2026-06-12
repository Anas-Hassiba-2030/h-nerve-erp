// lib/timemachine.ts
//
// The Time Machine — a global "as-of" date filter that reconstructs the
// system's state on any past day.
//
// Phase 16 of docs/PHASES-INTELLIGENCE.md.
//
// Storage is a single cookie on the request. Pages call `getAsOf()` at
// SSR time and pass the resulting Date to their queries. UI components
// (TimeScrubber, TimeMachineBanner) write through the action in
// app/actions/timemachine.ts.
//
// We deliberately keep the as-of state OUT of session — it's a local
// view, not an identity attribute, so a refresh keeps your scrub
// position but a logout doesn't carry over.

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/db";

export const TIME_MACHINE_COOKIE = "h_nerve_asof";

export type AsOfState = {
  // The cursor. `null` means "live / now" — no filter applied.
  asOf: Date | null;
  // True when the cursor is in the past (off "now").
  isTraveling: boolean;
  // Days back from now. 0 when live.
  daysBack: number;
};

/**
 * Server-side reader. Always returns a stable shape — never throws.
 * Caller is responsible for using `asOf ?? new Date()` when they want
 * the current cursor regardless of travel mode.
 */
export async function getAsOf(): Promise<AsOfState> {
  const raw = (await cookies()).get(TIME_MACHINE_COOKIE)?.value;
  if (!raw) return { asOf: null, isTraveling: false, daysBack: 0 };
  const ts = Number(raw);
  if (!Number.isFinite(ts) || ts <= 0)
    return { asOf: null, isTraveling: false, daysBack: 0 };
  const d = new Date(ts);
  const now = Date.now();
  // Refuse future dates — there's nothing to reconstruct ahead of now.
  if (d.getTime() > now) return { asOf: null, isTraveling: false, daysBack: 0 };
  const daysBack = Math.max(
    0,
    Math.round((now - d.getTime()) / (1000 * 60 * 60 * 24)),
  );
  // Less than 12 hours back = consider "live" so a stale cookie doesn't
  // pollute every page render.
  if (daysBack === 0 && now - d.getTime() < 12 * 60 * 60 * 1000)
    return { asOf: null, isTraveling: false, daysBack: 0 };
  return { asOf: d, isTraveling: true, daysBack };
}

/**
 * Compute the brain's IQ at a given snapshot date.
 *
 * BrainIQHistory is weekly — pick the most recent snapshot at or before
 * the requested date. If none exists (we're scrubbed back further than
 * the history goes), fall back to the earliest snapshot we have.
 */
export async function brainIqAt(
  date: Date,
  scope = "default",
): Promise<{ iq: number; snappedAt: Date | null }> {
  const hit = await prisma.brainIQHistory.findFirst({
    where: { scope, snappedAt: { lte: date } },
    orderBy: { snappedAt: "desc" },
  });
  if (hit) return { iq: hit.iq, snappedAt: hit.snappedAt };
  // Older than history — return the earliest we know about.
  const earliest = await prisma.brainIQHistory.findFirst({
    where: { scope },
    orderBy: { snappedAt: "asc" },
  });
  if (earliest)
    return { iq: earliest.iq, snappedAt: earliest.snappedAt };
  // Truly empty — neutral 100.
  return { iq: 100, snappedAt: null };
}

/**
 * Convenience for components that want both as-of and live IQ in one call.
 */
export async function brainIqDelta(asOf: Date | null): Promise<{
  asOfIq: number;
  liveIq: number;
  asOfSnap: Date | null;
}> {
  const live = await brainIqAt(new Date());
  if (!asOf)
    return { asOfIq: live.iq, liveIq: live.iq, asOfSnap: live.snappedAt };
  const at = await brainIqAt(asOf);
  return { asOfIq: at.iq, liveIq: live.iq, asOfSnap: at.snappedAt };
}

/**
 * Format the as-of date for the UI banner. Bilingual.
 * Latin numerals on both sides — Arabic locale uses ar-JO-u-nu-latn.
 */
export function formatAsOfLabel(d: Date, locale: "ar" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Boundaries — how far back we let users scrub. Caps prevent the UI
 * from offering a slider that runs forever; the data is meaningless
 * before the company existed anyway.
 */
export const TIME_MACHINE_MIN_DATE = new Date("2025-09-01T00:00:00.000Z");
export const TIME_MACHINE_MAX_DATE = () => new Date();
