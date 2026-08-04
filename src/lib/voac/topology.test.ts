import { describe, it, expect } from "vitest";
import {
  chooseTopology,
  assertTopologyAllowed,
  estimateLlmCalls,
  TOPOLOGIES,
  type TaskShape,
  type Topology,
} from "./topology";

const BASE: TaskShape = {
  dependentSteps: false,
  independentSubtasks: false,
  subtasksKnownUpFront: false,
  competingObjectives: false,
  revisableOutput: false,
  openEnded: false,
};

const shape = (over: Partial<TaskShape>): TaskShape => ({ ...BASE, ...over });

describe("chooseTopology", () => {
  it("falls back to the CHEAPEST pattern, not the most powerful one", () => {
    // The whole point of the cascade: an unremarkable task must not summon an
    // eight-call orchestrator.
    const choice = chooseTopology(BASE);
    expect(choice.topology).toBe("route");
    expect(TOPOLOGIES.route.costMultiplier).toBeLessThan(TOPOLOGIES.orchestrate.costMultiplier);
  });

  it("a real data dependency forces a chain and outranks everything else", () => {
    const choice = chooseTopology(
      shape({
        dependentSteps: true,
        independentSubtasks: true,
        subtasksKnownUpFront: true,
        competingObjectives: true,
        revisableOutput: true,
        openEnded: true,
      }),
    );
    expect(choice.topology).toBe("chain");
  });

  it("competing objectives argue in parallel — the cross-company case", () => {
    const choice = chooseTopology(shape({ competingObjectives: true }));
    expect(choice.topology).toBe("parallel");
    expect(choice.reason).toMatch(/conflict/i);
  });

  it("independent + known up front runs in parallel", () => {
    expect(
      chooseTopology(shape({ independentSubtasks: true, subtasksKnownUpFront: true })).topology,
    ).toBe("parallel");
  });

  it("independent but discovered at runtime needs an orchestrator", () => {
    expect(
      chooseTopology(shape({ independentSubtasks: true, subtasksKnownUpFront: false })).topology,
    ).toBe("orchestrate");
  });

  it("revisable output earns a critic loop", () => {
    expect(chooseTopology(shape({ revisableOutput: true })).topology).toBe("evaluate");
  });

  it("open-ended work resolves to autonomous", () => {
    expect(chooseTopology(shape({ openEnded: true })).topology).toBe("autonomous");
  });

  it("is total — every combination of flags resolves to a known topology", () => {
    const keys = Object.keys(BASE) as (keyof TaskShape)[];
    for (let mask = 0; mask < 1 << keys.length; mask++) {
      const s = { ...BASE };
      keys.forEach((k, i) => {
        s[k] = Boolean(mask & (1 << i));
      });
      const choice = chooseTopology(s);
      expect(TOPOLOGIES[choice.topology]).toBeDefined();
      expect(choice.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("assertTopologyAllowed", () => {
  it("refuses autonomous without explicit human opt-in", () => {
    const res = assertTopologyAllowed("autonomous", { hops: 3 });
    expect(res.allowed).toBe(false);
    if (!res.allowed) expect(res.reason).toMatch(/opt-in/i);
  });

  it("permits autonomous once a human has opted in", () => {
    expect(assertTopologyAllowed("autonomous", { hops: 3, humanOptIn: true }).allowed).toBe(true);
  });

  it("autonomous is the ONLY pattern gated on human opt-in", () => {
    const gated = Object.values(TOPOLOGIES).filter((t) => t.requiresHumanOptIn);
    expect(gated.map((t) => t.id)).toEqual(["autonomous"]);
  });

  it("caps hops so no chain grows unbounded (compound-error discipline)", () => {
    const res = assertTopologyAllowed("chain", { hops: TOPOLOGIES.chain.maxHops + 1 });
    expect(res.allowed).toBe(false);
    if (!res.allowed) expect(res.reason).toMatch(/at most/i);
  });

  it("rejects a run with no hops", () => {
    expect(assertTopologyAllowed("route", { hops: 0 }).allowed).toBe(false);
  });

  it("rejects an unknown topology instead of trusting it", () => {
    const res = assertTopologyAllowed("supervisor" as Topology, { hops: 1 });
    expect(res.allowed).toBe(false);
  });
});

describe("estimateLlmCalls", () => {
  it("always predicts at least one call", () => {
    expect(estimateLlmCalls("route", 1)).toBeGreaterThanOrEqual(1);
  });

  it("never predicts beyond the topology's own hop ceiling", () => {
    const atCeiling = estimateLlmCalls("chain", TOPOLOGIES.chain.maxHops);
    const wayOver = estimateLlmCalls("chain", 999);
    expect(wayOver).toBe(atCeiling);
  });

  it("prices the expensive shapes above the cheap ones", () => {
    expect(estimateLlmCalls("orchestrate", 3)).toBeGreaterThan(estimateLlmCalls("route", 2));
  });
});
