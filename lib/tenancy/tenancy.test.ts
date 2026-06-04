// lib/tenancy.ts — multi-tenant scope + provisioning checklist. isValidSlug
// is the subdomain safety gate (a bad slug = a broken/hijackable tenant
// host). next/headers is mocked so the cookie readers are unit-testable.

import { vi, describe, it, expect } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import {
  getViewAsTenant,
  getTenantThemeCookie,
  tenancyCookies,
  STEP_ORDER,
  STEP_LABELS,
  STEP_DELAY_MS,
  isValidSlug,
} from "@/lib/tenancy/tenancy";

function mockCookie(map: Record<string, string>) {
  vi.mocked(cookies).mockReturnValue({
    get: (n: string) => (n in map ? { value: map[n] } : undefined),
  } as any);
}

describe("isValidSlug — subdomain gate", () => {
  it("accepts 1-, 2-, and 3+ char alphanumeric / hyphenated slugs", () => {
    expect(isValidSlug("a")).toBe(true);
    expect(isValidSlug("9")).toBe(true);
    expect(isValidSlug("ab")).toBe(true); // 2-char now valid (bug fixed)
    expect(isValidSlug("abc")).toBe(true);
    expect(isValidSlug("blue-meadow-dairy")).toBe(true);
    expect(isValidSlug("a" + "b".repeat(30) + "c")).toBe(true); // 32 = max
  });

  it("rejects uppercase, underscores, edge hyphens, spaces, over-length", () => {
    expect(isValidSlug("Acme")).toBe(false);
    expect(isValidSlug("a_b")).toBe(false);
    expect(isValidSlug("-ab")).toBe(false);
    expect(isValidSlug("ab-")).toBe(false);
    expect(isValidSlug("a b")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a" + "b".repeat(31) + "c")).toBe(false); // 33 > max
  });

  // REGRESSION: the original regex used {1,30} for the middle group, which
  // had no length-2 path (valid lengths were {1, 3, 4, …, 32}). Fixed to
  // {0,30} so a 2-character slug is now accepted, while leading/trailing
  // hyphens and the 32-char cap stay enforced.
  it("FIXED: exactly-2-character slugs are now accepted", () => {
    expect(isValidSlug("ab")).toBe(true);
    expect(isValidSlug("a1")).toBe(true);
    expect(isValidSlug("12")).toBe(true);
    // ...but a 2-char slug still can't be a hyphen at either edge
    expect(isValidSlug("a-")).toBe(false);
    expect(isValidSlug("-a")).toBe(false);
  });
});

describe("provisioning checklist tables stay in lock-step", () => {
  it("STEP_ORDER, STEP_LABELS, STEP_DELAY_MS cover the same 5 keys", () => {
    expect(STEP_ORDER).toHaveLength(5);
    const ordered = [...STEP_ORDER].sort();
    expect(Object.keys(STEP_LABELS).sort()).toEqual(ordered);
    expect(Object.keys(STEP_DELAY_MS).sort()).toEqual(ordered);
  });
  it("every step has bilingual labels and a positive delay", () => {
    for (const k of STEP_ORDER) {
      expect(STEP_LABELS[k].en).toBeTruthy();
      expect(STEP_LABELS[k].ar).toBeTruthy();
      expect(STEP_DELAY_MS[k]).toBeGreaterThan(0);
    }
  });
});

describe("cookie readers (next/headers mocked)", () => {
  it("getViewAsTenant returns the value, or null when absent", () => {
    mockCookie({ [tenancyCookies.VIEW_AS]: "arena" });
    expect(getViewAsTenant()).toBe("arena");
    mockCookie({});
    expect(getViewAsTenant()).toBeNull();
  });
  it("getTenantThemeCookie returns the theme key, or null when absent", () => {
    mockCookie({ [tenancyCookies.THEME]: "midnight" });
    expect(getTenantThemeCookie()).toBe("midnight");
    mockCookie({});
    expect(getTenantThemeCookie()).toBeNull();
  });
});
