// lib/brain/mcp/scope.ts
export type McpScope =
  | { mode: "scoped"; workspace: string; tenant: string }
  | { mode: "unscoped"; workspace: null; tenant: null };

/**
 * Fail-closed scope resolver for the stdio MCP server.
 *
 * The brain's data is scoped on TWO independent axes (lib/tenancy/workspaceScope.ts):
 *   - workspaceId (companyId): Hotel, DairyBatch, Farm, AIInsight → H_NERVE_MCP_WORKSPACE
 *   - tenantSlug:              Booking, Crop, …                    → H_NERVE_MCP_TENANT
 * BOTH env vars are required to isolate a single tenant; setting only one leaves
 * the other axis's models reading cross-tenant. (Plan and Integration are not
 * tenant-scoped in the schema, so they stay group-wide even when scoped —
 * matching how the in-app brain already treats them.)
 */
export function resolveMcpScope(env: Record<string, string | undefined>): McpScope {
  const ws = env.H_NERVE_MCP_WORKSPACE;
  const tenant = env.H_NERVE_MCP_TENANT;
  if (ws && tenant) return { mode: "scoped", workspace: ws, tenant };
  if (env.H_NERVE_MCP_ALLOW_UNSCOPED === "1") return { mode: "unscoped", workspace: null, tenant: null };
  throw new Error(
    "brain-mcp refuses to start: set BOTH H_NERVE_MCP_WORKSPACE=<companyId> and " +
      "H_NERVE_MCP_TENANT=<tenantSlug> to scope to one tenant, or H_NERVE_MCP_ALLOW_UNSCOPED=1 " +
      "to run unscoped (DANGEROUS: exposes all tenants).",
  );
}
