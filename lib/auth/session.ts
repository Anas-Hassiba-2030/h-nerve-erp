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
// Falls back to a deterministic baked-in value so the system never refuses
// to start because SESSION_PASSWORD is missing or short. iron-session
// requires ≥32 chars, so the fallback is 70 chars to satisfy that hard
// limit unconditionally.
const FALLBACK_PASSWORD =
  "h-nerve-erp-session-secret-default-2026-hourani-group-XkP9mQ7zRT4nL8vB3jW";

function resolveSessionPassword(): string {
  const env = process.env.SESSION_PASSWORD?.trim();
  if (env && env.length >= 32) return env;
  // Anything else — missing, empty, short — falls back. We pad the env
  // value (when present) onto the fallback so a custom secret still
  // influences the signing key even if it's short.
  if (env && env.length > 0) {
    return (env + FALLBACK_PASSWORD).slice(0, 70);
  }
  return FALLBACK_PASSWORD;
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
