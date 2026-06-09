// lib/brain/orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above top-level consts, so declare the mock fns in a
// hoisted block they can close over (otherwise: "Cannot access before init").
const { callLlmWithTools, runTool } = vi.hoisted(() => ({
  callLlmWithTools: vi.fn(),
  runTool: vi.fn(),
}));
vi.mock("./llm", () => ({ callLlmWithTools }));
vi.mock("./tools", () => ({
  runTool,
  // Non-empty so a test can prove tools are WITHHELD on the final round.
  toAnthropicTools: () => [{ name: "pullFacts", description: "d", input_schema: { type: "object" } }],
}));

import { runToolLoop } from "./orchestrator";

beforeEach(() => {
  callLlmWithTools.mockReset();
  runTool.mockReset();
});

describe("runToolLoop", () => {
  it("returns stub=true when the model is unavailable", async () => {
    callLlmWithTools.mockResolvedValueOnce({ content: [], stopReason: "stub", isStub: true });
    const r = await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    expect(r.stub).toBe(true);
  });

  it("runs a tool then returns the final text", async () => {
    callLlmWithTools
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "tool_use", id: "tu1", name: "pullFacts", input: {} }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "end_turn", content: [{ type: "text", text: "Final answer." }] });
    runTool.mockResolvedValueOnce({ insights: [] });
    const r = await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    expect(runTool).toHaveBeenCalledWith("pullFacts", {});
    expect(r.text).toBe("Final answer.");
    expect(r.toolCalls).toHaveLength(1);
    expect(r.stub).toBe(false);
  });

  it("withholds tools on the final round and returns its terminal text (not a stale preamble)", async () => {
    callLlmWithTools
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "text", text: "Let me check…" }, { type: "tool_use", id: "t1", name: "pullFacts", input: {} }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "text", text: "Still…" }, { type: "tool_use", id: "t2", name: "pullFacts", input: {} }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "text", text: "Almost…" }, { type: "tool_use", id: "t3", name: "pullFacts", input: {} }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "end_turn", content: [{ type: "text", text: "Final grounded answer." }] });
    runTool.mockResolvedValue({ insights: [] });
    const r = await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    expect(r.rounds).toBe(4);
    expect(r.text).toBe("Final grounded answer."); // not "Almost…"
    expect(callLlmWithTools.mock.calls[0][0].tools).toHaveLength(1); // early round: tools provided
    expect(callLlmWithTools.mock.calls[3][0].tools).toEqual([]); // final round: withheld
  });

  it("degrades to empty text when the cap is hit with no terminal answer", async () => {
    callLlmWithTools.mockResolvedValue({ isStub: false, stopReason: "tool_use", content: [{ type: "text", text: "preamble" }, { type: "tool_use", id: "x", name: "pullFacts", input: {} }] });
    runTool.mockResolvedValue({});
    const r = await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    expect(r.rounds).toBe(4);
    expect(r.text).toBe(""); // a stale "preamble" is never served as the answer
  });

  it("degrades to empty when the model hits the token cap mid-tool-use (no stale preamble)", async () => {
    // max_tokens can fire on ANY round — here round 1, before the final-round
    // tool-withholding guard would ever apply. The preamble must NOT be served.
    callLlmWithTools.mockResolvedValueOnce({
      isStub: false,
      stopReason: "max_tokens",
      content: [
        { type: "text", text: "Let me check the dairy batches…" },
        { type: "tool_use", id: "t1", name: "pullFacts", input: {} },
      ],
    });
    const r = await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    expect(r.text).toBe("");
    expect(r.rounds).toBe(1);
    expect(runTool).not.toHaveBeenCalled(); // truncated tool_use is never executed
  });

  it("flags a thrown tool with is_error:true in the tool_result sent back to the model", async () => {
    callLlmWithTools
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "pullFacts", input: {} }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "end_turn", content: [{ type: "text", text: "Recovered." }] });
    runTool.mockRejectedValueOnce(new Error("boom"));
    await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    // The 2nd call carries the tool_result; it must be marked is_error:true.
    const followupMessages = callLlmWithTools.mock.calls[1][0].messages;
    const toolResult = followupMessages.at(-1).content[0];
    expect(toolResult.type).toBe("tool_result");
    expect(toolResult.is_error).toBe(true);
  });

  it("forces the caller's scope onto retrieveDocuments (model cannot widen/omit it)", async () => {
    callLlmWithTools
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "tool_use", id: "d1", name: "retrieveDocuments", input: { query: "a" } }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "end_turn", content: [{ type: "text", text: "Done." }] });
    runTool.mockResolvedValueOnce({ documents: [] });
    await runToolLoop({ system: "s", question: "q", priorTurns: [], scope: "hotels-q3" });
    expect(runTool).toHaveBeenCalledWith("retrieveDocuments", { query: "a", scope: "hotels-q3" });
  });

  it("tags retrieveDocuments documents with continuous citationIds across calls", async () => {
    callLlmWithTools
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "tool_use", id: "d1", name: "retrieveDocuments", input: { query: "a" } }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "tool_use", content: [{ type: "tool_use", id: "d2", name: "retrieveDocuments", input: { query: "b" } }] })
      .mockResolvedValueOnce({ isStub: false, stopReason: "end_turn", content: [{ type: "text", text: "Done [c1][c2][c3]." }] });
    runTool
      .mockResolvedValueOnce({ documents: [{ documentId: "x1", title: "A", kind: "CONTRACT" }, { documentId: "x2", title: "B", kind: "INVOICE" }] })
      .mockResolvedValueOnce({ documents: [{ documentId: "x3", title: "C", kind: "REPORT" }] });
    const r = await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    const ids = r.toolCalls.flatMap((c) => ((c.output as { documents?: Array<{ citationId?: string }> })?.documents ?? []).map((d) => d.citationId));
    expect(ids).toEqual(["c1", "c2", "c3"]); // continuous across both retrieveDocuments calls
  });
});
