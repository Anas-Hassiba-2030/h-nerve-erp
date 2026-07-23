// Phase P5 — unit coverage for effectiveCanAccess + the DB-override
// layer. Pure: passes a shim load() so no DB is touched.

import { describe, it, expect, beforeEach } from "vitest";
import { effectiveCanAccess, invalidatePermsCache } from "@/lib/auth/permissions";

type Row = { role: string; path: string; allowed: boolean };

beforeEach(() => {
  invalidatePermsCache();
});

describe("effectiveCanAccess — Phase P5 DB-override layer", () => {
  it("ADMIN always passes, regardless of overrides", async () => {
    const load = async (): Promise<Row[]> => [
      { role: "ADMIN", path: "/admin/system", allowed: false },
    ];
    expect(await effectiveCanAccess("ADMIN", "/admin/system", load)).toBe(true);
  });

  it("break-glass paths always pass", async () => {
    const load = async (): Promise<Row[]> => [];
    expect(await effectiveCanAccess("STAFF", "/login", load)).toBe(true);
    expect(await effectiveCanAccess("STAFF", "/api/health", load)).toBe(true);
  });

  it("DB override grants access to a normally-blocked path", async () => {
    const load = async (): Promise<Row[]> => [
      { role: "STAFF", path: "/finance", allowed: true },
    ];
    // STAFF default is BLOCKED for /finance (not in POLICY.STAFF).
    expect(await effectiveCanAccess("STAFF", "/finance", load)).toBe(true);
  });

  it("DB override revokes access to a normally-allowed path", async () => {
    const load = async (): Promise<Row[]> => [
      { role: "MANAGER", path: "/hotels", allowed: false },
    ];
    expect(await effectiveCanAccess("MANAGER", "/hotels", load)).toBe(false);
  });

  it("with no override, falls back to the hardcoded POLICY", async () => {
    const load = async (): Promise<Row[]> => [];
    // EXECUTIVE default has /finance (and, since the 2026-07 map refresh,
    // the ERP consoles under /admin — the PLATFORM console stays ADMIN-only
    // via the (admin) layout gate).
    expect(await effectiveCanAccess("EXECUTIVE", "/finance", load)).toBe(true);
    expect(await effectiveCanAccess("EXECUTIVE", "/admin/products", load)).toBe(true);
    // Connector secrets stay ADMIN-only.
    expect(await effectiveCanAccess("EXECUTIVE", "/integrations", load)).toBe(false);
  });

  it("override prefix matches sub-routes (longest-match)", async () => {
    const load = async (): Promise<Row[]> => [
      { role: "MANAGER", path: "/hotels", allowed: false },
    ];
    expect(await effectiveCanAccess("MANAGER", "/hotels/abc", load)).toBe(false);
  });
});
