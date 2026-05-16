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

export function getViewAsTenant(): string | null {
  return cookies().get(VIEW_AS_COOKIE)?.value ?? null;
}
export function getTenantThemeCookie(): ThemeKey | null {
  const v = cookies().get(TENANT_THEME_COOKIE)?.value as ThemeKey | undefined;
  if (!v) return null;
  return v;
}

export const tenancyCookies = {
  VIEW_AS: VIEW_AS_COOKIE,
  THEME: TENANT_THEME_COOKIE,
};

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
