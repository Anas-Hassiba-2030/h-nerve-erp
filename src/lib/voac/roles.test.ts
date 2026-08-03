import { describe, it, expect } from "vitest";
import {
  VOAC_ROLES,
  GROUP_BROKER_ID,
  getRole,
  defaultRosterFor,
  skillDocFor,
  skillVersionFor,
  serializeRoster,
  parseRoster,
} from "./roles";
import { TOPOLOGIES } from "./topology";

describe("VOAC role registry", () => {
  it("every role resolves to a real skill document — the registry can never drift from the docs", () => {
    for (const role of VOAC_ROLES) {
      const doc = skillDocFor(role.id);
      expect(doc, `role "${role.id}" has no skill document "${role.skillDocId}"`).toBeDefined();
      expect(doc!.body.length).toBeGreaterThan(200);
    }
  });

  it("every skill document keeps its SkillOpt-managed regions intact", () => {
    // SkillOpt owns these blocks; normal edit patches cannot touch them. If a
    // human strips the markers, epoch-level guidance has nowhere to land.
    for (const role of VOAC_ROLES) {
      const body = skillDocFor(role.id)!.body;
      expect(body, role.id).toContain("<!-- SLOW_UPDATE_START -->");
      expect(body, role.id).toContain("<!-- SLOW_UPDATE_END -->");
      expect(body, role.id).toContain("<!-- APPENDIX_START -->");
      expect(body, role.id).toContain("<!-- APPENDIX_END -->");
    }
  });

  it("role ids are unique", () => {
    const ids = VOAC_ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every role names a real topology", () => {
    for (const role of VOAC_ROLES) {
      expect(TOPOLOGIES[role.defaultTopology], role.id).toBeDefined();
    }
  });

  it("there is EXACTLY ONE supervisor and it is the Group Broker", () => {
    // The load-bearing structural claim of the whole design: no per-company
    // supervisor exists, because it would hold no information and no authority
    // its subordinates lack. If someone adds one, this test fails loudly.
    const groupRoles = VOAC_ROLES.filter((r) => r.sector === "GROUP");
    expect(groupRoles.map((r) => r.id)).toEqual([GROUP_BROKER_ID]);
  });

  it("the Group Broker argues in parallel — two P&Ls means competing objectives", () => {
    expect(getRole(GROUP_BROKER_ID)?.defaultTopology).toBe("parallel");
  });
});

describe("defaultRosterFor", () => {
  it("gives each operating sector a roster", () => {
    for (const sector of ["HOSPITALITY", "DAIRY", "AGRICULTURE", "EDUCATION", "INVESTMENT"]) {
      expect(defaultRosterFor(sector).length, sector).toBeGreaterThan(0);
    }
  });

  it("never puts the Group Broker in a company roster", () => {
    for (const sector of ["HOSPITALITY", "DAIRY", "AGRICULTURE", "EDUCATION", "INVESTMENT", "GROUP"]) {
      expect(defaultRosterFor(sector)).not.toContain(GROUP_BROKER_ID);
    }
  });

  it("returns an empty roster for an unknown sector rather than guessing", () => {
    expect(defaultRosterFor("SPACE_TOURISM")).toEqual([]);
  });
});

describe("roster serialization", () => {
  it("round-trips through the comma-joined column", () => {
    const ids = defaultRosterFor("DAIRY");
    const parsed = parseRoster(serializeRoster(ids));
    expect(parsed.map((r) => r.id).sort()).toEqual([...ids].sort());
  });

  it("is order-stable and de-duplicated", () => {
    expect(serializeRoster(["finance-controller", "dairy-yield-controller", "finance-controller"])).toBe(
      "dairy-yield-controller,finance-controller",
    );
  });

  it("drops unknown ids instead of producing a broken role", () => {
    expect(parseRoster("dairy-yield-controller,ghost-role")).toHaveLength(1);
  });

  it("treats null/empty as an empty roster", () => {
    expect(parseRoster(null)).toEqual([]);
    expect(parseRoster("")).toEqual([]);
  });
});

describe("skillVersionFor", () => {
  it("returns the document hash so a score is attributable to a revision", () => {
    expect(skillVersionFor(GROUP_BROKER_ID)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('records "unknown" rather than throwing for a stale role id', () => {
    // An unattributable run is bad; an unrecorded one is worse.
    expect(skillVersionFor("deleted-role")).toBe("unknown");
  });
});
