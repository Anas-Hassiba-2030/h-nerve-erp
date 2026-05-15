// Role/access logic — pure, security-critical, zero IO. Part of the
// Phase E regression net (the vibe-coding post's lesson #4).

import { describe, it, expect } from "vitest";
import { hasRole, isAdmin, isSafeId } from "./authz";

describe("hasRole — STAFF < MANAGER < EXECUTIVE < ADMIN", () => {
  it("null/undefined user is never authorized", () => {
    expect(hasRole(null, "STAFF")).toBe(false);
    expect(hasRole(undefined, "STAFF")).toBe(false);
  });

  it("exact role passes its own requirement", () => {
    expect(hasRole({ role: "STAFF" }, "STAFF")).toBe(true);
    expect(hasRole({ role: "MANAGER" }, "MANAGER")).toBe(true);
  });

  it("higher role satisfies a lower requirement", () => {
    expect(hasRole({ role: "ADMIN" }, "STAFF")).toBe(true);
    expect(hasRole({ role: "EXECUTIVE" }, "MANAGER")).toBe(true);
  });

  it("lower role fails a higher requirement", () => {
    expect(hasRole({ role: "STAFF" }, "MANAGER")).toBe(false);
    expect(hasRole({ role: "MANAGER" }, "ADMIN")).toBe(false);
  });

  it("array requirement passes if the LOWEST listed level is met", () => {
    expect(hasRole({ role: "MANAGER" }, ["MANAGER", "ADMIN"])).toBe(true);
    expect(hasRole({ role: "STAFF" }, ["MANAGER", "ADMIN"])).toBe(false);
  });

  it("an unknown role string is treated as the lowest (no access)", () => {
    expect(hasRole({ role: "WIZARD" }, "MANAGER")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("only the exact ADMIN role is admin", () => {
    expect(isAdmin({ role: "ADMIN" })).toBe(true);
    expect(isAdmin({ role: "EXECUTIVE" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe("isSafeId — path-traversal / injection guard", () => {
  it("accepts cuid-shaped ids", () => {
    expect(isSafeId("ckp9z3x0a0001q「")).toBe(false); // unicode oddity rejected
    expect(isSafeId("clф9z3x0a0001q")).toBe(false);
    expect(isSafeId("ckp9z3x0a0001q2b3c4d5e6f")).toBe(true);
    expect(isSafeId("safe-id_123")).toBe(true);
  });

  it("rejects empties, over-long, traversal, spaces, non-strings", () => {
    expect(isSafeId("")).toBe(false);
    expect(isSafeId("a".repeat(65))).toBe(false);
    expect(isSafeId("../../etc/passwd")).toBe(false);
    expect(isSafeId("a b")).toBe(false);
    expect(isSafeId(123 as unknown)).toBe(false);
    expect(isSafeId(null)).toBe(false);
  });
});
