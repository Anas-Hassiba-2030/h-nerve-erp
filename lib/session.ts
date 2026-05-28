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

// The dev-only fallback. Anyone with this string can forge cookies, so it's
// gated by NODE_ENV below — refused in production.
const DEV_FALLBACK_PASSWORD =
  "bmv2026-erp-super-secret-session-password-change-me-please-32chars-min";

function resolveSessionPassword(): string {
  const env = process.env.SESSION_PASSWORD?.trim();
  if (env && env.length >= 32) return env;

  if (process.env.NODE_ENV === "production") {
    // Hard-fail rather than silently using the fallback in production. A bad
    // session secret means trivially forgeable cookies → full account takeover.
    throw new Error(
      "[H-Nerve] SESSION_PASSWORD is missing or too short (need ≥32 chars). Refusing to start in production with the dev fallback.",
    );
  }
  if (env && env.length < 32) {
    // eslint-disable-next-line no-console
    console.warn(
      "[H-Nerve] SESSION_PASSWORD is shorter than 32 chars. iron-session requires ≥32 — falling back to the dev secret. Set a longer SESSION_PASSWORD in .env.local.",
    );
  }
  return DEV_FALLBACK_PASSWORD;
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
  return getIronSession<SessionData>(cookies(), buildSessionOptions());
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
