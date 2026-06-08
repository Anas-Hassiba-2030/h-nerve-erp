// lib/brain/mcp/scope.test.ts
import { describe, it, expect } from "vitest";
import { resolveMcpScope } from "./scope";

describe("resolveMcpScope", () => {
  it("scopes to a workspace when set", () => {
    expect(resolveMcpScope({ H_NERVE_MCP_WORKSPACE: "c1" })).toEqual({ mode: "scoped", workspace: "c1" });
  });
  it("allows unscoped only with the explicit flag", () => {
    expect(resolveMcpScope({ H_NERVE_MCP_ALLOW_UNSCOPED: "1" })).toEqual({ mode: "unscoped", workspace: null });
  });
  it("throws fail-closed when neither is set", () => {
    expect(() => resolveMcpScope({})).toThrow(/H_NERVE_MCP_WORKSPACE/);
  });
});
