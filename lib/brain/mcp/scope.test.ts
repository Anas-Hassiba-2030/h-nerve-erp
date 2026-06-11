// lib/brain/mcp/scope.test.ts
import { describe, it, expect } from "vitest";
import { resolveMcpScope } from "./scope";

describe("resolveMcpScope", () => {
  it("scopes only when BOTH workspace and tenant are set", () => {
    expect(resolveMcpScope({ H_NERVE_MCP_WORKSPACE: "c1", H_NERVE_MCP_TENANT: "maha-dairy" })).toEqual({
      mode: "scoped",
      workspace: "c1",
      tenant: "maha-dairy",
    });
  });
  it("throws fail-closed when only the workspace is set (tenant-axis models would leak)", () => {
    expect(() => resolveMcpScope({ H_NERVE_MCP_WORKSPACE: "c1" })).toThrow(/H_NERVE_MCP_TENANT/);
  });
  it("throws fail-closed when only the tenant is set", () => {
    expect(() => resolveMcpScope({ H_NERVE_MCP_TENANT: "maha-dairy" })).toThrow(/H_NERVE_MCP_WORKSPACE/);
  });
  it("allows unscoped only with the explicit flag", () => {
    expect(resolveMcpScope({ H_NERVE_MCP_ALLOW_UNSCOPED: "1" })).toEqual({
      mode: "unscoped",
      workspace: null,
      tenant: null,
    });
  });
  it("throws fail-closed when nothing is set", () => {
    expect(() => resolveMcpScope({})).toThrow(/refuses to start/);
  });
});
