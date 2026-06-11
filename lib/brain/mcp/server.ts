// lib/brain/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TOOLS } from "../tools";

/** Names of the tools this server exposes (for tests + introspection). */
export function registeredToolNames(): string[] {
  return TOOLS.map((t) => t.name);
}

/** Build the H-Nerve brain MCP server with every brain tool registered. */
export function buildBrainMcpServer(): McpServer {
  const server = new McpServer({ name: "h-nerve-brain", version: "1.0.0" });
  for (const tool of TOOLS) {
    // Every tool's inputSchema is a z.object — pass its raw shape to the SDK.
    const shape = (tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape;
    server.tool(tool.name, tool.description, shape, async (args: unknown) => {
      const input = tool.inputSchema.parse(args);
      const output = await tool.run(input as never);
      return { content: [{ type: "text" as const, text: JSON.stringify(output) }] };
    });
  }
  return server;
}
