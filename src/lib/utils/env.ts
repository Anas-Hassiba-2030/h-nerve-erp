// lib/env.ts — Phase 24 (Railway Infrastructure Maximization).
//
// Type-safe access to environment variables with startup validation.
// Call `validateEnv()` once at server startup (or in a route handler that
// runs early) to surface missing/malformed config before traffic arrives.
//
// Pattern: read-once, throw on missing required values, warn on optional.
// Never log the VALUE of secrets — only their presence/absence.

import { log } from "@/lib/utils/logger";

// ─── Required at runtime ────────────────────────────────────────────────────
const REQUIRED = {
  DATABASE_URL: "PostgreSQL connection string (set in Railway → Variables)",
} as const;

// ─── Optional with defaults ─────────────────────────────────────────────────
const OPTIONAL = {
  GW_API_KEY:         { desc: "gw-front gateway credential — brain runs in stub mode if absent" },
  GW_BASE_URL:        { desc: "gw-front base URL (default https://gw-front.anashasiba91.workers.dev)" },
  SESSION_SECRET:     { desc: "iron-session cookie secret (32+ chars recommended)" },
  SEED_ADMIN_PASSWORD:{ desc: "One-time seed endpoint password" },
  NEXT_PUBLIC_APP_URL:{ desc: "Public base URL — used in absolute links" },
} as const;

export type EnvReport = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

/** Validate all required env vars. Returns a report; never throws. */
export function checkEnv(): EnvReport {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [key, desc] of Object.entries(REQUIRED)) {
    if (!process.env[key]) {
      missing.push(key);
      log.error(`env: required variable missing — ${key}`, { description: desc });
    }
  }

  for (const [key, { desc }] of Object.entries(OPTIONAL)) {
    if (!process.env[key]) {
      warnings.push(key);
      log.warn(`env: optional variable not set — ${key}`, { description: desc });
    }
  }

  return { ok: missing.length === 0, missing, warnings };
}

/** True if the gw-front credential is present (brain can make live calls). */
export function hasLLMKey(): boolean {
  return !!process.env.GW_API_KEY?.trim();
}

/** The public app URL, defaulting to localhost for dev. */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.RAILWAY_PUBLIC_DOMAIN?.replace(/^(?!https?:\/\/)/, "https://") ??
    "http://localhost:3000"
  );
}
