// lib/auth/cronAuth.ts
//
// Constant-time verification of the CRON_SECRET bearer token.
//
// Five API routes (/api/brain/cron, /api/brain/insights, /api/empire/summary,
// /api/learning/patterns, /api/memory) accept a machine caller bearing
// `Authorization: Bearer ${CRON_SECRET}`. They previously compared the header
// with `===`, which leaks how many leading characters matched through response
// timing. This helper centralizes the check behind crypto.timingSafeEqual.
// The seed routes (/api/seed, /api/admin/seed-pitch) use the generic
// timingSafeStringEqual for their SEED_ADMIN_PASSWORD body check.
//
// The length pre-check short-circuits (length is not secret — an attacker can
// derive it from the token format anyway); the content comparison is constant
// time.

import { timingSafeEqual } from "crypto";

/** True when CRON_SECRET is configured (non-empty after trim). */
export function cronSecretConfigured(): boolean {
  return !!process.env.CRON_SECRET?.trim();
}

/**
 * Constant-time equality for secret-bearing strings. `provided` is typed
 * unknown so request-body values can be passed straight in — any non-string
 * (undefined, null, number, object) fails closed.
 */
export function timingSafeStringEqual(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string" || expected.length === 0) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Constant-time check of an Authorization header value against
 * `Bearer ${CRON_SECRET}`. Fails closed when the secret is unset or the
 * header is missing.
 */
export function isCronAuthorized(authHeader: string | null | undefined): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !authHeader) return false;
  return timingSafeStringEqual(authHeader, `Bearer ${secret}`);
}
