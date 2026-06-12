// lib/brain/tools/index.test.ts
import { describe, it, expect } from "vitest";
import { TOOLS, TOOLS_BY_NAME, toAnthropicTools, runTool } from "./index";

describe("tool registry", () => {
  it("exposes 7 uniquely-named tools", () => {
    expect(TOOLS).toHaveLength(7);
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(7);
    expect(TOOLS_BY_NAME.causalSubgraph).toBeDefined();
  });
  it("emits Anthropic tool defs with object input_schema", () => {
    const defs = toAnthropicTools();
    expect(defs).toHaveLength(7);
    for (const d of defs) {
      expect(typeof d.name).toBe("string");
      expect((d.input_schema as any).type).toBe("object");
    }
  });
  it("rejects unknown tools and invalid input before running", async () => {
    await expect(runTool("nope", {})).rejects.toThrow(/Unknown tool/);
    await expect(runTool("causalSubgraph", { question: 123 })).rejects.toThrow();
  });
});
