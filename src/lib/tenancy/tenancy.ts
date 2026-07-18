// tenancy.ts — light-weight tenancy context.
//
// In single-tenant mode (the current default), every request resolves to
// scope="default". When a multi-tenant deployment lands, the resolver
// reads the subdomain (or a tenant cookie) and switches scope.
//
// For the demo we expose a "view-as-tenant" cookie so a superadmin can
// preview any tenant's theme without signing into their subdomain.
//
// Phase 11 of docs/PHASES-INTELLIGENCE.md.

import { cookies } from "next/headers";
import type { ThemeKey } from "@/lib/brand/themes";

const VIEW_AS_COOKIE = "h_nerve_view_as_tenant";
const TENANT_THEME_COOKIE = "h_nerve_tenant_theme";

export async function getViewAsTenant(): Promise<string | null> {
  return (await cookies()).get(VIEW_AS_COOKIE)?.value ?? null;
}
export async function getTenantThemeCookie(): Promise<ThemeKey | null> {
  const v = (await cookies()).get(TENANT_THEME_COOKIE)?.value as ThemeKey | undefined;
  if (!v) return null;
  return v;
}

export const tenancyCookies = {
  VIEW_AS: VIEW_AS_COOKIE,
  THEME: TENANT_THEME_COOKIE,
};

// Phase F3 — request-context cookie carrying the active Tenant.slug.
// Set at login (alongside h_nerve_workspace) and by the manual switcher
// in app/actions/workspace.ts. Read by lib/db.ts $use middleware to
// scope tenant-keyed models.
export const TENANT_COOKIE = "h_nerve_tenant";
export async function getActiveTenantSlug(): Promise<string | null> {
  try {
    return (await cookies()).get(TENANT_COOKIE)?.value || null;
  } catch {
    // Non-request context — explicit tenant slug via env (MCP server).
    return process.env.H_NERVE_MCP_TENANT || null;
  }
}

// The canonical single-tenant fallback. In single-tenant deployments (the
// current one) the tenant cookie is often absent — a freshly-logged-in
// operator has no `h_nerve_tenant` set, so `getActiveTenantSlug()` returns
// null and every ERP write action that guarded on it dead-ended ("No active
// tenant"). That reads as a broken button. This is the group's primary
// tenant slug, used identically as the fallback across the codebase
// (COMPANY_CODE_TO_TENANT_SLUG, seeds, council/share actions).
export const DEFAULT_TENANT_SLUG = "hourani-hotels";

// Write-path tenant resolver: the active tenant, or the primary tenant when
// no cookie is set. ERP operator actions (invoices, POS, payroll, …) call
// THIS instead of getActiveTenantSlug() so their create buttons work in
// single-tenant mode without a tenant cookie.
export async function activeTenantSlug(): Promise<string> {
  return (await getActiveTenantSlug()) ?? DEFAULT_TENANT_SLUG;
}

export type TenantStatus = "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type ProvisioningStepKey =
  | "subdomain"
  | "schema"
  | "seed"
  | "theme"
  | "invite";

export const STEP_ORDER: ProvisioningStepKey[] = [
  "subdomain",
  "schema",
  "seed",
  "theme",
  "invite",
];

export const STEP_LABELS: Record<ProvisioningStepKey, { en: string; ar: string }> = {
  subdomain: { en: "Reserve subdomain",   ar: "حجز النطاق الفرعي" },
  schema:    { en: "Scope database",       ar: "تخصيص قاعدة البيانات" },
  seed:      { en: "Seed demo data",       ar: "زرع بيانات تجريبية" },
  theme:     { en: "Apply theme preset",  ar: "تطبيق إعداد المظهر" },
  invite:    { en: "Generate admin invite",ar: "إنشاء دعوة المسؤول" },
};

/** Synthetic per-step delay (ms) so the live checklist feels real in dev. */
export const STEP_DELAY_MS: Record<ProvisioningStepKey, number> = {
  subdomain: 350,
  schema:    600,
  seed:      1100,
  theme:     220,
  invite:    420,
};

export function isValidSlug(slug: string): boolean {
  // Valid lengths 1..32: a lone alphanumeric, or alnum + up to 30 middle
  // (alnum/hyphen) + alnum. {0,30} (not {1,30}) is what permits 2-char
  // slugs while still forbidding leading/trailing hyphens and capping at 32.
  return /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug);
}

// Phase F1 — bridge Company.code → Tenant.slug for session resolution.
// Until a per-company `tenantSlug` column lands on the schema this map
// is the source of truth. Seed (prisma/seed-demo.ts) aligns these.
export const COMPANY_CODE_TO_TENANT_SLUG: Record<string, string> = {
  HOTELS: "hourani-hotels",
  // Legacy dev-seed codes (prisma/seed.ts) — kept so the dev seed
  // doesn't break under the F4 NOT NULL tenantId constraint.
  HH: "hourani-hotels",
  ARENA: "hourani-hotels",
  MAHA: "maha-dairy",
  LORAN: "loran-agri",
  TANK: "tank-incubator",
  AAU: "tank-incubator",
};

// Sector-keyed fallback for the few writes that have a Company.sector
// in hand but not a code. Used by createBooking / createCrop.
export const SECTOR_TO_TENANT_SLUG: Record<string, string> = {
  HOSPITALITY: "hourani-hotels",
  DAIRY: "maha-dairy",
  AGRICULTURE: "loran-agri",
  EDUCATION: "tank-incubator",
};

// Pure (dependency-injected) — keeps lib/tenancy.ts free of DB imports
// so it stays unit-testable. Callers pass a `loadCompany` shim that
// reads `code` for an id; usually that's a `prisma.company.findUnique`.
export async function resolveTenantSlugForUser(
  companyId: string | null | undefined,
  loadCompany: (id: string) => Promise<{ code: string } | null>,
): Promise<string | null> {
  if (!companyId) return null;
  const company = await loadCompany(companyId);
  if (!company) return null;
  return COMPANY_CODE_TO_TENANT_SLUG[company.code] ?? null;
}
