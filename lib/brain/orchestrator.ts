// lib/brain/orchestrator.ts
//
// The thinking loop. In LIVE mode the model is given the brain tool catalog
// and decides which tools to call (≤ MAX_ROUNDS rounds) before writing the
// final answer. STUB mode never reaches here — converse.ts routes to its
// single-shot path when no API key is set.

import { callLlmWithTools, type AnthropicMessage } from "./llm";
import { runTool, toAnthropicTools } from "./tools";

export const MAX_ROUNDS = 4;

export type ToolCallRecord = { name: string; input: unknown; output: unknown };
export type ToolLoopResult = { text: string; toolCalls: ToolCallRecord[]; rounds: number; stub: boolean };

export async function runToolLoop(opts: {
  system: string;
  question: string;
  priorTurns: Array<{ role: "user" | "brain"; text: string }>;
}): Promise<ToolLoopResult> {
  const tools = toAnthropicTools();
  const messages: AnthropicMessage[] = [
    ...opts.priorTurns.map((t) => ({ role: t.role === "brain" ? ("assistant" as const) : ("user" as const), content: t.text })),
    { role: "user", content: opts.question },
  ];
  const toolCalls: ToolCallRecord[] = [];
  let rounds = 0;
  let finalText = "";

  for (let i = 0; i < MAX_ROUNDS; i++) {
    rounds++;
    const resp = await callLlmWithTools({ system: opts.system, messages, tools, maxTokens: 700, temperature: 0.4 });
    if (resp.isStub) return { text: "", toolCalls, rounds, stub: true };

    const textBlocks = resp.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    const toolUses = resp.content.filter((b: any) => b.type === "tool_use");

    if (resp.stopReason !== "tool_use" || toolUses.length === 0) {
      finalText = textBlocks || finalText;
      break;
    }

    messages.push({ role: "assistant", content: resp.content });
    const results: any[] = [];
    for (const tu of toolUses) {
      let output: unknown;
      try {
        output = await runTool(tu.name, tu.input);
      } catch (e) {
        output = { error: String(e) };
      }
      toolCalls.push({ name: tu.name, input: tu.input, output });
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output) });
    }
    messages.push({ role: "user", content: results });
    finalText = textBlocks || finalText;
  }

  return { text: finalText, toolCalls, rounds, stub: false };
}
