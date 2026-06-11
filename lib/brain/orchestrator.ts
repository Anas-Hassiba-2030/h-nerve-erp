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
  // Server-resolved retrieval scope. When set, it is FORCED onto the
  // retrieveDocuments tool call so the model can never widen (or omit) the
  // document scope — keeping the loop no weaker than the single-shot path.
  // The in-app caller passes the session scope; the stdio MCP door has no
  // session scope (see lib/brain/mcp/scope.ts) and leaves it undefined.
  scope?: string;
}): Promise<ToolLoopResult> {
  const tools = toAnthropicTools();
  const messages: AnthropicMessage[] = [
    ...opts.priorTurns.map((t) => ({ role: t.role === "brain" ? ("assistant" as const) : ("user" as const), content: t.text })),
    { role: "user", content: opts.question },
  ];
  const toolCalls: ToolCallRecord[] = [];
  let rounds = 0;
  let finalText = "";
  let citationCounter = 0;

  for (let i = 0; i < MAX_ROUNDS; i++) {
    rounds++;
    // On the final allowed round, withhold tools so the model MUST emit a
    // terminal answer rather than request yet another tool. Without this, a cap
    // hit mid-tool-use would leave finalText holding a stale "let me check…"
    // preamble that converse.ts would serve as the answer.
    const isLastRound = i === MAX_ROUNDS - 1;
    const resp = await callLlmWithTools({
      system: opts.system,
      messages,
      tools: isLastRound ? [] : tools,
      maxTokens: 700,
      temperature: 0.4,
    });
    if (resp.isStub) return { text: "", toolCalls, rounds, stub: true };

    // A max_tokens truncation cut the response mid-thought: any text is a
    // partial preamble and any tool_use may be malformed. Never serve a
    // truncated answer — degrade to empty so converse.ts falls back to the
    // deterministic single-shot path. The final-round tool-withholding guard
    // only covers MAX_ROUNDS exhaustion; the per-call token cap can fire on
    // ANY round (including round 1), so it needs its own guard here.
    if (resp.stopReason === "max_tokens") {
      finalText = "";
      break;
    }

    const textBlocks = resp.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    const toolUses = resp.content.filter((b: any) => b.type === "tool_use");

    // Terminal round: the model stopped requesting tools (or had none). Its text
    // IS the answer — never fall back to an earlier preamble (empty → degrade).
    if (resp.stopReason !== "tool_use" || toolUses.length === 0) {
      finalText = textBlocks;
      break;
    }

    messages.push({ role: "assistant", content: resp.content });
    const results: any[] = [];
    for (const tu of toolUses) {
      // Tenant safety: never trust the model for the document scope. When the
      // caller resolved a scope, force it onto the retrieveDocuments call so a
      // model that omits (or widens) `scope` can't read outside it.
      const toolInput =
        opts.scope && tu.name === "retrieveDocuments"
          ? { ...(tu.input as Record<string, unknown>), scope: opts.scope }
          : tu.input;
      let output: unknown;
      let isError = false;
      try {
        output = await runTool(tu.name, toolInput);
      } catch (e) {
        output = { error: String(e) };
        isError = true;
      }
      // Convention: a tool output carrying a `documents[]` (retrieveDocuments)
      // gets a stable citationId per doc, continuous across the whole loop, so
      // the model cites the SAME ids the caller later builds chips from.
      output = tagDocumentCitations(output, () => `c${++citationCounter}`);
      toolCalls.push({ name: tu.name, input: toolInput, output });
      // Per the Anthropic tool-use protocol, a failed execution sets
      // is_error:true so the model treats it as a failure to recover from,
      // not as legitimate retrieved data.
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(output),
        ...(isError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: results });
  }

  return { text: finalText, toolCalls, rounds, stub: false };
}

/** Tag each document in a retrieveDocuments-shaped output with a stable citationId. */
function tagDocumentCitations(output: unknown, nextId: () => string): unknown {
  if (!output || typeof output !== "object") return output;
  const docs = (output as { documents?: unknown }).documents;
  if (!Array.isArray(docs)) return output;
  return {
    ...(output as Record<string, unknown>),
    documents: docs.map((d: any) => ({ ...d, citationId: d?.citationId ?? nextId() })),
  };
}
