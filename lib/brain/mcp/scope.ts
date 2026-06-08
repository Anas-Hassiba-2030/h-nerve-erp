// lib/brain/mcp/scope.ts
export type McpScope = { mode: "scoped"; workspace: string } | { mode: "unscoped"; workspace: null };

/** Fail-closed: refuse to run unless scoped to a workspace or explicitly allowed unscoped. */
export function resolveMcpScope(env: Record<string, string | undefined>): McpScope {
  const ws = env.H_NERVE_MCP_WORKSPACE;
  if (ws) return { mode: "scoped", workspace: ws };
  if (env.H_NERVE_MCP_ALLOW_UNSCOPED === "1") return { mode: "unscoped", workspace: null };
  throw new Error(
    "brain-mcp refuses to start: set H_NERVE_MCP_WORKSPACE=<companyId> to scope to one tenant, " +
      "or H_NERVE_MCP_ALLOW_UNSCOPED=1 to run unscoped (DANGEROUS: exposes all tenants).",
  );
}
