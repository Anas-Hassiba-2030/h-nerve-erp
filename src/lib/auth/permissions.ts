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
export const BREAK_GLASS = ["/login", "/signup", "/logout", "/api/health", "/"];

// Allowed for ANY authenticated role (self-service / universal).
// /portal is here because portal CUSTOMERS carry their own cookie
// (bmv2026_portal_session) — the middleware never sees a role for them —
// but an OPERATOR who is also signed in must not be bounced off the
// customer door. /dev + /protocol are the public developer portal.
export const UNIVERSAL = [
  "/dashboard", "/settings", "/search", "/help", "/messages",
  "/tasks", "/pinned", "/showcase", "/changelog", "/roadmap",
  "/achievements", "/digest", "/notifications", "/inbox",
  // /orrery and /console are the two shell HOMES (lib/theme/shell.ts). Both are
  // pure navigation over ORRERY_GROUPS and grant nothing — every destination
  // they link to is gated on its own. Gating a shell home would strand a role
  // on a page with no way out.
  "/me", "/activity", "/orrery", "/console", "/m", "/learning", "/design-system",
  "/portal", "/dev", "/protocol",
];

// ADMIN-only surfaces (everything not granted below is ADMIN-only by the
// deny-by-default model — this list exists so the route-coverage test can
// prove every shipped route was CLASSIFIED, not forgotten).
// /integrations holds connector secrets; /trash restores soft-deleted rows.
// The platform console under app/(admin) is ADDITIONALLY hard-gated to
// ADMIN by its layout regardless of this map.
export const ADMIN_ONLY = ["/integrations", "/trash"];

// Per-role allow-list (path prefixes), ON TOP of UNIVERSAL.
// ADMIN is special-cased to all access (not listed here).
//
// NOTE on /admin: the (app) route group serves the ERP operator consoles
// (journal, accounts, products, warehouses, …) under /admin/*, while the
// PLATFORM console (tenants, empire, genesis, …) lives in the (admin)
// group whose layout hard-redirects non-ADMIN roles. Granting the /admin
// prefix to EXECUTIVE/MANAGER therefore opens the ERP consoles only.
export const POLICY: Record<Exclude<PermRole, "ADMIN">, string[]> = {
  // Financial + strategic: full finance suite, analysis, org views,
  // the Brain, Theater, Empire and Workspace. No connector secrets.
  EXECUTIVE: [
    "/finance", "/invoices", "/payments", "/purchase-invoices",
    "/purchase-payments", "/estimates", "/statements", "/treasuries",
    "/e-invoicing", "/reports", "/analytics", "/markets", "/insights",
    "/sustainability", "/compare", "/audit-360", "/brain", "/memory",
    "/plans", "/alerts", "/companies", "/customers", "/suppliers",
    "/crm", "/assets", "/projects", "/employees", "/hr", "/users",
    "/documents", "/supply-chain", "/workflows", "/workspace",
    "/system", "/theater", "/empire", "/admin", "/voac",
  ],
  // Operational: verticals, sales/purchasing cycle, production,
  // maintenance, HR, the ERP consoles. No treasury, no Brain/Empire,
  // no markets/sustainability analysis surfaces.
  MANAGER: [
    "/companies", "/hotels", "/dairy", "/farms", "/education",
    "/supply-chain", "/finance", "/projects", "/insights", "/alerts",
    "/workflows", "/documents", "/employees", "/analytics", "/reports",
    "/crm", "/customers", "/suppliers", "/invoices", "/payments",
    "/purchase-invoices", "/purchase-payments", "/estimates",
    "/statements", "/e-invoicing", "/pos", "/manufacturing",
    "/maintenance", "/assets", "/hr", "/users", "/admin",
    "/workspace", "/theater",
    // The VOAC ledger. MANAGER is the role that DECIDES proposals (the
    // decide/record actions require it), so the queue has to be reachable —
    // a gate the decider cannot open is just a broken feature. STAFF is
    // deliberately excluded: accepting a proposal is a commitment.
    "/voac",
  ],
  // Front-line operational pages only: the verticals they work in,
  // the POS register, shop-floor manufacturing, maintenance tickets.
  STAFF: [
    "/hotels", "/dairy", "/farms", "/education", "/documents",
    "/pos", "/manufacturing", "/maintenance",
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

// =====================================================================
// Phase P5 follow-up — layer DB-stored RolePermission rows on top of the
// hardcoded POLICY map. The interactive editor at /admin/permissions-
// preview writes (role, path, allowed) overrides; this layer reads them
// from a TTL-cached in-memory Map. Middleware can't import Prisma (edge
// runtime), so the actual enforcement is layout-level: the (app), (admin),
// and (theater) layouts call effectiveCanAccess() before rendering.
//
// Cache TTL is 60s. togglePermission also explicitly invalidates the
// cache so a toggle is visible immediately to the toggling admin's next
// navigation. Other server processes refresh within 60s.
// =====================================================================

type OverrideCache = { rows: Map<string, boolean>; expiresAt: number };
const OVERRIDE_TTL_MS = 60_000;
let overrideCache: OverrideCache | null = null;

export function invalidatePermsCache(): void {
  overrideCache = null;
}

async function loadOverrides(
  load: () => Promise<Array<{ role: string; path: string; allowed: boolean }>>,
): Promise<Map<string, boolean>> {
  if (overrideCache && overrideCache.expiresAt > Date.now()) {
    return overrideCache.rows;
  }
  try {
    const rows = await load();
    const map = new Map(rows.map((r) => [`${r.role}:${r.path}`, r.allowed]));
    overrideCache = { rows: map, expiresAt: Date.now() + OVERRIDE_TTL_MS };
    return map;
  } catch {
    // DB unreachable → fall back to empty (no overrides). canAccess
    // hardcoded path still runs, so the system stays usable.
    return new Map();
  }
}

/**
 * Same semantics as canAccess(role, path) but consults RolePermission
 * overrides first. Pass a `loadOverrides` shim so this module stays
 * Prisma-free (testable + edge-safe). The (app)/(admin) layouts wire
 * it to `prismaUnscoped.rolePermission.findMany`.
 */
export async function effectiveCanAccess(
  role: string | null | undefined,
  path: string,
  load: () => Promise<Array<{ role: string; path: string; allowed: boolean }>>,
): Promise<boolean> {
  // Break-glass + ADMIN bypass the override layer too (defense in
  // depth — even a misconfigured DB row can't lock ADMIN out).
  if (isBreakGlass(path)) return true;
  if (role === "ADMIN") return true;

  const map = await loadOverrides(load);
  // Match either the exact path OR the longest matching prefix that has
  // an override. Mirrors `matches()` semantics for the static POLICY.
  // Iterate keys to find a registered prefix; bounded by ~150 cells.
  let explicit: boolean | undefined;
  for (const [key, allowed] of map.entries()) {
    const [r, p] = key.split(":", 2);
    if (r !== role) continue;
    if (path === p || path.startsWith(p + "/")) {
      // Prefer the longest matching prefix.
      if (explicit === undefined || p.length > 0) explicit = allowed;
    }
  }
  if (explicit !== undefined) return explicit;
  return canAccess(role, path);
}
