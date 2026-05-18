// Phase 5 — route-level RBAC. Single enforcement point; reads the
// shared lib/permissions map. SAFE BY DEFAULT: when
// H_NERVE_PERMS_ENFORCED !== "true" this is a pure pass-through (zero
// behavior change) — ship inert, validate via /admin/permissions-preview,
// then flip the env var.
//
// Order is deliberate: break-glass first (login/health can never be
// gated), then the flag, then session, then the access check. A denied
// request redirects to /dashboard (always universal-allowed → no loop).

import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { canAccess, isBreakGlass, permsEnforced } from "@/lib/permissions";
import { rateLimit } from "@/lib/rateLimit";

const COOKIE = "bmv2026_session";
const DEV_FALLBACK =
  "bmv2026-erp-super-secret-session-password-change-me-please-32chars-min";

function sessionPassword() {
  const e = process.env.SESSION_PASSWORD?.trim();
  return e && e.length >= 32 ? e : DEV_FALLBACK;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Phase 12 — brute-force guard on the login POST. Runs BEFORE the
  // break-glass return (login is break-glass for the permission gate,
  // but the rate cap must still apply). Fail-soft: a limiter error
  // never blocks a legitimate sign-in.
  if (path === "/login" && req.method === "POST") {
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        (req as any).ip ||
        "unknown";
      const r = rateLimit(`login:${ip}`, 8, 60_000);
      if (!r.allowed) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.search = `?error=${encodeURIComponent(
          "محاولات تسجيل دخول كثيرة. انتظر دقيقة. · Too many login attempts, wait a minute.",
        )}`;
        const res = NextResponse.redirect(url);
        res.headers.set("Retry-After", String(r.retryAfterSec));
        return res;
      }
    } catch {
      /* fail-soft — never lock out on a limiter hiccup */
    }
  }

  if (isBreakGlass(path)) return NextResponse.next();
  if (!permsEnforced()) return NextResponse.next();

  const raw = req.cookies.get(COOKIE)?.value;
  if (!raw) return NextResponse.next(); // unauthenticated → page-level auth handles /login

  let role: string | undefined;
  try {
    const data = await unsealData<{ user?: { role?: string } }>(raw, {
      password: sessionPassword(),
    });
    role = data?.user?.role;
  } catch {
    return NextResponse.next(); // bad cookie → let the auth layer deal with it
  }
  if (!role) return NextResponse.next();

  if (canAccess(role, path)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/dashboard";
  url.search = "";
  return NextResponse.redirect(url);
}

// Page routes only. Exclude Next internals, static assets, and the API
// (APIs self-gate; /api/health is break-glass anyway).
export const config = {
  matcher: ["/((?!_next/|favicon|.*\\.[\\w]+$|api/).*)"],
};
