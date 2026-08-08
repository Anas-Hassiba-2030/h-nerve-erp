import { describe, it, expect } from "vitest";
import {
  buildOrgMap, agentState, statKey, stateMeta, runtimeChildren, COUNCIL_VOICES,
  type AgentStats, type CompanyInput,
} from "./orgMap";
import { GROUP_BROKER_ID } from "./roles";
import { SPECIALIST_AGENTS } from "@/lib/brain/agents";

const NOW = new Date("2026-08-06T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

const stats = (over: Partial<AgentStats> = {}): AgentStats => ({
  runs: 0, lastRunAt: null, lastStatus: null, pendingProposals: 0, ...over,
});

const COMPANIES: CompanyInput[] = [
  { id: "c-maha", code: "MAHA", name: "المها", sector: "DAIRY" },
  { id: "c-arena", code: "ARENA", name: "أرينا", sector: "HOSPITALITY" },
  { id: "c-loran", code: "LORAN", name: "لوران", sector: "AGRICULTURE" },
];

const build = (s: Record<string, AgentStats> = {}, companies = COMPANIES) =>
  buildOrgMap({ companies, stats: new Map(Object.entries(s)), now: NOW });

describe("agentState", () => {
  it("puts waiting-on-a-human above everything else", () => {
    // An agent holding an unanswered proposal is the most important thing on
    // the map — it is the one asking something of a person.
    const s = stats({ runs: 9, lastRunAt: hoursAgo(1), lastStatus: "FAILED", pendingProposals: 2 });
    expect(agentState(s, NOW)).toBe("waiting");
  });

  it("flags a genuinely failed run as needing attention", () => {
    expect(agentState(stats({ runs: 1, lastStatus: "FAILED", lastRunAt: hoursAgo(1) }), NOW)).toBe("attention");
    expect(agentState(stats({ runs: 1, lastStatus: "BUDGET_EXHAUSTED", lastRunAt: hoursAgo(1) }), NOW)).toBe("attention");
  });

  it("does NOT treat a refusal or stub as a fault", () => {
    // A refusal is the system working; STUB means no model was configured.
    // Painting either as trouble teaches operators the safety boundary is a bug.
    for (const st of ["REFUSED", "STUB", "SUCCEEDED"]) {
      expect(agentState(stats({ runs: 1, lastStatus: st, lastRunAt: hoursAgo(1) }), NOW), st).toBe("active");
    }
  });

  it("distinguishes never-run from merely quiet", () => {
    expect(agentState(stats({ runs: 0 }), NOW)).toBe("dormant");
    expect(agentState(stats({ runs: 5, lastStatus: "SUCCEEDED", lastRunAt: hoursAgo(200) }), NOW)).toBe("idle");
  });

  it("keeps an agent active for 48h after its last run, then lets it go idle", () => {
    expect(agentState(stats({ runs: 1, lastStatus: "SUCCEEDED", lastRunAt: hoursAgo(47) }), NOW)).toBe("active");
    expect(agentState(stats({ runs: 1, lastStatus: "SUCCEEDED", lastRunAt: hoursAgo(49) }), NOW)).toBe("idle");
  });
});

describe("buildOrgMap", () => {
  it("puts exactly one supervisor at the top and never inside a company", () => {
    const map = build();
    expect(map.broker.roleId).toBe(GROUP_BROKER_ID);
    expect(map.broker.companyId).toBeNull();
    for (const b of map.branches) {
      expect(b.agents.some((a) => a.roleId === GROUP_BROKER_ID)).toBe(false);
    }
  });

  it("gives every covered company a branch with at least one agent", () => {
    const map = build();
    expect(map.branches.length).toBeGreaterThan(0);
    for (const b of map.branches) expect(b.agents.length).toBeGreaterThan(0);
  });

  it("reports uncovered companies instead of silently dropping them", () => {
    // A company the agent company cannot serve is a real gap. Omitting it from
    // both the map and the count is how you believe coverage is complete.
    const map = build({}, [...COMPANIES, { id: "c-x", code: "TABAQAT", name: "طبقات", sector: "TRADE" }]);
    expect(map.totals.uncovered).toContain("TABAQAT");
    expect(map.branches.some((b) => b.code === "TABAQAT")).toBe(false);
  });

  it("floats branches with pending proposals to the top", () => {
    const map = build({
      [statKey("c-loran", "feed-supply-planner")]: stats({ runs: 1, pendingProposals: 3 }),
    });
    expect(map.branches[0].code).toBe("LORAN");
  });

  it("rolls pending and runs up per branch and across the whole map", () => {
    const map = build({
      [statKey("c-maha", "dairy-yield-controller")]: stats({ runs: 4, pendingProposals: 2 }),
      [statKey(null, GROUP_BROKER_ID)]: stats({ runs: 3, pendingProposals: 1 }),
    });
    const maha = map.branches.find((b) => b.code === "MAHA")!;
    expect(maha.runs).toBe(4);
    expect(maha.pendingProposals).toBe(2);
    expect(map.totals.runs).toBe(7);   // 4 company + 3 broker
    expect(map.totals.pending).toBe(3); // 2 company + 1 broker
  });

  it("counts the broker in the agent total", () => {
    const map = build();
    const inBranches = map.branches.reduce((s, b) => s + b.agents.length, 0);
    expect(map.totals.agents).toBe(inBranches + 1);
  });

  it("defaults an agent with no recorded stats to dormant rather than throwing", () => {
    const map = build();
    for (const b of map.branches) {
      for (const a of b.agents) expect(a.state).toBe("dormant");
    }
  });

  it("handles zero companies without breaking the broker", () => {
    const map = build({}, []);
    expect(map.broker.roleId).toBe(GROUP_BROKER_ID);
    expect(map.branches).toEqual([]);
    expect(map.totals.companies).toBe(0);
  });

  it("keeps two companies in the same sector separate — a roster is data, not an org layer", () => {
    const map = build({}, [
      { id: "c-a", code: "ARENA", name: "أرينا", sector: "HOSPITALITY" },
      { id: "c-b", code: "SHARQ", name: "الشرق", sector: "HOSPITALITY" },
    ]);
    expect(map.branches).toHaveLength(2);
    const roleIds = map.branches.map((b) => b.agents.map((a) => a.roleId).join());
    expect(roleIds[0]).toBe(roleIds[1]); // same role...
    expect(map.branches[0].companyId).not.toBe(map.branches[1].companyId); // ...different company
  });
});

describe("runtimeChildren", () => {
  // The map claims the broker convenes THESE named voices. If the council
  // roster changes and this mirror does not, the chart lies about who ran.
  it("mirrors the real council roster exactly", () => {
    const mirrored = COUNCIL_VOICES.filter((v) => !v.moderator).map((v) => v.id).sort();
    const real = SPECIALIST_AGENTS.map((a) => a.id).sort();
    expect(mirrored).toEqual(real);
  });

  it("expands a parallel node into the council plus its moderator", () => {
    const kids = runtimeChildren({ topology: "parallel", tools: ["pullFacts"] });
    expect(kids).toHaveLength(SPECIALIST_AGENTS.length + 1);
    expect(kids.filter((k) => k.kind === "moderator")).toHaveLength(1);
    // The tools list is NOT what a parallel node runs — the council is.
    expect(kids.some((k) => k.id === "pullFacts")).toBe(false);
  });

  it("expands every other topology into the tools it may call", () => {
    for (const topology of ["route", "chain", "single"]) {
      const kids = runtimeChildren({ topology, tools: ["pullFacts", "narrate"] });
      expect(kids.map((k) => k.id)).toEqual(["pullFacts", "narrate"]);
      expect(kids.every((k) => k.kind === "tool")).toBe(true);
    }
  });
});

describe("stateMeta", () => {
  it("labels every state in both languages", () => {
    for (const s of ["waiting", "attention", "active", "idle", "dormant"] as const) {
      const m = stateMeta(s);
      expect(m.ar.length).toBeGreaterThan(0);
      expect(m.en.length).toBeGreaterThan(0);
      expect(m.tone).toBe(s);
    }
  });
});
