import { describe, it, expect } from "vitest";
import {
  startRun,
  rollupRun,
  finalRunStatus,
  canTransition,
  canDecide,
  canRecordOutcome,
  type RunStatus,
} from "./runStore";
import { GROUP_BROKER_ID } from "./roles";

const COMPANY_RUN = {
  tenantId: "hourani-dairy",
  companyId: "cmp_maha",
  roleId: "dairy-yield-controller",
  objective: "Find recoverable value in this week's batches",
  hops: 2,
};

describe("startRun", () => {
  it("builds a RUNNING row and stamps the skill version", () => {
    const res = startRun(COMPANY_RUN);
    expect(res.ok).toBe(true);
    expect(res.payload.status).toBe("RUNNING");
    expect(res.payload.skillVersion).toMatch(/^[0-9a-f]{8}$/);
  });

  it("defaults to the role's own topology", () => {
    expect(startRun(COMPANY_RUN).payload.topology).toBe("route");
  });

  it("REFUSES rather than throws — a refusal must still be a recordable row", () => {
    const res = startRun({ ...COMPANY_RUN, roleId: "no-such-role" });
    expect(res.ok).toBe(false);
    // The distinction that matters: refused-and-logged vs. never-happened.
    expect(res.payload.status).toBe("REFUSED");
    expect(res.payload.error).toBeTruthy();
  });

  it("refuses a Group Broker run that is scoped to one company", () => {
    const res = startRun({
      ...COMPANY_RUN,
      roleId: GROUP_BROKER_ID,
      companyId: "cmp_maha",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/group-scoped/i);
  });

  it("refuses a company role with no company", () => {
    const res = startRun({ ...COMPANY_RUN, companyId: null });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/needs a companyId/i);
  });

  it("accepts the Group Broker when it is properly group-scoped", () => {
    const res = startRun({
      tenantId: "hourani-group",
      companyId: null,
      roleId: GROUP_BROKER_ID,
      objective: "Find value falling between two companies",
      hops: 2,
    });
    expect(res.ok).toBe(true);
    expect(res.payload.topology).toBe("parallel");
  });

  it("refuses an unscoped run — isolation is not optional", () => {
    const res = startRun({ ...COMPANY_RUN, tenantId: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/tenantId/);
  });

  it("refuses an empty objective", () => {
    expect(startRun({ ...COMPANY_RUN, objective: "   " }).ok).toBe(false);
  });

  it("refuses autonomous without human opt-in, and allows it with", () => {
    const without = startRun({ ...COMPANY_RUN, topology: "autonomous", hops: 3 });
    expect(without.ok).toBe(false);
    const with_ = startRun({ ...COMPANY_RUN, topology: "autonomous", hops: 3, humanOptIn: true });
    expect(with_.ok).toBe(true);
  });

  it("refuses a hop count above the topology ceiling", () => {
    expect(startRun({ ...COMPANY_RUN, topology: "route", hops: 99 }).ok).toBe(false);
  });

  it("estimates cost up front so an unaffordable run can be refused before spending", () => {
    const res = startRun(COMPANY_RUN);
    if (res.ok) expect(res.estimatedLlmCalls).toBeGreaterThanOrEqual(1);
  });
});

describe("rollupRun", () => {
  it("sums tokens and latency", () => {
    const t = rollupRun([
      { tokensIn: 10, tokensOut: 5, latencyMs: 100 },
      { tokensIn: 7, tokensOut: 3, latencyMs: 50 },
    ]);
    expect(t.tokensIn).toBe(17);
    expect(t.tokensOut).toBe(8);
    expect(t.latencyMs).toBe(150);
    expect(t.steps).toBe(2);
  });

  it("EXCLUDES unscored steps from the mean instead of counting them as zero", () => {
    // "nobody graded this" must not read as "this was terrible", or the
    // training signal quietly becomes noise.
    const t = rollupRun([{ score: 0.8 }, { score: null }, {}]);
    expect(t.scoredSteps).toBe(1);
    expect(t.meanScore).toBeCloseTo(0.8);
  });

  it("returns a null mean when nothing was scored", () => {
    expect(rollupRun([{}, {}]).meanScore).toBeNull();
  });

  it("counts failed steps", () => {
    expect(rollupRun([{ error: "boom" }, {}]).failedSteps).toBe(1);
  });

  it("handles an empty run", () => {
    const t = rollupRun([]);
    expect(t.steps).toBe(0);
    expect(t.meanScore).toBeNull();
  });
});

describe("finalRunStatus", () => {
  it("a run with any failed step is FAILED, even if later steps recovered", () => {
    expect(finalRunStatus(rollupRun([{ error: "boom" }, { score: 1 }]))).toBe("FAILED");
  });

  it("a run that did nothing is FAILED, not SUCCEEDED", () => {
    expect(finalRunStatus(rollupRun([]))).toBe("FAILED");
  });

  it("budget exhaustion outranks everything", () => {
    expect(finalRunStatus(rollupRun([{ score: 1 }]), { budgetExhausted: true })).toBe(
      "BUDGET_EXHAUSTED",
    );
  });

  it("a clean run SUCCEEDS", () => {
    expect(finalRunStatus(rollupRun([{ score: 0.9 }]))).toBe("SUCCEEDED");
  });
});

describe("canTransition", () => {
  it("lets a RUNNING run reach any terminal state", () => {
    for (const to of ["SUCCEEDED", "FAILED", "BUDGET_EXHAUSTED", "REFUSED"] as RunStatus[]) {
      expect(canTransition("RUNNING", to)).toBe(true);
    }
  });

  it("never reopens a finished run — an audit trail cannot be rewritten", () => {
    for (const from of ["SUCCEEDED", "FAILED", "BUDGET_EXHAUSTED", "REFUSED"] as RunStatus[]) {
      expect(canTransition(from, "RUNNING")).toBe(false);
      expect(canTransition(from, "SUCCEEDED")).toBe(false);
    }
  });
});

describe("canDecide", () => {
  it("allows a human to decide a pending proposal", () => {
    expect(canDecide({ status: "PENDING" }, { status: "ACCEPTED", decidedById: "u1" }).ok).toBe(true);
  });

  it("refuses to decide the same proposal twice", () => {
    const res = canDecide({ status: "ACCEPTED" }, { status: "REJECTED", decidedById: "u1" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/already/i);
  });

  it("refuses an anonymous decision — liability must have a name", () => {
    const res = canDecide({ status: "PENDING" }, { status: "ACCEPTED", decidedById: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/name the human/i);
  });

  it("refuses a status that is not a human decision", () => {
    const res = canDecide(
      { status: "PENDING" },
      { status: "EXPIRED" as "ACCEPTED", decidedById: "u1" },
    );
    expect(res.ok).toBe(false);
  });
});

describe("canRecordOutcome", () => {
  it("records an outcome only for an accepted proposal", () => {
    expect(canRecordOutcome({ status: "ACCEPTED" }).ok).toBe(true);
  });

  it("refuses to fabricate an outcome for a proposal nobody acted on", () => {
    for (const status of ["PENDING", "REJECTED", "EXPIRED"] as const) {
      expect(canRecordOutcome({ status }).ok).toBe(false);
    }
  });
});
