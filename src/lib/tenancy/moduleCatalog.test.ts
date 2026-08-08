// moduleCatalog.ts — the universal module catalog + its dependency-edge
// enforcement. These are the guardrails docs/SYSTEM-BLUEPRINT.md §9.2 exists
// to prevent: a dangling `requires` reference, or a toggle enabling a
// module whose dependency isn't on (POS without Inventory, etc).

import { describe, it, expect } from "vitest";
import { BREAK_GLASS, UNIVERSAL } from "@/lib/auth/permissions";
import {
  MODULE_CATALOG,
  MODULE_KEYS,
  MODULE_DEPARTMENT_ORDER,
  MODULES_BY_DEPARTMENT,
  isModuleKey,
  validateCatalogIntegrity,
  canEnableModule,
  resolveEnabledModules,
  dependentsOf,
  STARTER_MODULE_BUNDLES,
  resolveStarterModules,
  ROUTE_MODULE_MAP,
  moduleAccessible,
  type IndustryKey,
} from "@/lib/tenancy/moduleCatalog";

describe("MODULE_CATALOG — integrity", () => {
  it("has no dangling or self-referencing `requires` edges", () => {
    expect(validateCatalogIntegrity()).toEqual([]);
  });

  it("every module belongs to a department in MODULE_DEPARTMENT_ORDER", () => {
    for (const key of MODULE_KEYS) {
      expect(MODULE_DEPARTMENT_ORDER).toContain(MODULE_CATALOG[key].department);
    }
  });

  it("MODULES_BY_DEPARTMENT is a partition — every key appears exactly once", () => {
    const seen = new Set<string>();
    for (const dept of MODULE_DEPARTMENT_ORDER) {
      for (const def of MODULES_BY_DEPARTMENT[dept]) {
        expect(seen.has(def.key)).toBe(false);
        seen.add(def.key);
      }
    }
    expect(seen.size).toBe(MODULE_KEYS.length);
  });

  it("isModuleKey rejects unknown strings", () => {
    expect(isModuleKey("pos")).toBe(true);
    expect(isModuleKey("time-machine")).toBe(false);
  });
});

describe("canEnableModule — the toggle server-action gate", () => {
  it("blocks POS without Inventory", () => {
    const { ok, missing } = canEnableModule("pos", []);
    expect(ok).toBe(false);
    expect(missing).toEqual(["inventory"]);
  });

  it("allows POS once Inventory is already enabled", () => {
    const { ok, missing } = canEnableModule("pos", ["inventory"]);
    expect(ok).toBe(true);
    expect(missing).toEqual([]);
  });

  it("blocks Manufacturing missing either of its two dependencies", () => {
    expect(canEnableModule("manufacturing", ["inventory"]).ok).toBe(false);
    expect(canEnableModule("manufacturing", ["work-orders"]).ok).toBe(false);
    expect(canEnableModule("manufacturing", ["inventory", "work-orders"]).ok).toBe(true);
  });

  it("modules with no requires are always enableable", () => {
    expect(canEnableModule("finance", []).ok).toBe(true);
    expect(canEnableModule("branches", []).ok).toBe(true);
  });
});

describe("resolveEnabledModules — coherent tenant set from a raw request", () => {
  it("keeps a module whose dependency is in the same request", () => {
    const { enabled, blocked } = resolveEnabledModules(["inventory", "pos"]);
    expect(enabled.sort()).toEqual(["inventory", "pos"]);
    expect(blocked).toEqual({});
  });

  it("drops a module and reports the missing dependency when requested alone", () => {
    const { enabled, blocked } = resolveEnabledModules(["pos"]);
    expect(enabled).toEqual([]);
    expect(blocked.pos).toEqual(["inventory"]);
  });

  it("cascades: dropping a level-1 dependency also drops what needs it", () => {
    // lease-contracts requires rental-unit-mgmt; request lease-contracts
    // WITHOUT rental-unit-mgmt — it must not survive on its own.
    const { enabled, blocked } = resolveEnabledModules(["lease-contracts"]);
    expect(enabled).toEqual([]);
    expect(blocked["lease-contracts"]).toEqual(["rental-unit-mgmt"]);
  });

  it("a full valid chain survives intact (hospitality-shaped tenant)", () => {
    const requested = [
      "sales", "pos", "inventory", "clients", "bookings-mgmt",
      "employees", "payroll", "finance",
    ] as const;
    const { enabled, blocked } = resolveEnabledModules([...requested]);
    expect(blocked).toEqual({});
    for (const key of requested) expect(enabled).toContain(key);
  });

  it("a dairy/manufacturing-shaped tenant resolves cleanly", () => {
    const requested = [
      "inventory", "purchase-cycle", "work-orders", "manufacturing",
      "employees", "payroll", "finance", "chart-of-accounts",
    ] as const;
    const { enabled, blocked } = resolveEnabledModules([...requested]);
    expect(blocked).toEqual({});
    expect(enabled.length).toBe(requested.length);
  });
});

describe("dependentsOf — the disable-side guard", () => {
  it("names Payroll as a dependent of Employees", () => {
    expect(dependentsOf("employees", ["employees", "payroll", "finance"])).toEqual(["payroll"]);
  });

  it("returns empty when nothing enabled depends on the key", () => {
    expect(dependentsOf("finance", ["finance", "inventory"])).toEqual([]);
  });

  it("never lists the key itself even if it self-required (defensive)", () => {
    expect(dependentsOf("payroll", ["payroll"])).toEqual([]);
  });
});

describe("STARTER_MODULE_BUNDLES / resolveStarterModules — tenant-creation wizard bridge", () => {
  const INDUSTRIES = Object.keys(STARTER_MODULE_BUNDLES) as IndustryKey[];

  it("every starter bundle is internally coherent (no blocked modules)", () => {
    for (const industry of INDUSTRIES) {
      const { blocked } = resolveEnabledModules(STARTER_MODULE_BUNDLES[industry]);
      expect(blocked, `bundle "${industry}" has an incoherent requires chain`).toEqual({});
    }
  });

  it("resolves a single industry to exactly its bundle", () => {
    expect(resolveStarterModules(["dairy"]).sort()).toEqual(
      [...STARTER_MODULE_BUNDLES.dairy].sort(),
    );
  });

  it("unions overlapping bundles without duplicates (every industry includes finance)", () => {
    const modules = resolveStarterModules(["hospitality", "dairy"]);
    expect(modules).toContain("finance");
    expect(modules.filter((m) => m === "finance").length).toBe(1);
  });

  it("returns nothing for an empty industry selection", () => {
    expect(resolveStarterModules([])).toEqual([]);
  });
});

describe("ROUTE_MODULE_MAP — the invariant that prevents a redirect loop", () => {
  it("never maps a BREAK_GLASS or UNIVERSAL path (those are canAccess's own", () => {
    // safe redirect targets — a module-gated redirect target that itself
    // gets gated is an infinite loop, e.g. /dashboard mapped to a disabled
    // module).
    const mapped = Object.keys(ROUTE_MODULE_MAP);
    for (const safe of [...BREAK_GLASS, ...UNIVERSAL]) {
      for (const path of mapped) {
        const collides = path === safe || path.startsWith(safe + "/") || safe.startsWith(path + "/");
        expect(collides, `"${path}" collides with safe path "${safe}"`).toBe(false);
      }
    }
  });

  it("every mapped module key exists in the catalog", () => {
    for (const key of Object.values(ROUTE_MODULE_MAP)) {
      expect(isModuleKey(key)).toBe(true);
    }
  });
});

describe("moduleAccessible — the (app) layout's route gate", () => {
  it("allows everything when the tenant is unconfigured/unknown (null)", () => {
    expect(moduleAccessible(null, "/pos")).toBe(true);
    expect(moduleAccessible(null, "/hr/payroll")).toBe(true);
  });

  it("default-allows any unmapped route regardless of enabled set", () => {
    expect(moduleAccessible([], "/dashboard")).toBe(true);
    expect(moduleAccessible([], "/brain/council")).toBe(true);
    expect(moduleAccessible(["pos"], "/insights")).toBe(true);
  });

  it("blocks a mapped route whose module is off", () => {
    expect(moduleAccessible([], "/pos")).toBe(false);
    expect(moduleAccessible(["inventory"], "/pos")).toBe(false);
  });

  it("allows a mapped route whose module is on", () => {
    expect(moduleAccessible(["pos"], "/pos")).toBe(true);
    expect(moduleAccessible(new Set(["pos"] as const), "/pos")).toBe(true);
  });

  it("longest-prefix-match: a specific sub-route overrides its parent's module", () => {
    // /hr -> employees, /hr/payroll -> payroll. Employees on, Payroll off:
    // the HR overview is reachable, the payroll sub-page is not.
    expect(moduleAccessible(["employees"], "/hr")).toBe(true);
    expect(moduleAccessible(["employees"], "/hr/payroll")).toBe(false);
    expect(moduleAccessible(["employees", "payroll"], "/hr/payroll")).toBe(true);
  });

  it("matches nested paths under a mapped prefix", () => {
    expect(moduleAccessible(["finance"], "/finance/journal-entries/123")).toBe(true);
    expect(moduleAccessible([], "/finance/journal-entries/123")).toBe(false);
  });
});
