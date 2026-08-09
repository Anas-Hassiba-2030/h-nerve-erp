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

  it("does not let ONE degraded call mark a live run stubbed", async () => {
    // callLlm never throws — a 429, a timeout, or the global call cap all come
    // back as {isStub:true}. ORing that across nodes made a three-call graph
    // where one call was throttled report as "no model configured", which
    // skipped billing for the two calls that were really paid for.
    let n = 0;
    callLlm.mockImplementation(async () => {
      n += 1;
      return n === 1
        ? { text: "(stub)", isStub: true, ms: 1 }
        : { text: "real answer", isStub: false, ms: 1 };
    });
    const res = await runFlow(base());
    expect(res.llmCalls).toBe(3);
    expect(res.realCalls).toBe(2); // only the paid ones
    expect(res.stub).toBe(false);
    expect(res.answerStubbed).toBe(false);
  });

  it("flags a placeholder answer shipped from an otherwise live run", async () => {
    // The worst version: the narrate call is the one that degrades, so the text
    // handed to the user literally says "no model configured" — false, and it
    // reads like a considered reply.
    let n = 0;
    callLlm.mockImplementation(async () => {
      n += 1;
      return n === 3
        ? { text: "(stub — no model configured; …)", isStub: true, ms: 1 }
        : { text: "real", isStub: false, ms: 1 };
    });
    const res = await runFlow(base());
    expect(res.stub).toBe(false);
    expect(res.answerStubbed).toBe(true);
    expect(res.realCalls).toBe(2);
  });

  it("reports a wholly stubbed run as stubbed, and bills nothing", async () => {
    callLlm.mockImplementation(async () => ({ text: "(stub)", isStub: true, ms: 1 }));
    const res = await runFlow(base());
    expect(res.stub).toBe(true);
    expect(res.realCalls).toBe(0);
    // answerStubbed is noise when every node is a placeholder.
    expect(res.answerStubbed).toBe(false);
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

  it("revises when the draft's figures did not ground, and re-grades", async () => {
    runTool.mockImplementation(async () => ({ rooms: 120 }));
    const seen: string[] = [];
    callLlm.mockImplementation(async (req: { user: string }) => {
      seen.push(req.user);
      // Every draft cites a figure no fact supports.
      return { text: "we will save 48,300 JOD", isStub: false, ms: 1 };
    });
    const res = await runFlow({ ...base("evaluate"), onNode: undefined });
    const ids = res.nodes.map((n) => n.node.id);
    expect(ids).toContain("revise");
    expect(ids).toContain("regrade");
    expect(res.skipped).toEqual([]);
    // The revise prompt must NAME the failing figure — "try again" makes a
    // model rewrite blind and reproduce the same number.
    expect(seen.find((u) => /Rewrite it/.test(u))).toMatch(/48,300|48300/);
  });

  it("skips the revise cycle when the draft grounded fine", async () => {
    runTool.mockImplementation(async () => ({ rooms: 120 }));
    callLlm.mockImplementation(async () => ({ text: "120 rooms are open", isStub: false, ms: 1 }));
    const res = await runFlow(base("evaluate"));
    expect(res.skipped).toEqual(["revise", "regrade"]);
    expect(res.nodes.map((n) => n.node.id)).not.toContain("revise");
    expect(res.llmCalls).toBe(3); // plan, draft, narrate — the ceiling is 4
  });

  it("does not revise a draft that made no numeric claim at all", async () => {
    // Unquantified is not ungrounded. A revise pass would burn a call chasing
    // claims that do not exist.
    runTool.mockImplementation(async () => ({ rooms: 120 }));
    callLlm.mockImplementation(async () => ({ text: "no figures here at all", isStub: false, ms: 1 }));
    const res = await runFlow(base("evaluate"));
    expect(res.grade!.total).toBe(0);
    expect(res.skipped).toContain("revise");
  });

  it("runs the critic cycle at most once, however bad the revision is", async () => {
    runTool.mockImplementation(async () => ({}));
    callLlm.mockImplementation(async () => ({ text: "still 99,999 JOD", isStub: false, ms: 1 }));
    const res = await runFlow(base("evaluate"));
    expect(res.nodes.filter((n) => n.node.id === "revise")).toHaveLength(1);
    expect(res.llmCalls).toBeLessThanOrEqual(plannedLlmCalls(spec("evaluate")));
  });

  // The fact pack pullFacts returns when there is genuinely nothing to report.
  const QUIET_FACTS = {
    insights: [], plans: [], integrations: [],
    hotels: { totalRooms: 700, occupiedNow: 39, activeBookings: 39 },
    dairy: { batchesThisWeek: 0, nearExpiry: 0 },
    farms: { activeCrops: 0, totalFarms: 2 },
  };

  const onlyPullFacts = (payload: unknown) =>
    runTool.mockImplementation(async (name: string) => {
      if (name === "pullFacts") return payload;
      // Retrieval that found nothing is a genuine "no evidence".
      return { nodes: [], memories: [], documents: [] };
    });

  it("skips the write-up when the reasoning AND the facts both say nothing", async () => {
    onlyPullFacts(QUIET_FACTS);
    callLlm.mockImplementation(async () => ({ text: "NOTHING-MATERIAL", isStub: false, ms: 1 }));
    const res = await runFlow(base("chain"));
    expect(res.quiet).toBe(true);
    expect(res.quietVetoed).toBe(false);
    expect(res.skipped).toContain("narrate");
    expect(res.llmCalls).toBe(2); // plan + reason; the narrate call was saved
    // A quiet run reached a conclusion. Calling it empty would punish the one
    // outcome the proposal cap exists to encourage.
    expect(res.emptyAnswer).toBe(false);
  });

  it("OVERRULES a model that asks to stay quiet over real evidence", async () => {
    // Not hypothetical. Probed twice against the local qwen2.5-coder:3b on this
    // exact shape — an open HIGH insight and four batches near expiry — it
    // answered correctly once and emitted the quiet token the second time. A
    // silenced finding leaves no trace of what it was, so the model gets a
    // vote and the evidence holds the veto.
    onlyPullFacts({
      ...QUIET_FACTS,
      insights: [{ id: "i1", title: "margin down 12%", severity: "HIGH", module: "dairy", body: "" }],
      dairy: { batchesThisWeek: 12, nearExpiry: 4 },
    });
    callLlm.mockImplementation(async () => ({ text: "NOTHING-MATERIAL", isStub: false, ms: 1 }));
    const res = await runFlow(base("chain"));
    expect(res.quietVetoed).toBe(true);
    expect(res.quiet).toBe(false);
    expect(res.skipped).toEqual([]);
    // The answer must actually be written — a vetoed run that still reported
    // itself quiet would get the canned "nothing to report" narrative from the
    // driver, overwriting the very answer the veto just saved.
    expect(res.nodes.map((n) => n.node.id)).toContain("narrate");
    expect(res.text).toBe("NOTHING-MATERIAL");
  });

  it("treats an unrecognised tool result as signal — fails toward speaking", async () => {
    // "We could not prove this was quiet" and "this is quiet" are different
    // claims, and only one is safe to act on.
    runTool.mockImplementation(async () => ({ somethingNew: 1 }));
    callLlm.mockImplementation(async () => ({ text: "NOTHING-MATERIAL", isStub: false, ms: 1 }));
    const res = await runFlow(base("chain"));
    expect(res.quiet).toBe(false);
    expect(res.quietVetoed).toBe(true);
  });

  it("does not go quiet when nothing was gathered at all", async () => {
    // Knowing nothing is not the same as knowing nothing is wrong.
    callLlm.mockImplementation(async () => ({ text: "NOTHING-MATERIAL", isStub: false, ms: 1 }));
    const res = await runFlow(base("chain", ["narrate"])); // no gatherable tools
    expect(res.quiet).toBe(false);
  });

  it("accepts the token however the model cased or wrapped it", async () => {
    // Not hypothetical: probed against the local qwen2.5-coder:3b, the model
    // made the right call and wrote "Nothing-MATERIAL". A strict === would have
    // meant the quiet edge never fired even once — a feature that silently
    // does nothing.
    for (const written of ["Nothing-MATERIAL", "**NOTHING-MATERIAL**", "`nothing-material`.", "  NOTHING-MATERIAL  "]) {
      runTool.mockImplementation(async (name: string) =>
        name === "pullFacts"
          ? { insights: [], plans: [], integrations: [], dairy: { nearExpiry: 0 } }
          : { nodes: [], memories: [], documents: [] });
      callLlm.mockImplementation(async () => ({ text: written, isStub: false, ms: 1 }));
      expect((await runFlow(base("chain"))).quiet, written).toBe(true);
    }
  });

  it("only accepts the quiet token as the WHOLE answer", async () => {
    // A model that merely quotes the instruction must not silence a real
    // finding — a suppressed answer leaves no trace of what it was.
    runTool.mockImplementation(async () => ({}));
    callLlm.mockImplementation(async () => ({
      text: "I was told to reply NOTHING-MATERIAL if nothing mattered, but margin fell 12%.",
      isStub: false, ms: 1,
    }));
    const res = await runFlow(base("chain"));
    expect(res.quiet).toBe(false);
    expect(res.skipped).toEqual([]);
  });

  it("never reads the quiet token off a stubbed reply", async () => {
    // A stub is a placeholder, not a considered "nothing here".
    callLlm.mockImplementation(async () => ({ text: "NOTHING-MATERIAL", isStub: true, ms: 1 }));
    const res = await runFlow(base("chain"));
    expect(res.quiet).toBe(false);
    expect(res.stub).toBe(true);
  });

  it("gives route no quiet edge — there is no call there to save", async () => {
    runTool.mockImplementation(async (name: string) =>
      name === "pullFacts"
        ? { insights: [], plans: [], integrations: [], dairy: { nearExpiry: 0 } }
        : { nodes: [], memories: [], documents: [] });
    callLlm.mockImplementation(async () => ({ text: "NOTHING-MATERIAL", isStub: false, ms: 1 }));
    const res = await runFlow(base("route"));
    expect(res.skipped).toEqual([]);
    expect(res.nodes.map((n) => n.node.id)).toContain("narrate");
  });

  it("never throws, whatever the model does", async () => {
    callLlm.mockImplementation(async () => { throw new Error("model exploded"); });
    const res = await runFlow(base());
    expect(res.text).toBe("");
    expect(res.nodes.filter((n) => !n.ok).length).toBe(3);
  });
});
