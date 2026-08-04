// Guards the Intelligence clustering (owner-approved 2026-07-24).
//
// The clustering is presentation-only: `children` stays the flat, canonical
// list every other consumer reads. The invariant that must never break is that
// the two views describe the SAME set of sections — a section visible in the
// rail but missing from `children` would be unreachable by route detection.

import { describe, it, expect } from "vitest";
import { ORRERY_GROUPS, detectOrreryGroup, detectOrrerySubgroup } from "@/lib/orrery/groups";

const intel = ORRERY_GROUPS.find((g) => g.id === "intel")!;

describe("Intelligence clustering", () => {
  it("keeps children as the exact flattening of the clusters", () => {
    const fromClusters = intel.subgroups!.flatMap((s) => s.children);
    expect(intel.children).toEqual(fromClusters);
  });

  it("still carries every section — 15 since the VOAC queue joined 'Act'", () => {
    // Deliberately an EXACT count, not a floor. The owner's constraint was
    // "keep every section IN Intelligence, don't shrink anything", so this is
    // a tripwire: bump it only when a section is added on purpose, never to
    // make a red test go green after one silently disappeared.
    expect(intel.children).toHaveLength(15);
    expect(intel.children.map((c) => c.route)).toContain("/voac");
  });

  it("places every section in exactly one cluster", () => {
    const routes = intel.subgroups!.flatMap((s) => s.children.map((c) => c.route));
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("caps every cluster at a size the orbit ring stays legible with", () => {
    // The whole point: no ring may carry 14 nodes again.
    for (const sub of intel.subgroups!) {
      expect(sub.children.length).toBeGreaterThan(0);
      expect(sub.children.length).toBeLessThanOrEqual(7);
    }
  });

  it("leaves the other groups unclustered", () => {
    for (const group of ORRERY_GROUPS) {
      if (group.id !== "intel") expect(group.subgroups).toBeUndefined();
    }
  });
});

describe("detectOrrerySubgroup", () => {
  it("resolves a section to its cluster", () => {
    const group = detectOrreryGroup("/alerts");
    expect(detectOrrerySubgroup(group, "/alerts")?.id).toBe("act");
  });

  it("prefers the most specific route", () => {
    // "/brain" is in Insight and "/brain/council" is in Decide. A plain prefix
    // test would answer Insight while the user is on the Advisory Council.
    const group = detectOrreryGroup("/brain/council");
    expect(detectOrrerySubgroup(group, "/brain/council")?.id).toBe("decide");
    expect(detectOrrerySubgroup(group, "/brain")?.id).toBe("insight");
  });

  it("matches nested paths under a section", () => {
    const group = detectOrreryGroup("/brain/scenarios");
    expect(detectOrrerySubgroup(group, "/brain/scenarios/42")?.id).toBe("decide");
  });

  it("returns null for groups without clusters", () => {
    const group = detectOrreryGroup("/invoices");
    expect(group?.id).toBe("sales");
    expect(detectOrrerySubgroup(group, "/invoices")).toBeNull();
  });

  it("returns null for no group", () => {
    expect(detectOrrerySubgroup(null, "/anything")).toBeNull();
  });
});

describe("route detection is unaffected by clustering", () => {
  it("still resolves every Intelligence section to the intel group", () => {
    for (const child of intel.children) {
      expect(detectOrreryGroup(child.route)?.id).toBe("intel");
    }
  });
});
