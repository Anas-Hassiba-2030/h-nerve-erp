// Phase 5 — central route permission map. PURE module (no server-only
// imports) so middleware, the Sidebar (client), and the preview screen
// all read ONE source of truth.
//
// Model: deny-by-default per non-ADMIN role with an explicit allow-list
// of path prefixes. ADMIN bypasses everything. Break-glass paths always
// pass (so a bad gate can never lock you out of login/health).
//
// SCOPE: route-level only. MANAGER "own business unit" data scoping
// (where:{companyId}) is deferred to the Phase 11 query audit — this
// module does NOT filter row data.

export type PermRole = "ADMIN" | "EXECUTIVE" | "MANAGER" | "STAFF";

// Always allowed, even with no/!valid session — never gate these or you
// can't get back in to fix a bad gate.
const BREAK_GLASS = ["/login", "/signup", "/logout", "/api/health", "/"];

// Allowed for ANY authenticated role (self-service / universal).
const UNIVERSAL = [
  "/dashboard", "/settings", "/search", "/help", "/messages",
  "/tasks", "/pinned", "/showcase", "/changelog", "/roadmap",
  "/achievements", "/digest", "/notifications", "/inbox",
];

// Per-role allow-list (path prefixes), ON TOP of UNIVERSAL.
// ADMIN is special-cased to all access (not listed here).
const POLICY: Record<Exclude<PermRole, "ADMIN">, string[]> = {
  // Financials, reports, dashboards — explicitly NO admin panel.
  EXECUTIVE: [
    "/finance", "/reports", "/analytics", "/markets", "/insights",
    "/sustainability", "/compare", "/companies", "/supply-chain",
    "/brain", "/audit-360", "/plans", "/alerts",
  ],
  // Operational + own-unit modules. No /admin/* (superadmin or the
  // org-wide admin family). Data scoping deferred to Phase 11.
  MANAGER: [
    "/companies", "/hotels", "/dairy", "/farms", "/education",
    "/supply-chain", "/finance", "/projects", "/insights", "/alerts",
    "/workflows", "/documents", "/employees", "/analytics", "/reports",
  ],
  // Limited operational pages only. No finance/reports/analytics/admin.
  STAFF: [
    "/hotels", "/dairy", "/farms", "/education", "/documents",
    "/employees",
  ],
};

function matches(path: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => path === p || path.startsWith(p + "/") || (p === "/" && path === "/"),
  );
}

export function isBreakGlass(path: string): boolean {
  return matches(path, BREAK_GLASS);
}

/** True if `role` may load `path`. ADMIN → always. Unknown role → deny
 *  (except break-glass/universal). */
export function canAccess(role: string | null | undefined, path: string): boolean {
  if (isBreakGlass(path)) return true;
  if (role === "ADMIN") return true;
  if (matches(path, UNIVERSAL)) return true;
  if (role === "EXECUTIVE" || role === "MANAGER" || role === "STAFF") {
    return matches(path, POLICY[role]);
  }
  return false;
}

export const PERMS_ENFORCED_ENV = "H_NERVE_PERMS_ENFORCED";

/** Server-side: is hard enforcement on? Default OFF = zero behavior
 *  change (ship inert, flip the env after preview-screen validation). */
export function permsEnforced(): boolean {
  return process.env[PERMS_ENFORCED_ENV] === "true";
}

// For the preview screen + sidebar: the roles we gate, in display order.
export const GATED_ROLES: PermRole[] = ["ADMIN", "EXECUTIVE", "MANAGER", "STAFF"];
