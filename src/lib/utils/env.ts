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
  ANTHROPIC_API_KEY:  { desc: "Claude API key — brain runs in stub mode if absent" },
  OPENROUTER_API_KEY: { desc: "OpenRouter gateway key — brain fallback provider when no Anthropic key" },
  LLM_API_KEY:        { desc: "Alias for ANTHROPIC_API_KEY" },
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

/** True if an LLM API key is present (brain can make live calls). */
export function hasLLMKey(): boolean {
  return !!(
    process.env.ANTHROPIC_API_KEY ??
    process.env.OPENROUTER_API_KEY ??
    process.env.LLM_API_KEY
  );
}

/** The public app URL, defaulting to localhost for dev. */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.RAILWAY_PUBLIC_DOMAIN?.replace(/^(?!https?:\/\/)/, "https://") ??
    "http://localhost:3000"
  );
}
