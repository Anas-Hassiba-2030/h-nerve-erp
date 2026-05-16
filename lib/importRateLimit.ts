// lib/importRateLimit.ts
//
// In-memory fixed-window rate limiter for POST /api/import/test.
//
// Scope-honest by design: this is per-process, resets on restart, and is
// NOT shared across instances. That is adequate for the current scale
// (n8n hits the endpoint every ~15 min); the cap exists only to contain
// a haywire client. Swap the Map for Redis when we scale horizontally —
// the call signature is the seam.

type Bucket = { count: number; windowStart: number };

export const IMPORT_WINDOW_MS = 60_000;
export const IMPORT_MAX_PER_WINDOW = 100;

const buckets = new Map<string, Bucket>();

export type RateResult = {
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
export function checkImportRate(key: string, now: number = Date.now()): RateResult {
  // Opportunistic sweep so inactive keys can't grow the Map unbounded.
  if (buckets.size > 500) {
    for (const [k, b] of buckets) {
      if (now - b.windowStart >= IMPORT_WINDOW_MS) buckets.delete(k);
    }
  }

  const b = buckets.get(key);
  if (!b || now - b.windowStart >= IMPORT_WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
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
