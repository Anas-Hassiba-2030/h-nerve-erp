// moduleGate.ts — DB-backed enabled-module lookup for the (app) layout.
//
// Mirrors src/lib/auth/permissions.ts's override-cache layer deliberately:
// same TTL-cache shape, same "pass a load() shim so this stays testable
// without mocking Prisma" contract, same env-flag-gated ship-inert default.
// Middleware still can't import Prisma (edge runtime) — enforcement lives
// in the (app) layout, exactly where effectiveCanAccess() already does.

import { isModuleKey, type ModuleKey } from "./moduleCatalog";

export const MODULES_ENFORCED_ENV = "H_NERVE_MODULES_ENFORCED";

/** Server-side: is module-gating on? Default OFF = zero behavior change
 *  until explicitly flipped, same contract as permsEnforced(). */
export function modulesEnforced(): boolean {
  return process.env[MODULES_ENFORCED_ENV] === "true";
}

type CacheEntry = { set: Set<ModuleKey> | null; expiresAt: number };
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/** Call after any TenantPack write (toggleTenantModule) so the toggling
 *  admin's next navigation sees it immediately; other requests refresh
 *  within the TTL. Omit tenantId to clear every entry. */
export function invalidateModuleCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

/**
 * The enabled-module set for a tenant, or `null` meaning "unknown or
 * unconfigured — allow all": no tenantId, zero TenantPack rows (the tenant
 * has never been migrated onto module-grained packs), or a load error.
 * This fail-open contract matches permissions.ts's loadOverrides() exactly
 * (DB unreachable → empty Map → falls through to the static map) — a
 * tenant with no configured modules must never be locked out of their own
 * app because the toggle feature hasn't been used on them yet.
 *
 * Pass a `loadPacks` shim (usually `prisma.tenantPack.findMany`) so this
 * stays Prisma-free and unit-testable.
 */
export async function getEnabledModuleSet(
  tenantId: string | null,
  loadPacks: (tenantId: string) => Promise<Array<{ packKey: string; enabled: boolean }>>,
): Promise<Set<ModuleKey> | null> {
  if (!tenantId) return null;

  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.set;

  let result: Set<ModuleKey> | null;
  try {
    const packs = await loadPacks(tenantId);
    result =
      packs.length === 0
        ? null
        : new Set(packs.filter((p) => p.enabled).map((p) => p.packKey).filter(isModuleKey));
  } catch {
    result = null;
  }

  cache.set(tenantId, { set: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
