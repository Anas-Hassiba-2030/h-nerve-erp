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
import { canAccess, isBreakGlass, permsEnforced } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/import/rateLimit";

const COOKIE = "bmv2026_session";
const DEV_FALLBACK =
  "bmv2026-erp-super-secret-session-password-change-me-please-32chars-min";

function sessionPassword() {
  const e = process.env.SESSION_PASSWORD?.trim();
  return e && e.length >= 32 ? e : DEV_FALLBACK;
}

// NOTE (Phase 4 §3): this file is named `middleware.ts` (not Next 16's newer
// `proxy.ts` convention) ON PURPOSE. Next hard-codes a proxy.ts file to the
// Node.js middleware runtime (build/index.js: `isProxyFile(page)` → node
// functions manifest), and @opennextjs/cloudflare supports EDGE middleware
// only. Everything here is edge-safe (iron-webcrypto unseal, pure permission
// map, in-memory limiter). Renaming back to proxy.ts breaks the Cloudflare
// build with "Node.js middleware is not currently supported".
// Strict CSP (production only). A fresh nonce per request; Next.js reads the
// Content-Security-Policy REQUEST header set below and stamps the nonce onto
// every framework <script> tag it renders, so 'unsafe-inline'/'unsafe-eval'
// can finally go. 'strict-dynamic' lets those nonce'd root scripts load the
// chunk graph. Dev is exempt (the dev overlay + fast refresh need eval), and
// H_NERVE_CSP_STRICT=false is the instant, deploy-only kill switch.
// The static Orrery hub doc (/hub/index.html) never passes through the
// middleware — it keeps its own legacy CSP from next.config.mjs headers().
function buildStrictCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Phase F-UX — forward the current pathname to server components via
  // an x-pathname request header. app/(app)/layout.tsx reads it for
  // permission gating (effectiveCanAccess). Every NextResponse.next() in
  // this middleware passes the augmented headers so the signal survives
  // the rate-limit / perms branches.
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", path);

  const strictCsp =
    process.env.NODE_ENV === "production" &&
    process.env.H_NERVE_CSP_STRICT !== "false";
  let csp: string | null = null;
  if (strictCsp) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const nonce = btoa(String.fromCharCode(...bytes));
    csp = buildStrictCsp(nonce);
    // Request header: Next.js picks this up and nonces its own scripts.
    reqHeaders.set("content-security-policy", csp);
    reqHeaders.set("x-nonce", nonce);
  }

  const passThrough = () => {
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    // Response header: what the browser actually enforces.
    if (csp) res.headers.set("content-security-policy", csp);
    return res;
  };

  // Phase 12 — brute-force guard on login POSTs (staff /login AND the
  // customer /portal/login — server actions POST to their own page path,
  // so both credential doors are covered by one rule). Runs BEFORE the
  // break-glass return (login is break-glass for the permission gate,
  // but the rate cap must still apply). Fail-soft: a limiter error
  // never blocks a legitimate sign-in.
  if ((path === "/login" || path === "/portal/login") && req.method === "POST") {
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        (req as any).ip ||
        "unknown";
      const r = rateLimit(`login:${path}:${ip}`, 8, 60_000);
      if (!r.allowed) {
        const url = req.nextUrl.clone();
        url.pathname = path;
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

  if (isBreakGlass(path)) return passThrough();
  if (!permsEnforced()) return passThrough();

  const raw = req.cookies.get(COOKIE)?.value;
  if (!raw) return passThrough(); // unauthenticated → page-level auth handles /login

  let role: string | undefined;
  try {
    const data = await unsealData<{ user?: { role?: string } }>(raw, {
      password: sessionPassword(),
    });
    role = data?.user?.role;
  } catch {
    return passThrough(); // bad cookie → let the auth layer deal with it
  }
  if (!role) return passThrough();

  if (canAccess(role, path)) return passThrough();

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
