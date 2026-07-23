// Route-coverage lock for the permission map. With H_NERVE_PERMS_ENFORCED
// on, any route segment nobody CLASSIFIED is silently ADMIN-only (deny by
// default) — which reads as "the button is dead" to every other role. This
// test walks the real src/app route groups and fails the build when a new
// top-level route ships without a decision in permissions.ts (UNIVERSAL,
// some role's POLICY list, ADMIN_ONLY, or BREAK_GLASS).

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { BREAK_GLASS, UNIVERSAL, ADMIN_ONLY, POLICY, canAccess } from "./permissions";

const appDir = (rel: string) => fileURLToPath(new URL(`../../app/${rel}`, import.meta.url));

function routeDirs(rel: string): string[] {
  return readdirSync(appDir(rel), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

// Every path prefix the map knows about.
const CLASSIFIED = new Set<string>([
  ...BREAK_GLASS,
  ...UNIVERSAL,
  ...ADMIN_ONLY,
  ...POLICY.EXECUTIVE,
  ...POLICY.MANAGER,
  ...POLICY.STAFF,
]);

describe("permission map — route coverage", () => {
  it("every top-level (app) route is classified", () => {
    const missing = routeDirs("(app)")
      .map((seg) => `/${seg}`)
      .filter((p) => !CLASSIFIED.has(p));
    expect(missing, `Unclassified (app) routes — add each to permissions.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("root-level page routes (orrery, m, empire, dev, protocol) are classified", () => {
    for (const p of ["/orrery", "/m", "/empire", "/dev", "/protocol"]) {
      expect(CLASSIFIED.has(p), `${p} missing from permissions.ts`).toBe(true);
    }
  });

  it("theater + portal + admin route-group prefixes are classified", () => {
    for (const p of ["/theater", "/portal", "/admin"]) {
      expect(CLASSIFIED.has(p), `${p} missing from permissions.ts`).toBe(true);
    }
  });
});

describe("permission map — role spot-checks (enforcement semantics)", () => {
  it("STAFF: POS + verticals yes; finance, treasury, ERP consoles no", () => {
    expect(canAccess("STAFF", "/pos")).toBe(true);
    expect(canAccess("STAFF", "/hotels/h1")).toBe(true);
    expect(canAccess("STAFF", "/finance")).toBe(false);
    expect(canAccess("STAFF", "/treasuries")).toBe(false);
    expect(canAccess("STAFF", "/admin/journal")).toBe(false);
    expect(canAccess("STAFF", "/integrations")).toBe(false);
  });

  it("MANAGER: sales/purchasing cycle + ERP consoles yes; treasury, Brain, Empire no", () => {
    expect(canAccess("MANAGER", "/invoices/new")).toBe(true);
    expect(canAccess("MANAGER", "/manufacturing")).toBe(true);
    expect(canAccess("MANAGER", "/admin/products")).toBe(true);
    expect(canAccess("MANAGER", "/treasuries")).toBe(false);
    expect(canAccess("MANAGER", "/brain/council")).toBe(false);
    expect(canAccess("MANAGER", "/empire")).toBe(false);
  });

  it("EXECUTIVE: full finance suite + Brain + Empire yes; connector secrets no", () => {
    expect(canAccess("EXECUTIVE", "/treasuries")).toBe(true);
    expect(canAccess("EXECUTIVE", "/brain/council")).toBe(true);
    expect(canAccess("EXECUTIVE", "/empire")).toBe(true);
    expect(canAccess("EXECUTIVE", "/integrations")).toBe(false);
    expect(canAccess("EXECUTIVE", "/trash")).toBe(false);
  });

  it("every role keeps the universal self-service surfaces (no lockout)", () => {
    for (const role of ["EXECUTIVE", "MANAGER", "STAFF"]) {
      expect(canAccess(role, "/dashboard")).toBe(true);
      expect(canAccess(role, "/orrery")).toBe(true);
      expect(canAccess(role, "/settings")).toBe(true);
      expect(canAccess(role, "/me")).toBe(true);
    }
  });

  it("unknown/absent role → deny except break-glass + universal", () => {
    expect(canAccess("CUSTOMER", "/finance")).toBe(false);
    expect(canAccess(null, "/login")).toBe(true);
    expect(canAccess(undefined, "/dashboard")).toBe(true);
  });
});
