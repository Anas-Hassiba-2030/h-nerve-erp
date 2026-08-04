import { describe, it, expect } from "vitest";
import { planScheduledRuns, runKey, type RosterSchedule } from "./schedule";

const NOW = new Date("2026-08-04T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

const roster = (over: Partial<RosterSchedule> = {}): RosterSchedule => ({
  tenantId: "t1",
  companyId: "c1",
  sector: "DAIRY",
  roleIds: ["dairy-yield-controller"],
  cadenceHours: 24,
  enabled: true,
  ...over,
});

const plan = (rosters: RosterSchedule[], last: Record<string, Date> = {}, maxRuns = 50) =>
  planScheduledRuns({ rosters, lastRunByKey: new Map(Object.entries(last)), now: NOW, maxRuns });

describe("planScheduledRuns", () => {
  it("runs a role that has never run", () => {
    const p = plan([roster()]);
    expect(p.due).toHaveLength(1);
    expect(p.due[0].staleHours).toBeNull();
  });

  it("skips a role that ran inside its cadence, and says how long ago", () => {
    const p = plan([roster()], { [runKey("t1", "c1", "dairy-yield-controller")]: hoursAgo(3) });
    expect(p.due).toHaveLength(0);
    expect(p.skipped[0].reason).toMatch(/3\.0h ago; cadence is 24h/);
  });

  it("runs a role once its cadence has elapsed", () => {
    const p = plan([roster()], { [runKey("t1", "c1", "dairy-yield-controller")]: hoursAgo(25) });
    expect(p.due).toHaveLength(1);
  });

  it("skips a disabled roster", () => {
    const p = plan([roster({ enabled: false })]);
    expect(p.due).toHaveLength(0);
    expect(p.skipped[0].reason).toMatch(/disabled/i);
  });

  it("skips an empty roster rather than fanning out over nothing", () => {
    const p = plan([roster({ roleIds: [] })]);
    expect(p.due).toHaveLength(0);
    expect(p.skipped[0].reason).toMatch(/no roles/i);
  });

  it("refuses a non-positive cadence instead of running on every fire", () => {
    // A cadence of 0 would make every role due forever — that is a
    // misconfiguration, and spending real money on it is the wrong response.
    for (const bad of [0, -5, NaN]) {
      const p = plan([roster({ cadenceHours: bad })], {
        [runKey("t1", "c1", "dairy-yield-controller")]: hoursAgo(100),
      });
      expect(p.due, String(bad)).toHaveLength(0);
      expect(p.skipped[0].reason).toMatch(/Invalid cadence/i);
    }
  });

  it("treats a never-run role as infinitely stale so it sorts first", () => {
    const p = plan(
      [roster({ roleIds: ["never-run", "ran-long-ago"] })],
      { [runKey("t1", "c1", "ran-long-ago")]: hoursAgo(500) },
    );
    expect(p.due.map((d) => d.roleId)).toEqual(["never-run", "ran-long-ago"]);
  });

  it("orders by staleness so a cap truncates the FRESHEST work, never starves a tenant", () => {
    const rosters = [
      roster({ tenantId: "aaa", roleIds: ["r"] }),
      roster({ tenantId: "zzz", roleIds: ["r"] }),
    ];
    const p = plan(
      rosters,
      {
        [runKey("aaa", "c1", "r")]: hoursAgo(30), // less stale
        [runKey("zzz", "c1", "r")]: hoursAgo(300), // more stale
      },
      1,
    );
    // Alphabetically "aaa" would win; staleness must beat that, or the last
    // tenant alphabetically never runs.
    expect(p.due.map((d) => d.tenantId)).toEqual(["zzz"]);
  });

  it("enforces the per-fire cap — one fire cannot fan out over everything", () => {
    const rosters = Array.from({ length: 40 }, (_, i) =>
      roster({ tenantId: `t${i}`, roleIds: ["a", "b", "c"] }),
    );
    const p = plan(rosters, {}, 10);
    expect(p.due).toHaveLength(10);
    expect(p.considered).toBe(120);
  });

  it("NEVER truncates silently — every considered role is due or explained", () => {
    const rosters = Array.from({ length: 5 }, (_, i) => roster({ tenantId: `t${i}` }));
    const p = plan(rosters, {}, 2);
    expect(p.due.length + p.skipped.length).toBe(p.considered);
    expect(p.skipped.every((s) => s.reason.length > 0)).toBe(true);
  });

  it("explains a cap skip as deferred, not dropped", () => {
    const p = plan([roster({ roleIds: ["a", "b"] })], {}, 1);
    expect(p.skipped[0].reason).toMatch(/next fire/i);
  });

  it("handles a cap of zero without throwing", () => {
    const p = plan([roster()], {}, 0);
    expect(p.due).toHaveLength(0);
    expect(p.skipped).toHaveLength(1);
  });

  it("counts every role considered across rosters", () => {
    const p = plan([roster({ roleIds: ["a", "b"] }), roster({ tenantId: "t2", roleIds: ["c"] })]);
    expect(p.considered).toBe(3);
  });

  it("keys runs per (tenant, company, role) so two companies do not share a cadence", () => {
    const p = plan(
      [roster({ companyId: "c1" }), roster({ companyId: "c2" })],
      { [runKey("t1", "c1", "dairy-yield-controller")]: hoursAgo(1) },
    );
    expect(p.due.map((d) => d.companyId)).toEqual(["c2"]);
  });
});
