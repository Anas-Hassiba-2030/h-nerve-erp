// scripts/ops/brain-mcp.ts
//
// Stdio MCP server exposing the H-Nerve brain tools to external clients
// (Claude Desktop, demos). Scope it to one tenant with:
//   H_NERVE_MCP_WORKSPACE=<companyId> npm run brain:mcp
// Unscoped (all tenants — local/demo only) requires H_NERVE_MCP_ALLOW_UNSCOPED=1.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildBrainMcpServer } from "../../lib/brain/mcp/server";
import { resolveMcpScope } from "../../lib/brain/mcp/scope";

async function main() {
  const scope = resolveMcpScope(process.env); // throws fail-closed if neither env set
  const server = buildBrainMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe — stdout is the MCP transport channel.
  console.error(
    `[brain-mcp] up (${scope.mode === "scoped" ? `workspace=${scope.workspace} tenant=${scope.tenant}` : "UNSCOPED"})`,
  );
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
