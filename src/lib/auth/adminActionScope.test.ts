// Tests for the admin-action tenant scope guard. The contract:
//   • cross-tenant ADMIN trusts the submitted id (or rejects when empty),
//   • a pinned user is FORCED to their own tenant (foreign ids get overridden),
//   • a non-admin with no pin gets rejected entirely.

import { describe, it, expect } from "vitest";
import { resolveAdminTenantId, resolveOwnCompanyId } from "@/lib/auth/adminActionScope";

const cross = { role: "ADMIN" as const, tenantSlug: null, companyId: null };
const pinned = { role: "MANAGER" as const, tenantSlug: "arena", companyId: "c1" };
const adminPinned = { role: "ADMIN" as const, tenantSlug: "arena", companyId: "c1" };
const naked = { role: "STAFF" as const, tenantSlug: null, companyId: null };

describe("resolveAdminTenantId", () => {
  it("cross-tenant ADMIN: trusts a submitted id", () => {
    expect(resolveAdminTenantId(cross, "maha")).toEqual({ tenantId: "maha", overridden: false });
  });

  it("cross-tenant ADMIN: rejects when nothing was submitted", () => {
    expect(resolveAdminTenantId(cross, "")).toBeNull();
    expect(resolveAdminTenantId(cross, null)).toBeNull();
  });

  it("pinned user: own tenant always wins, no matter what was submitted", () => {
    expect(resolveAdminTenantId(pinned, "")).toEqual({ tenantId: "arena", overridden: false });
    expect(resolveAdminTenantId(pinned, "arena")).toEqual({ tenantId: "arena", overridden: false });
    // foreign id → OVERRIDDEN (the security-critical path)
    expect(resolveAdminTenantId(pinned, "maha")).toEqual({ tenantId: "arena", overridden: true });
  });

  it("ADMIN who is ALSO pinned is still pinned (no cross-tenant escape)", () => {
    expect(resolveAdminTenantId(adminPinned, "maha")).toEqual({ tenantId: "arena", overridden: true });
  });

  it("non-admin with no pin: rejects (action must refuse)", () => {
    expect(resolveAdminTenantId(naked, "arena")).toBeNull();
    expect(resolveAdminTenantId(naked, "")).toBeNull();
  });

  it("trims whitespace defensively", () => {
    expect(resolveAdminTenantId(pinned, "  maha  ")).toEqual({ tenantId: "arena", overridden: true });
    expect(resolveAdminTenantId(cross, "  loran  ")).toEqual({ tenantId: "loran", overridden: false });
  });
});

describe("resolveOwnCompanyId (companyId-plane own-scope, Phase ISO-3)", () => {
  it("pinned (active workspace set): forces the workspace, overriding a foreign companyId", () => {
    expect(resolveOwnCompanyId("foreign-co", "own-co")).toBe("own-co");
    expect(resolveOwnCompanyId("own-co", "own-co")).toBe("own-co");
  });

  it("cross-company ADMIN (no active workspace): keeps the submitted companyId", () => {
    expect(resolveOwnCompanyId("any-co", null)).toBe("any-co");
    expect(resolveOwnCompanyId("any-co", "")).toBe("any-co");
    expect(resolveOwnCompanyId("any-co", "   ")).toBe("any-co");
  });
});
