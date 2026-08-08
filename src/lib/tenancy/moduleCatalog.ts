// moduleCatalog.ts — the universal, industry-neutral module catalog.
//
// docs/SYSTEM-BLUEPRINT.md §9 is the spec: one shared catalog, per-tenant
// toggles (TenantPack.packKey — see prisma/schema/tenancy.prisma), gated
// nav/routes. This file is the single source of truth for that catalog —
// mirrors how INTEL_SUBGROUPS derives the Intelligence rail groups, so the
// department groupings and the flat key list can never drift apart.
//
// Pure data + pure functions only. No DB/Next import — keeps this
// unit-testable without mocks, per the pure-core convention in lib/.

export type ModuleDepartment =
  | "sales"
  | "inventory-purchasing"
  | "accounting"
  | "operations"
  | "crm"
  | "hr"
  | "add-on";

export const MODULE_DEPARTMENT_ORDER: ModuleDepartment[] = [
  "sales",
  "inventory-purchasing",
  "accounting",
  "operations",
  "crm",
  "hr",
  "add-on",
];

export const MODULE_DEPARTMENT_LABELS: Record<ModuleDepartment, { en: string; ar: string }> = {
  "sales":                { en: "Sales Management",                    ar: "إدارة المبيعات" },
  "inventory-purchasing": { en: "Inventory & Purchases Management",     ar: "إدارة المخزون والمشتريات" },
  "accounting":           { en: "Accounting Management",                ar: "الإدارة المحاسبية" },
  "operations":           { en: "Operation Management",                 ar: "إدارة العمليات" },
  "crm":                  { en: "Customer Relationship Management",     ar: "إدارة علاقات العملاء" },
  "hr":                   { en: "Human Resources Management",           ar: "إدارة الموارد البشرية" },
  "add-on":               { en: "Add-On",                               ar: "إضافات" },
};

export type ModuleKey =
  // sales
  | "sales"
  | "pos"
  | "sales-targets-commissions"
  | "installments"
  | "offers"
  | "insurance"
  | "loyalty-points"
  | "e-invoice"
  // inventory-purchasing
  | "inventory"
  | "purchase-cycle"
  // accounting
  | "finance"
  | "chart-of-accounts"
  | "cheque-cycle"
  // operations
  | "work-orders"
  | "rental-unit-mgmt"
  | "lease-contracts"
  | "bookings-mgmt"
  | "time-tracking"
  | "manufacturing"
  | "workflow-automation"
  // crm
  | "clients"
  | "client-follow-up"
  | "membership"
  | "client-attendance"
  | "points-credits"
  // hr
  | "employees"
  | "requests"
  | "payroll"
  | "employee-attendance"
  | "org-structure"
  // add-on
  | "sms"
  | "shop-front"
  | "branches";

export interface ModuleDefinition {
  key: ModuleKey;
  department: ModuleDepartment;
  labelEn: string;
  labelAr: string;
  /** Module keys that must already be enabled before this one can be. */
  requires: ModuleKey[];
}

// One row per module. `requires` is the dependency edge Daftra's own UI
// leaves implicit (and gets wrong — see the Loyalty Points label/toggle
// mismatch noted in docs/SYSTEM-BLUEPRINT.md §9.2) — encoded here as data
// so it can be enforced in code, not left to a human reading toggle labels.
export const MODULE_CATALOG: Record<ModuleKey, ModuleDefinition> = {
  "sales":                     { key: "sales",                     department: "sales",                labelEn: "Sales",                          labelAr: "المبيعات",                    requires: [] },
  "pos":                       { key: "pos",                       department: "sales",                labelEn: "Point of Sale",                  labelAr: "نقطة البيع",                  requires: ["inventory"] },
  "sales-targets-commissions": { key: "sales-targets-commissions", department: "sales",                labelEn: "Sales Target & Commissions",     labelAr: "أهداف المبيعات والعمولات",     requires: ["sales"] },
  "installments":              { key: "installments",              department: "sales",                labelEn: "Installments Management",        labelAr: "إدارة الأقساط",                requires: ["sales"] },
  "offers":                    { key: "offers",                    department: "sales",                labelEn: "Offers",                         labelAr: "العروض",                      requires: ["sales"] },
  "insurance":                 { key: "insurance",                 department: "sales",                labelEn: "Insurance",                      labelAr: "التأمين",                     requires: [] },
  "loyalty-points":            { key: "loyalty-points",            department: "sales",                labelEn: "Client Loyalty Points",          labelAr: "نقاط ولاء العملاء",            requires: ["clients"] },
  "e-invoice":                 { key: "e-invoice",                 department: "sales",                labelEn: "Electronic Invoice",             labelAr: "الفاتورة الإلكترونية",         requires: ["sales", "finance"] },

  "inventory":                 { key: "inventory",                 department: "inventory-purchasing", labelEn: "Inventory Management",           labelAr: "إدارة المخزون",                requires: [] },
  "purchase-cycle":            { key: "purchase-cycle",            department: "inventory-purchasing", labelEn: "Purchase Cycle",                 labelAr: "دورة المشتريات",               requires: ["inventory"] },

  "finance":                   { key: "finance",                   department: "accounting",           labelEn: "Finance",                        labelAr: "المالية",                     requires: [] },
  "chart-of-accounts":         { key: "chart-of-accounts",         department: "accounting",           labelEn: "Chart of Accounts & Journals",   labelAr: "دليل الحسابات والقيود",        requires: ["finance"] },
  "cheque-cycle":              { key: "cheque-cycle",              department: "accounting",           labelEn: "Cheque Cycle",                   labelAr: "دورة الشيكات",                 requires: ["finance"] },

  "work-orders":               { key: "work-orders",               department: "operations",           labelEn: "Work Orders",                    labelAr: "أوامر العمل",                  requires: [] },
  "rental-unit-mgmt":          { key: "rental-unit-mgmt",          department: "operations",           labelEn: "Rental and Unit Management",     labelAr: "إدارة التأجير والوحدات",       requires: [] },
  "lease-contracts":           { key: "lease-contracts",           department: "operations",           labelEn: "Lease Contracts",                labelAr: "عقود الإيجار",                 requires: ["rental-unit-mgmt"] },
  "bookings-mgmt":             { key: "bookings-mgmt",             department: "operations",           labelEn: "Bookings Management",             labelAr: "إدارة الحجوزات",               requires: [] },
  "time-tracking":             { key: "time-tracking",             department: "operations",           labelEn: "Time Tracking",                  labelAr: "تتبع الوقت",                   requires: ["employees"] },
  "manufacturing":              { key: "manufacturing",             department: "operations",           labelEn: "Manufacturing",                  labelAr: "التصنيع",                     requires: ["inventory", "work-orders"] },
  "workflow-automation":       { key: "workflow-automation",       department: "operations",           labelEn: "Workflow",                       labelAr: "سير العمل",                    requires: [] },

  "clients":                   { key: "clients",                   department: "crm",                  labelEn: "Clients",                        labelAr: "العملاء",                     requires: [] },
  "client-follow-up":          { key: "client-follow-up",          department: "crm",                  labelEn: "Client Follow-Up",               labelAr: "متابعة العملاء",               requires: ["clients"] },
  "membership":                { key: "membership",                department: "crm",                  labelEn: "Membership",                     labelAr: "العضويات",                    requires: ["clients"] },
  "client-attendance":         { key: "client-attendance",         department: "crm",                  labelEn: "Clients Attendance",             labelAr: "حضور العملاء",                 requires: ["clients"] },
  "points-credits":            { key: "points-credits",            department: "crm",                  labelEn: "Points & Credits",                labelAr: "النقاط والأرصدة",              requires: ["clients"] },

  "employees":                 { key: "employees",                 department: "hr",                   labelEn: "Employees",                      labelAr: "الموظفون",                    requires: [] },
  "requests":                  { key: "requests",                  department: "hr",                   labelEn: "Requests",                       labelAr: "الطلبات",                     requires: ["employees"] },
  "payroll":                   { key: "payroll",                   department: "hr",                   labelEn: "Payroll",                        labelAr: "الرواتب",                     requires: ["employees"] },
  "employee-attendance":       { key: "employee-attendance",       department: "hr",                   labelEn: "Employee Attendance",            labelAr: "حضور الموظفين",                requires: ["employees"] },
  "org-structure":             { key: "org-structure",             department: "hr",                   labelEn: "Organizational Structure",       labelAr: "الهيكل التنظيمي",              requires: ["employees"] },

  "sms":                       { key: "sms",                       department: "add-on",               labelEn: "SMS",                            labelAr: "الرسائل النصية",               requires: [] },
  "shop-front":                { key: "shop-front",                department: "add-on",               labelEn: "Shop Front",                     labelAr: "واجهة المتجر",                 requires: ["sales", "inventory"] },
  "branches":                  { key: "branches",                  department: "add-on",               labelEn: "Branches",                       labelAr: "الفروع",                      requires: [] },
};

export const MODULE_KEYS: ModuleKey[] = Object.keys(MODULE_CATALOG) as ModuleKey[];

export function isModuleKey(value: string): value is ModuleKey {
  return Object.prototype.hasOwnProperty.call(MODULE_CATALOG, value);
}

// Derived, not hand-listed twice — same principle as INTEL_SUBGROUPS.flatMap.
export const MODULES_BY_DEPARTMENT: Record<ModuleDepartment, ModuleDefinition[]> =
  MODULE_DEPARTMENT_ORDER.reduce(
    (acc, dept) => {
      acc[dept] = MODULE_KEYS
        .map((k) => MODULE_CATALOG[k])
        .filter((m) => m.department === dept);
      return acc;
    },
    {} as Record<ModuleDepartment, ModuleDefinition[]>,
  );

/**
 * Catalog self-check: every `requires` edge must point at a real module key,
 * and no module may (directly) require itself. Call this from a test, not
 * at runtime — it's a build-time invariant, not a per-request check.
 */
export function validateCatalogIntegrity(): string[] {
  const problems: string[] = [];
  for (const key of MODULE_KEYS) {
    const def = MODULE_CATALOG[key];
    for (const req of def.requires) {
      if (!isModuleKey(req)) {
        problems.push(`${key} requires unknown module key "${req}"`);
      } else if (req === key) {
        problems.push(`${key} requires itself`);
      }
    }
  }
  return problems;
}

/**
 * Can `key` be enabled given the modules already enabled (or requested
 * alongside it)? Returns the still-missing dependencies, if any — this is
 * the server-side gate the toggle action must call before writing
 * TenantPack, so a checkbox alone can never produce an incoherent tenant
 * (e.g. POS on with Inventory off).
 */
export function canEnableModule(
  key: ModuleKey,
  enabled: ReadonlySet<ModuleKey> | ModuleKey[],
): { ok: boolean; missing: ModuleKey[] } {
  const enabledSet = enabled instanceof Set ? enabled : new Set(enabled);
  const missing = MODULE_CATALOG[key].requires.filter((r) => !enabledSet.has(r));
  return { ok: missing.length === 0, missing };
}

/**
 * Resolve a requested module set down to what's actually coherent: a
 * module survives only if its full (transitive) `requires` chain is also
 * in the requested set. Anything that doesn't survive is reported in
 * `blocked` with the specific missing dependency keys, so a caller (the
 * admin toggle UI, a seed script) can show *why* instead of silently
 * dropping a checkbox.
 */
export function resolveEnabledModules(requested: ModuleKey[]): {
  enabled: ModuleKey[];
  blocked: Partial<Record<ModuleKey, ModuleKey[]>>;
} {
  const requestedSet = new Set(requested);
  let stableSet = new Set(requested);
  let changed = true;

  // Fixed-point loop: a module can be knocked out by a dependency that was
  // itself knocked out one level up (e.g. lease-contracts -> rental-unit-mgmt
  // -> some future deeper chain). Bounded by MODULE_KEYS.length, so it always
  // terminates.
  for (let i = 0; i < MODULE_KEYS.length && changed; i++) {
    changed = false;
    for (const key of Array.from(stableSet)) {
      const { ok } = canEnableModule(key, stableSet);
      if (!ok) {
        stableSet.delete(key);
        changed = true;
      }
    }
  }

  const blocked: Partial<Record<ModuleKey, ModuleKey[]>> = {};
  for (const key of requestedSet) {
    if (!stableSet.has(key)) {
      blocked[key] = MODULE_CATALOG[key].requires.filter((r) => !stableSet.has(r));
    }
  }

  return { enabled: Array.from(stableSet), blocked };
}

/**
 * The modules (among `enabled`) that would break if `key` were disabled —
 * i.e. every currently-enabled module whose `requires` includes `key`. The
 * disable side of the toggle action must check this: turning Employees off
 * while Payroll is still on leaves Payroll enabled with a missing
 * dependency, the exact incoherence `resolveEnabledModules` exists to
 * prevent on the enable side.
 */
export function dependentsOf(key: ModuleKey, enabled: ModuleKey[]): ModuleKey[] {
  return enabled.filter((k) => k !== key && MODULE_CATALOG[k].requires.includes(key));
}

// ---------------------------------------------------------------------
// Starter bundles — bridge for the tenant-creation wizard's "industry"
// checkboxes (src/lib/brand/themes.ts PACK_CATALOG: hospitality | dairy |
// agri | education | finance), which pick a starting vertical, not
// individual modules. TenantPack is now module-grained everywhere (§9.3),
// so createTenant() must expand a chosen industry into its starter module
// set rather than writing the raw industry string as a packKey — that
// string was never a ModuleKey and would silently rot as an orphan row.
// ---------------------------------------------------------------------
export type IndustryKey = "hospitality" | "dairy" | "agri" | "education" | "finance";

export const STARTER_MODULE_BUNDLES: Record<IndustryKey, ModuleKey[]> = {
  hospitality: [
    "sales", "pos", "inventory", "clients", "client-follow-up",
    "bookings-mgmt", "employees", "payroll", "org-structure",
    "finance", "chart-of-accounts", "branches",
  ],
  dairy: [
    "inventory", "purchase-cycle", "work-orders", "manufacturing",
    "employees", "payroll", "finance", "chart-of-accounts",
  ],
  agri: [
    "inventory", "purchase-cycle", "work-orders",
    "employees", "payroll", "finance",
  ],
  education: [
    "clients", "membership", "client-attendance",
    "employees", "org-structure", "finance",
  ],
  finance: ["finance", "chart-of-accounts", "cheque-cycle"],
};

/**
 * Expand a set of chosen industries into one coherent, deduplicated module
 * set — the union of their starter bundles, resolved through
 * resolveEnabledModules() so overlapping bundles (every industry includes
 * "finance") never produce a `requires`-violating write.
 */
export function resolveStarterModules(industries: IndustryKey[]): ModuleKey[] {
  const requested = Array.from(new Set(industries.flatMap((i) => STARTER_MODULE_BUNDLES[i])));
  return resolveEnabledModules(requested).enabled;
}

// ---------------------------------------------------------------------
// Route → module gating. PURE (no server-only imports) — same reason
// src/lib/auth/permissions.ts gives for staying pure: middleware, the
// Sidebar (client component), and a layout can all read one source of
// truth. This is the (app) route-group ERP surface ONLY — (admin) and
// (theater) are platform surfaces, gated by role (permissions.ts), not
// by tenant module. Mirrors that file's structure deliberately.
//
// Deliberately partial: only routes with an unambiguous 1:1 module map are
// listed. An unmapped path is NOT a gap — it means that page isn't owned by
// any single catalog module (dashboards, the Brain, cross-vertical
// analysis, company/user administration, …) and must default-allow. Do not
// "complete" this map by inventing a catalog entry to cover a leftover
// route — see docs/SYSTEM-BLUEPRINT.md §9.2's own warning against that.
//
// MUST NOT contain any path from permissions.ts's BREAK_GLASS or UNIVERSAL
// lists — a universal/break-glass path can be the enforcement gate's own
// redirect target, and a module-gated redirect target that itself 404s (or
// redirects again) is an infinite loop. Enforced by a test, not just this
// comment.
export const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  "/pos": "pos",
  "/finance": "finance",
  "/invoices": "sales",
  "/estimates": "sales",
  "/payments": "finance",
  "/purchase-invoices": "purchase-cycle",
  "/purchase-payments": "purchase-cycle",
  "/statements": "finance",
  "/treasuries": "finance",
  "/e-invoicing": "e-invoice",
  "/crm": "clients",
  "/customers": "clients",
  "/suppliers": "purchase-cycle",
  "/employees": "employees",
  "/hr": "employees",
  "/hr/payroll": "payroll",
  "/hr/attendance": "employee-attendance",
  "/hr/leave": "requests",
  "/hotels": "bookings-mgmt",
  "/hotels/bookings": "bookings-mgmt",
  "/dairy": "manufacturing",
  "/manufacturing": "manufacturing",
  "/maintenance": "work-orders",
  "/workflows": "workflow-automation",
  // The (app) group's ERP-admin console prefix (CLAUDE.md: "(app) route
  // group serves the ERP operator consoles … under /admin/*" — distinct
  // from the platform (admin) route group). Only the sub-paths with a
  // clear module map are listed; /admin itself is NOT mapped, so an
  // unlisted sub-console (imports, mappings, quality, projects, …)
  // default-allows rather than inheriting a guess.
  "/admin/warehouses": "inventory",
  "/admin/products": "inventory",
  "/admin/movements": "inventory",
  "/admin/lots": "inventory",
  "/admin/transfers": "inventory",
  "/admin/replenishment": "inventory",
  "/admin/landed-costs": "inventory",
  "/admin/mps": "manufacturing",
  "/admin/purchase-orders": "purchase-cycle",
  "/admin/sales-orders": "sales",
  "/admin/journal": "chart-of-accounts",
  "/admin/accounts": "chart-of-accounts",
  "/admin/cost-centers": "chart-of-accounts",
  "/admin/budgets": "finance",
  "/admin/fx": "finance",
  "/admin/reconciliation": "finance",
  "/admin/customers": "clients",
  "/admin/suppliers": "purchase-cycle",
};

/**
 * Is `path` reachable given `enabled`? `enabled === null` means "unknown or
 * unconfigured tenant" and always allows — the same fail-open contract
 * `getEnabledModuleSet()` (moduleGate.ts) returns for a tenant with zero
 * TenantPack rows or a load error, so an operator is never locked out by a
 * DB hiccup or a tenant that simply hasn't been migrated onto module-grained
 * packs yet. Longest-matching-prefix wins so a more specific route (e.g.
 * "/hr/payroll") overrides its parent's mapping ("/hr").
 */
export function moduleAccessible(
  enabled: ReadonlySet<ModuleKey> | ModuleKey[] | null,
  path: string,
): boolean {
  if (enabled === null) return true;
  const enabledSet = enabled instanceof Set ? enabled : new Set(enabled);

  let bestPrefix = "";
  let bestKey: ModuleKey | null = null;
  for (const [prefix, key] of Object.entries(ROUTE_MODULE_MAP)) {
    const hit = path === prefix || path.startsWith(prefix + "/");
    if (hit && prefix.length > bestPrefix.length) {
      bestPrefix = prefix;
      bestKey = key;
    }
  }
  if (!bestKey) return true; // unmapped route — default allow
  return enabledSet.has(bestKey);
}
