// moduleGate.ts — the DB-backed enabled-module cache behind the (app)
// layout's module gate. Pure w.r.t. Prisma: passes a shim loadPacks() so
// no DB is touched, mirroring src/lib/auth/permissions.test.ts.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getEnabledModuleSet,
  invalidateModuleCache,
  modulesEnforced,
  MODULES_ENFORCED_ENV,
} from "@/lib/tenancy/moduleGate";

type Row = { packKey: string; enabled: boolean };

beforeEach(() => {
  invalidateModuleCache();
});

describe("modulesEnforced — ship-inert flag", () => {
  it("defaults off when the env var is unset", () => {
    const prev = process.env[MODULES_ENFORCED_ENV];
    delete process.env[MODULES_ENFORCED_ENV];
    expect(modulesEnforced()).toBe(false);
    if (prev !== undefined) process.env[MODULES_ENFORCED_ENV] = prev;
  });

  it("is on only for the exact string 'true'", () => {
    const prev = process.env[MODULES_ENFORCED_ENV];
    process.env[MODULES_ENFORCED_ENV] = "1";
    expect(modulesEnforced()).toBe(false);
    process.env[MODULES_ENFORCED_ENV] = "true";
    expect(modulesEnforced()).toBe(true);
    if (prev !== undefined) process.env[MODULES_ENFORCED_ENV] = prev;
    else delete process.env[MODULES_ENFORCED_ENV];
  });
});

describe("getEnabledModuleSet — fail-open contract", () => {
  it("returns null (allow-all) for a null tenantId — no DB call made", async () => {
    const load = vi.fn(async (): Promise<Row[]> => []);
    expect(await getEnabledModuleSet(null, load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("returns null when the tenant has zero TenantPack rows (unconfigured)", async () => {
    const load = async (): Promise<Row[]> => [];
    expect(await getEnabledModuleSet("tenant-1", load)).toBeNull();
  });

  it("returns null on a load error (DB unreachable) rather than throwing", async () => {
    const load = async (): Promise<Row[]> => {
      throw new Error("D1 unreachable");
    };
    expect(await getEnabledModuleSet("tenant-1", load)).toBeNull();
  });

  it("returns the enabled subset, filtering out disabled rows and unknown keys", async () => {
    const load = async (): Promise<Row[]> => [
      { packKey: "pos", enabled: true },
      { packKey: "inventory", enabled: true },
      { packKey: "insurance", enabled: false },
      { packKey: "legacy-industry-key-hospitality", enabled: true },
    ];
    const set = await getEnabledModuleSet("tenant-1", load);
    expect(set).toEqual(new Set(["pos", "inventory"]));
  });

  it("caches within the TTL — a second call does not re-invoke loadPacks", async () => {
    const load = vi.fn(async (): Promise<Row[]> => [{ packKey: "finance", enabled: true }]);
    await getEnabledModuleSet("tenant-2", load);
    await getEnabledModuleSet("tenant-2", load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("invalidateModuleCache(tenantId) forces a fresh load for that tenant only", async () => {
    const loadA = vi.fn(async (): Promise<Row[]> => [{ packKey: "finance", enabled: true }]);
    const loadB = vi.fn(async (): Promise<Row[]> => [{ packKey: "pos", enabled: true }]);
    await getEnabledModuleSet("tenant-a", loadA);
    await getEnabledModuleSet("tenant-b", loadB);

    invalidateModuleCache("tenant-a");
    await getEnabledModuleSet("tenant-a", loadA);
    await getEnabledModuleSet("tenant-b", loadB);

    expect(loadA).toHaveBeenCalledTimes(2);
    expect(loadB).toHaveBeenCalledTimes(1); // untouched by the targeted invalidation
  });

  it("invalidateModuleCache() with no argument clears every tenant", async () => {
    const load = vi.fn(async (): Promise<Row[]> => [{ packKey: "finance", enabled: true }]);
    await getEnabledModuleSet("tenant-x", load);
    invalidateModuleCache();
    await getEnabledModuleSet("tenant-x", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
