// lib/tenancy/mcpScope.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

// cookies() throws outside a request — simulate that.
vi.mock("next/headers", () => ({ cookies: () => { throw new Error("no request scope"); } }));

import { getActiveWorkspaceId } from "./workspace";
import { getActiveTenantSlug } from "./tenancy";

const OLD_W = process.env.H_NERVE_MCP_WORKSPACE;
const OLD_T = process.env.H_NERVE_MCP_TENANT;
afterEach(() => {
  process.env.H_NERVE_MCP_WORKSPACE = OLD_W;
  process.env.H_NERVE_MCP_TENANT = OLD_T;
});

describe("tenancy env fallback (non-request context)", () => {
  it("returns null when no env is set (pitch-safe pass-through)", async () => {
    delete process.env.H_NERVE_MCP_WORKSPACE;
    delete process.env.H_NERVE_MCP_TENANT;
    expect(await getActiveWorkspaceId()).toBeNull();
    expect(await getActiveTenantSlug()).toBeNull();
  });
  it("returns the env workspace/tenant when set", async () => {
    process.env.H_NERVE_MCP_WORKSPACE = "company_123";
    process.env.H_NERVE_MCP_TENANT = "maha-dairy";
    expect(await getActiveWorkspaceId()).toBe("company_123");
    expect(await getActiveTenantSlug()).toBe("maha-dairy");
  });
});
