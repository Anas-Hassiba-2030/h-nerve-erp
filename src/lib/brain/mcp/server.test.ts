// lib/brain/mcp/server.test.ts
import { describe, it, expect } from "vitest";
import { buildBrainMcpServer, registeredToolNames } from "./server";

describe("brain MCP server", () => {
  it("registers all brain tools without throwing", () => {
    expect(() => buildBrainMcpServer()).not.toThrow();
  });
  it("exposes the 7 brain tools by name", () => {
    expect(registeredToolNames()).toEqual(
      expect.arrayContaining(["pullFacts", "retrieveDocuments", "causalSubgraph", "simulate", "recallMemory", "councilDebate", "narrate"]),
    );
  });
});
