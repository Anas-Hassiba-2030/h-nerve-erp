// lib/brain/tools/types.ts
import type { z } from "zod";

/** A brain capability exposed as a tool. One per "section" of the brain. */
export type BrainTool<I = unknown, O = unknown> = {
  /** Unique tool name (used by the orchestrator and the MCP server). */
  name: string;
  /** LLM-facing description: what it does and when to call it. */
  description: string;
  /** Zod schema validating the tool input. MUST be a z.object(...). */
  inputSchema: z.ZodType<I>;
  /** Runs the capability. MUST return a JSON-serializable object. */
  run: (input: I) => Promise<O>;
};

/** Validate raw input against a tool's schema, throwing a named error. */
export function parseToolInput<I>(tool: BrainTool<I>, raw: unknown): I {
  const result = tool.inputSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid input for tool "${tool.name}": ${result.error.message}`);
  }
  return result.data;
}
