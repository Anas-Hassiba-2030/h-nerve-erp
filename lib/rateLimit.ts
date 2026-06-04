// lib/rateLimit.ts — generic in-memory fixed-window limiter (Phase 12).
//
// Scope-honest, mirrors lib/importRateLimit: per-process, resets on
// restart, NOT shared across serverless instances. Adequate to blunt
// brute-force/credential-stuffing at this scale; swap the Map for
// Redis behind this same signature when scaling horizontally.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export type RateResult = { allowed: boolean; retryAfterSec: number };

/** Records a hit for `key`; fixed window of `windowMs`, `max` hits. */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateResult {
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (now - b.windowStart >= windowMs) buckets.delete(k);
    }
  }
  const b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((b.windowStart + windowMs - now) / 1000)),
    };
  }
  b.count++;
  return { allowed: true, retryAfterSec: 0 };
}

// ──────────────────────────────────────────────────────────────────
// Import-ingestion limiter (folded in from lib/importRateLimit.ts).
//
// Dedicated fixed-window limiter for POST /api/import/test. Kept as a
// distinct bucket map + result shape because it reports `remaining`
// (used for the X-RateLimit-Remaining header) and uses its own window
// constants. Per-process, resets on restart, NOT shared across
// instances — swap the Map for Redis behind this signature at scale.
// ──────────────────────────────────────────────────────────────────

export const IMPORT_WINDOW_MS = 60_000;
export const IMPORT_MAX_PER_WINDOW = 100;

const importBuckets = new Map<string, Bucket>();

export type ImportRateResult = {
  allowed: boolean;
  /** Seconds until the window resets (for the Retry-After header). */
  retryAfterSec: number;
  /** Requests left in the current window. */
  remaining: number;
};

/**
 * Records a hit for `key` and reports whether it is allowed. Fixed
 * window: the first hit starts a 60s window; the 101st within it is
 * rejected until the window rolls over.
 */
export function checkImportRate(
  key: string,
  now: number = Date.now(),
): ImportRateResult {
  // Opportunistic sweep so inactive keys can't grow the Map unbounded.
  if (importBuckets.size > 500) {
    for (const [k, b] of importBuckets) {
      if (now - b.windowStart >= IMPORT_WINDOW_MS) importBuckets.delete(k);
    }
  }

  const b = importBuckets.get(key);
  if (!b || now - b.windowStart >= IMPORT_WINDOW_MS) {
    importBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0, remaining: IMPORT_MAX_PER_WINDOW - 1 };
  }

  if (b.count >= IMPORT_MAX_PER_WINDOW) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((b.windowStart + IMPORT_WINDOW_MS - now) / 1000),
    );
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  b.count++;
  return { allowed: true, retryAfterSec: 0, remaining: IMPORT_MAX_PER_WINDOW - b.count };
}
