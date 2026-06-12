// lib/brain/tools/index.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import { parseToolInput, type BrainTool } from "./types";
import { causalSubgraphTool } from "./causalSubgraph";
import { simulateTool } from "./simulate";
import { councilDebateTool } from "./councilDebate";
import { recallMemoryTool } from "./recallMemory";
import { retrieveDocumentsTool } from "./retrieveDocuments";
import { narrateTool } from "./narrate";
import { pullFactsTool } from "./pullFacts";

export const TOOLS: BrainTool[] = [
  pullFactsTool,
  retrieveDocumentsTool,
  causalSubgraphTool,
  simulateTool,
  recallMemoryTool,
  councilDebateTool,
  narrateTool,
];

export const TOOLS_BY_NAME: Record<string, BrainTool> = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

/** Anthropic Messages-API tool definitions (JSON-schema input). */
export function toAnthropicTools(): Array<{ name: string; description: string; input_schema: object }> {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJsonSchema(t.inputSchema, { $refStrategy: "none" }) as object,
  }));
}

/** Validate raw input against the named tool's schema, then run it. */
export async function runTool(name: string, rawInput: unknown): Promise<unknown> {
  const tool = TOOLS_BY_NAME[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.run(parseToolInput(tool, rawInput) as never);
}
