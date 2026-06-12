// lib/workflows/runtime.test.ts — Phase 12 workflow executor.
//
// The runtime walks a user-drawn graph, so it MUST survive shapes the
// studio can produce: re-converging diamonds (don't double-fire an action)
// and cycles (don't recurse forever). evaluationWalk owns that guarantee;
// these tests pin it with an injected evaluator — no DB. Plus the pure
// condition evaluator + the config-JSON guard.

import { describe, it, expect } from "vitest";
import { buildAdjacency, evaluationWalk, evalCondition, safeJson } from "./runtime";
import { TEMPLATES, type Template } from "./templates";

const tpl = (key: string): Template =>
  (TEMPLATES[key] ?? ({ key } as unknown as Template));

describe("buildAdjacency", () => {
  it("groups multiple edges from the same source, in order", () => {
    const adj = buildAdjacency([
      { fromNodeId: "a", toNodeId: "b" },
      { fromNodeId: "a", toNodeId: "c" },
      { fromNodeId: "b", toNodeId: "d" },
    ]);
    expect(adj.get("a")).toEqual(["b", "c"]);
    expect(adj.get("b")).toEqual(["d"]);
    expect(adj.get("missing")).toBeUndefined();
  });
  it("returns an empty map for no edges", () => {
    expect(buildAdjacency([]).size).toBe(0);
  });
});

describe("evaluationWalk — traversal + visited guard", () => {
  // Walk over [from,to] edges; `prune` ids return descend:false. Returns
  // the order ids were evaluated.
  async function run(
    triggerIds: string[],
    edges: Array<[string, string]>,
    prune: Set<string> = new Set(),
  ): Promise<string[]> {
    const adjacency = buildAdjacency(
      edges.map(([fromNodeId, toNodeId]) => ({ fromNodeId, toNodeId })),
    );
    const order: string[] = [];
    await evaluationWalk({
      triggerIds,
      adjacency,
      evaluate: async (id) => {
        order.push(id);
        return { descend: !prune.has(id) };
      },
    });
    return order;
  }

  it("walks a linear trigger→condition→action chain once each", async () => {
    expect(await run(["t"], [["t", "c"], ["c", "a"]])).toEqual(["t", "c", "a"]);
  });

  it("evaluates a re-converging diamond node only ONCE", async () => {
    // t→b, t→c, b→d, c→d  — d must not double-fire
    const order = await run(["t"], [["t", "b"], ["t", "c"], ["b", "d"], ["c", "d"]]);
    expect(order.filter((x) => x === "d")).toHaveLength(1);
    expect(new Set(order)).toEqual(new Set(["t", "b", "c", "d"]));
  });

  it("TERMINATES on a cycle instead of overflowing the stack", async () => {
    // t→a→b→a — the visited guard breaks the loop
    const order = await run(["t"], [["t", "a"], ["a", "b"], ["b", "a"]]);
    expect(order).toEqual(["t", "a", "b"]);
  });

  it("prunes a branch when a node returns descend:false (condition short-circuit)", async () => {
    const order = await run(["t"], [["t", "c"], ["c", "a"]], new Set(["c"]));
    expect(order).toEqual(["t", "c"]);
    expect(order).not.toContain("a");
  });

  it("does not descend from a trigger that did not fire", async () => {
    expect(await run(["t"], [["t", "a"]], new Set(["t"]))).toEqual(["t"]);
  });

  it("two triggers sharing a downstream node evaluate it once", async () => {
    const order = await run(["t1", "t2"], [["t1", "x"], ["t2", "x"]]);
    expect(order.filter((i) => i === "x")).toHaveLength(1);
  });
});

describe("evalCondition", () => {
  it("severity_at_least gates the WARN payload against the required level", () => {
    expect(evalCondition(tpl("filter.severity_at_least"), { level: "WARN" }).passed).toBe(true);
    expect(evalCondition(tpl("filter.severity_at_least"), { level: "CRITICAL" }).passed).toBe(false);
    expect(evalCondition(tpl("filter.severity_at_least"), { level: "INFO" }).passed).toBe(true);
  });
  it("tenant_pack passes in the demo (every pack enabled)", () => {
    expect(evalCondition(tpl("filter.tenant_pack"), { pack: "dairy" }).passed).toBe(true);
  });
  it("business_hours / weekday return a boolean + a message (time-dependent)", () => {
    const bh = evalCondition(tpl("filter.business_hours"), {});
    expect(typeof bh.passed).toBe("boolean");
    expect(bh.message).toBeTruthy();
    expect(typeof evalCondition(tpl("filter.weekday"), {}).passed).toBe("boolean");
  });
  it("an unknown condition fails closed", () => {
    expect(evalCondition(tpl("filter.__nope__"), {}).passed).toBe(false);
  });
});

describe("safeJson", () => {
  it("parses a JSON object", () => {
    expect(safeJson('{"a":1,"b":{"c":2}}')).toEqual({ a: 1, b: { c: 2 } });
  });
  it("returns {} for null / empty / garbage / non-object JSON", () => {
    expect(safeJson(null)).toEqual({});
    expect(safeJson(undefined)).toEqual({});
    expect(safeJson("")).toEqual({});
    expect(safeJson("not json")).toEqual({});
    expect(safeJson("[1,2]")).toEqual({});
    expect(safeJson('"str"')).toEqual({});
  });
});
