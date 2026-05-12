import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EXECUTIVE" | "MANAGER" | "STAFF";
  title?: string | null;
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

export const sessionOptions: SessionOptions = {
  password: resolveSessionPassword(),
  cookieName: "bmv2026_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
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
