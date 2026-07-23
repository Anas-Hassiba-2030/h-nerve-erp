import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EXECUTIVE" | "MANAGER" | "STAFF";
  title?: string | null;
  // Phase F1 — tenant identity, threaded at login. companyId reflects
  // User.companyId (optional; null for ADMIN/cross-tenant roamers).
  // tenantSlug is the resolved Tenant.slug for that company, used by
  // F3 to scope opaque-tenantId queries. Both default to null.
  companyId?: string | null;
  tenantSlug?: string | null;
};

export type SessionData = {
  user?: SessionUser;
};

// Session secret — used to sign session cookies (NOT a login password).
//
// SECURITY (hardening 2026-07-23): in production a missing/short
// SESSION_PASSWORD now FAILS CLOSED with a thrown error instead of
// silently falling back to the baked-in dev value. The fallback string
// lives in a public repo — any silent fallback in prod would make every
// session cookie forgeable by anyone who can read GitHub, with zero
// operational signal that it happened. The Worker's secret store carries
// SESSION_PASSWORD (verified via `wrangler secret list`), so a throw here
// only fires on a real misconfiguration — exactly when we WANT requests
// to fail loudly rather than authenticate silently against a public key.
// Dev/build keep the fallback so local runs and `next build` page
// collection never require the secret.
const DEV_ONLY_FALLBACK_PASSWORD =
  "h-nerve-erp-session-secret-default-2026-hourani-group-XkP9mQ7zRT4nL8vB3jW";

function resolveSessionPassword(): string {
  const env = process.env.SESSION_PASSWORD?.trim();
  if (env && env.length >= 32) return env;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_PASSWORD is missing or shorter than 32 chars in production. " +
        "Set it with `wrangler secret put SESSION_PASSWORD` — refusing to " +
        "sign sessions with the public dev fallback.",
    );
  }
  return DEV_ONLY_FALLBACK_PASSWORD;
}

// Phase 12 — sessions expire after 24h. iron-session re-issues the
// cookie on each save, so active users roll forward; idle sessions
// die. NOTE: shipping/raising this invalidates ALL existing sessions
// at deploy (everyone re-logs-in once).
const SESSION_TTL_SECONDS = 60 * 60 * 24;

// Built lazily so a missing/short SESSION_PASSWORD only crashes a real
// request — not the build itself (Next collects page data at build time
// and would otherwise refuse to compile when the env var is wrong).
function buildSessionOptions(): SessionOptions {
  return {
    password: resolveSessionPassword(),
    cookieName: "bmv2026_session",
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), buildSessionOptions());
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
