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
