// Client-portal session — deliberately separate from lib/auth/session.ts's
// SessionUser/iron-session cookie. A portal customer is NOT a User: it has
// no role, cannot reach any /admin or /(app) route, and its session only
// ever carries customerId/tenantId. Own cookie name so the two sessions
// never collide in the same browser.

import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type PortalSessionUser = {
  customerId: string;
  customerName: string;
  tenantId: string;
};

export type PortalSessionData = {
  customer?: PortalSessionUser;
};

const FALLBACK_PASSWORD =
  "h-nerve-erp-portal-session-secret-default-2026-hourani-group-Zq4mR8vLpT2wK";

function resolveSessionPassword(): string {
  const env = process.env.PORTAL_SESSION_PASSWORD?.trim();
  if (env && env.length >= 32) return env;
  if (env && env.length > 0) return (env + FALLBACK_PASSWORD).slice(0, 70);
  return FALLBACK_PASSWORD;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24;

function buildSessionOptions(): SessionOptions {
  return {
    password: resolveSessionPassword(),
    cookieName: "bmv2026_portal_session",
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

export async function getPortalSession() {
  return getIronSession<PortalSessionData>(await cookies(), buildSessionOptions());
}

export async function getCurrentPortalCustomer(): Promise<PortalSessionUser | null> {
  const session = await getPortalSession();
  return session.customer ?? null;
}

export async function requirePortalCustomer(): Promise<PortalSessionUser> {
  const customer = await getCurrentPortalCustomer();
  if (!customer) throw new Error("PORTAL_UNAUTHORIZED");
  return customer;
}
