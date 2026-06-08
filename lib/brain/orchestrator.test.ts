// lib/brain/orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above top-level consts, so declare the mock fns in a
// hoisted block they can close over (otherwise: "Cannot access before init").
const { callLlmWithTools, runTool } = vi.hoisted(() => ({
  callLlmWithTools: vi.fn(),
  runTool: vi.fn(),
}));
vi.mock("./llm", () => ({ callLlmWithTools }));
vi.mock("./tools", () => ({ runTool, toAnthropicTools: () => [] }));

import { runToolLoop } from "./orchestrator";

beforeEach(() => { callLlmWithTools.mockReset(); runTool.mockReset(); });

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

  it("stops at MAX_ROUNDS even if the model keeps requesting tools", async () => {
    callLlmWithTools.mockResolvedValue({ isStub: false, stopReason: "tool_use", content: [{ type: "tool_use", id: "x", name: "pullFacts", input: {} }] });
    runTool.mockResolvedValue({});
    const r = await runToolLoop({ system: "s", question: "q", priorTurns: [] });
    expect(r.rounds).toBeLessThanOrEqual(4);
  });
});
