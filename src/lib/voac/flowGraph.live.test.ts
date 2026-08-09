import { describe, it, expect, vi, beforeEach } from "vitest";

// The executor's dependencies are the two things a unit test must not do:
// touch the DB (runTool) and call a model (callLlm). Mocked at the seam so the
// SEQUENCING — which is the actual logic here — can be asserted exactly.
const runTool = vi.fn();
const callLlm = vi.fn();

vi.mock("@/lib/brain/tools", () => ({ runTool: (...a: unknown[]) => runTool(...a) }));
vi.mock("@/lib/brain/llm", () => ({ callLlm: (...a: unknown[]) => callLlm(...a) }));

const { runFlow, plannedLlmCalls } = await import("./flowGraph.live");
const { flowSpecFor } = await import("./flowGraph");

const TOOLS = ["pullFacts", "causalSubgraph", "recallMemory", "retrieveDocuments", "simulate"];

const spec = (t: string, tools = TOOLS) => flowSpecFor(t, tools)!;

const base = (t = "chain", tools = TOOLS) => ({
  spec: spec(t, tools),
  objective: "Four dairy batches expire in three days. Divert or write off?",
  system: "you are a test",
  locale: "en" as const,
});

beforeEach(() => {
  runTool.mockReset();
  callLlm.mockReset();
  runTool.mockImplementation(async (name: string) => ({ tool: name, rooms: 120 }));
  callLlm.mockImplementation(async () => ({ text: "answer 120 rooms", isStub: false, ms: 5 }));
});

describe("runFlow", () => {
  it("runs a gather stage's tools concurrently, not one after another", () => {
    // The parallel stage is the entire reason a graph beats a loop here. If it
    // silently serialised, every assertion below would still pass.
    let live = 0;
    let peak = 0;
    runTool.mockImplementation(async () => {
      live += 1;
      peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 5));
      live -= 1;
      return {};
    });
    return runFlow(base()).then(() => expect(peak).toBe(4));
  });

  it("binds every gather tool's input from the objective — the model never picks", async () => {
    await runFlow(base());
    const byName = Object.fromEntries(runTool.mock.calls.map((c) => [c[0], c[1]]));
    expect(byName.pullFacts).toEqual({});
    expect(byName.causalSubgraph).toEqual({ question: base().objective });
    expect(byName.recallMemory).toEqual({ situation: base().objective });
    expect(byName.retrieveDocuments).toEqual({ query: base().objective, locale: "en" });
    expect(byName.simulate).toBeUndefined();
  });

  it("hands the reasoning node facts the tools actually returned", async () => {
    runTool.mockImplementation(async (n: string) => ({ marker: `FROM_${n}` }));
    await runFlow(base());
    const reasonCall = callLlm.mock.calls.find((c) => /work out the answer/i.test(c[0].user));
    expect(reasonCall?.[0].user).toContain("FROM_pullFacts");
  });

  it("keeps going when a gather tool fails, and records the failure", async () => {
    // A tool erroring is a thinner answer, not a dead run. Aborting here would
    // lose an answer the other three tools could still support.
    runTool.mockImplementation(async (n: string) => {
      if (n === "causalSubgraph") throw new Error("graph is empty");
      return { ok: n };
    });
    const res = await runFlow(base());
    const failed = res.nodes.filter((n) => !n.ok);
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toContain("graph is empty");
    expect(res.text).toBe("answer 120 rooms");
  });

  it("spends a call only on reason and narrate nodes", async () => {
    const res = await runFlow(base());
    expect(res.llmCalls).toBe(3); // plan + reason + narrate
    expect(res.llmCalls).toBe(plannedLlmCalls(spec("chain")));
    expect(callLlm).toHaveBeenCalledTimes(3);
  });

  it("grades with no model at all", async () => {
    callLlm.mockClear();
    const res = await runFlow(base("evaluate"));
    // plan + draft + narrate — the grade node is free.
    expect(callLlm).toHaveBeenCalledTimes(3);
    expect(res.grade).not.toBeNull();
    expect(res.nodes.find((n) => n.node.kind === "grade")?.ok).toBe(true);
  });

  it("warns the narrator when the draft's figures did not ground", async () => {
    // A draft full of numbers no fact supports is exactly the failure the
    // grade node exists to catch — and catching it silently is no better than
    // not catching it.
    runTool.mockImplementation(async () => ({ nothing: "here" }));
    callLlm.mockImplementation(async () => ({ text: "we will save 48,300 JOD", isStub: false, ms: 1 }));
    const res = await runFlow(base("evaluate"));
    expect(res.grade!.verified).toBe(0);
    const narrateCall = callLlm.mock.calls.at(-1)!;
    expect(narrateCall[0].user).toMatch(/matched the gathered facts/i);
  });

  it("does not warn the narrator when the figures did ground", async () => {
    runTool.mockImplementation(async () => ({ rooms: 120 }));
    callLlm.mockImplementation(async () => ({ text: "120 rooms are open", isStub: false, ms: 1 }));
    const res = await runFlow(base("evaluate"));
    expect(res.grade!.coverage).toBe(1);
    expect(callLlm.mock.calls.at(-1)![0].user).not.toMatch(/matched the gathered facts/i);
  });

  it("flags an empty final answer, but never calls stub mode empty", async () => {
    callLlm.mockImplementation(async () => ({ text: "", isStub: false, ms: 1 }));
    expect((await runFlow(base())).emptyAnswer).toBe(true);

    callLlm.mockImplementation(async () => ({ text: "", isStub: true, ms: 1 }));
    const stubbed = await runFlow(base());
    expect(stubbed.stub).toBe(true);
    // Stub mode is the absence of a model, not a defect in the run.
    expect(stubbed.emptyAnswer).toBe(false);
  });

  it("persists each node as it lands, in stage order", async () => {
    const seen: string[] = [];
    await runFlow({ ...base(), onNode: async (n) => { seen.push(`${n.stageIndex}:${n.node.id}`); } });
    expect(seen[0]).toBe("0:plan");
    expect(seen.slice(1, 5).every((s) => s.startsWith("1:"))).toBe(true);
    expect(seen.at(-2)).toBe("2:reason");
    expect(seen.at(-1)).toBe("3:narrate");
  });

  it("never has two persistence writes in flight at once", async () => {
    // runStore.appendStep derives `seq` from a live count(), so two concurrent
    // writes both read the same count and collide (seen in the smoke test as
    // 0,1,2,2,4). The tool calls are parallel; the ledger writes must not be.
    let live = 0;
    let peak = 0;
    await runFlow({
      ...base(),
      onNode: async () => {
        live += 1;
        peak = Math.max(peak, live);
        await new Promise((r) => setTimeout(r, 2));
        live -= 1;
      },
    });
    expect(peak).toBe(1);
  });

  it("does not lose the answer when persistence throws", async () => {
    // Losing one ledger row is bad; losing the answer a human waited for is
    // worse. The graph must survive its own bookkeeping failing.
    const res = await runFlow({ ...base(), onNode: async () => { throw new Error("D1 down"); } });
    expect(res.text).toBe("answer 120 rooms");
  });

  it("never throws, whatever the model does", async () => {
    callLlm.mockImplementation(async () => { throw new Error("model exploded"); });
    const res = await runFlow(base());
    expect(res.text).toBe("");
    expect(res.nodes.filter((n) => !n.ok).length).toBe(3);
  });
});
