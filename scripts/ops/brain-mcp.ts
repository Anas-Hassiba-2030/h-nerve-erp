// scripts/ops/brain-mcp.ts
//
// Stdio MCP server exposing the H-Nerve brain tools to external clients
// (Claude Desktop, demos). Full setup: docs/ops/BRAIN-DB-LINK-RUNBOOK.md.
//
// THREE things must be right or it won't link:
//  1. CWD = repo root. The brain tool tree imports via the `@/*` tsconfig
//     alias, which tsx resolves against the process CWD. An external client
//     (Claude Desktop) MUST set `cwd` to the repo root in its mcpServers entry,
//     or the server crashes at import with "Cannot find module @/lib/db/db".
//  2. Scope env vars passed INLINE (tsx does not load .env, and resolveMcpScope
//     reads process.env at startup before Prisma loads .env). They cannot live
//     in .env — set them on the command line or the client's `env` block.
//  3. DATABASE_URL — auto-loaded by Prisma from .env when CWD is the repo root;
//     set it explicitly in the client `env` block for CWD-independence.
//
// Scope to one tenant (PowerShell — this machine's default shell):
//   $env:H_NERVE_MCP_WORKSPACE='<companyId>'; $env:H_NERVE_MCP_TENANT='<slug>'; npm run brain:mcp
// bash/macOS:
//   H_NERVE_MCP_WORKSPACE=<companyId> H_NERVE_MCP_TENANT=<slug> npm run brain:mcp
// Unscoped (all tenants — local/demo only):
//   $env:H_NERVE_MCP_ALLOW_UNSCOPED='1'; npm run brain:mcp

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildBrainMcpServer } from "../../src/lib/brain/mcp/server";
import { resolveMcpScope } from "../../src/lib/brain/mcp/scope";

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
