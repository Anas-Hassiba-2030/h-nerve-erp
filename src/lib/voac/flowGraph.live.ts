// lib/voac/flowGraph.live.ts — the executor for a predetermined run graph.
//
// The pure twin (flowGraph.ts) decides the SHAPE. This runs it. Roughly:
//
//     for (const stage of spec.stages)
//       await Promise.all(stage.nodes.map(run))
//
// and that is genuinely most of it. Everything else here is the discipline
// around that loop — budget, persistence, and refusing to lie about failures.
//
// WHY THIS IS NOT A DAG ENGINE. The specs are static and hand-written; there
// are no cycles to detect, no topological sort to compute, no dynamic edges.
// Shipping a general graph engine to run three fixed shapes would be a library
// nobody asked for wrapped around forty lines of work.
//
// WHAT THE MODEL IS AND IS NOT ALLOWED TO DO. It reasons. It does not choose
// tools — our code does, before the run starts. That inversion is the whole
// benefit: the orchestrator's tool loop needs the model to emit `tool_use` to
// make progress, and small local models routinely answer in prose instead,
// which silently degrades the loop to one ungrounded reply. A graph gets its
// facts either way, so a weak model produces a grounded answer instead of a
// confident guess.
//
// Read-mostly boundary holds: nothing here writes to a domain table.

import { runTool } from "@/lib/brain/tools";
import { callLlm } from "@/lib/brain/llm";
import { verifyNarrative } from "@/lib/brain/verifier";
import { toPyLiteral } from "@/lib/brain/serialize";
import { log } from "@/lib/utils/logger";
import { llmNodeCount, type FlowNode, type FlowSpec } from "./flowGraph";

/** One node's outcome, handed to the caller for persistence. */
export type FlowNodeResult = {
  node: FlowNode;
  stageId: string;
  /** Position of the stage in the graph, 0-based — the lane it drew in. */
  stageIndex: number;
  ok: boolean;
  /** What went in, already stringified for the ledger. */
  input: string;
  output: string | null;
  error: string | null;
  latencyMs: number;
};

export type RunFlowInput = {
  spec: FlowSpec;
  objective: string;
  /** The role's skill document plus its output contract. */
  system: string;
  locale: "ar" | "en";
  /**
   * Persist a node the moment it finishes.
   *
   * Called per node rather than once at the end so a crash mid-graph still
   * leaves a readable partial trace — the same durability rule the loop path
   * already follows, and the reason the run-detail page can draw a half-run.
   */
  onNode?: (result: FlowNodeResult) => Promise<void>;
};

export type RunFlowResult = {
  /** The final answer. Empty string is a real outcome, not an error to hide. */
  text: string;
  /** Every LLM node that ran, whether it reached a model or not. */
  llmCalls: number;
  /**
   * The calls that actually reached a model — what the tenant owes for.
   *
   * Kept separate from `llmCalls` because `callLlm` NEVER throws: a 429, a
   * timeout, the global call cap, or an empty completion all come back as
   * `{ isStub: true }`. Collapsing that into one run-wide boolean means a
   * single throttled call in a three-call graph marks the whole run "stub",
   * which skips billing for the two calls that were really paid for and labels
   * a run that answered as one with no model configured.
   */
  realCalls: number;
  /** True only when NOTHING reached a model — the genuine no-model case. */
  stub: boolean;
  /** The final answer is a stub placeholder even though other calls were real. */
  answerStubbed: boolean;
  nodes: FlowNodeResult[];
  /** Set when the graph ran but produced nothing a human can read. */
  emptyAnswer: boolean;
  /** Numeric-claim check from the grade node, when the spec has one. */
  grade: { total: number; verified: number; coverage: number; trustLevel: string } | null;
};

/**
 * Bind a gather tool's input from the objective alone.
 *
 * Deterministic by construction. flowGraph.ts already refuses to graph any tool
 * whose input cannot be derived this way, so an unknown name here means the
 * two files have drifted — throw rather than silently pass `{}` and record a
 * tool call that quietly did nothing.
 */
function bindToolInput(tool: string, objective: string, locale: "ar" | "en"): Record<string, unknown> {
  switch (tool) {
    case "pullFacts":
      return {};
    case "causalSubgraph":
      return { question: objective };
    case "recallMemory":
      return { situation: objective };
    case "retrieveDocuments":
      return { query: objective, locale };
    default:
      throw new Error(`flowGraph: no deterministic input binding for tool "${tool}"`);
  }
}

/** Cap what we paste into a prompt, so one huge tool result cannot crowd out the rest. */
const CONTEXT_CHARS_PER_TOOL = 3500;

function renderContext(facts: Record<string, unknown>): string {
  const entries = Object.entries(facts);
  if (entries.length === 0) return "(no facts were gathered)";
  return entries
    .map(([k, v]) => `${k} = ${toPyLiteral(v).slice(0, CONTEXT_CHARS_PER_TOOL)}`)
    .join("\n\n");
}

const NODE_PROMPT: Record<string, (o: string) => string> = {
  classify: (o) =>
    `Classify this request in two sentences: which single area it belongs to, and what one number would settle it.\n\nRequest: ${o}`,
  plan: (o) =>
    `In three short lines, name the steps needed to answer this and what evidence each step needs. Do not answer it yet.\n\nRequest: ${o}`,
  reason: (o) =>
    `Using ONLY the facts above, work out the answer. State plainly where the facts do not cover the question.\n\nRequest: ${o}`,
  draft: (o) =>
    `Using ONLY the facts above, draft the answer with its supporting numbers stated explicitly.\n\nRequest: ${o}`,
};

/**
 * Run one graph, end to end.
 *
 * Never throws. A node that fails is recorded as a failed node and the graph
 * CONTINUES — a gather tool erroring is a thinner answer, not a dead run.
 * The one exception is the final narrate node: if that fails there is nothing
 * to hand a human, and the result says so rather than returning empty prose
 * that reads like a considered "nothing to report".
 */
export async function runFlow(input: RunFlowInput): Promise<RunFlowResult> {
  const { spec, objective, system, locale } = input;
  const facts: Record<string, unknown> = {};
  const nodes: FlowNodeResult[] = [];
  const carry: string[] = [];
  let llmCalls = 0;
  let realCalls = 0;
  let answerStubbed = false;
  let text = "";
  let grade: RunFlowResult["grade"] = null;

  // Persistence is SERIALISED even though the work is not.
  //
  // Caught by scripts/verify/voac-smoke.ts: runStore.appendStep derives a step's
  // `seq` from a live count() of the run's existing steps, so two nodes writing
  // at the same instant both read the same count and land on the same seq
  // (observed: 0,1,2,2,4). Ordering is the one thing a trace cannot be wrong
  // about. Chaining the writes costs nothing that matters — the parallelism
  // being sold here is the TOOL CALLS, which have already finished by the time
  // a node reaches this queue.
  let writes: Promise<void> = Promise.resolve();
  const record = async (r: FlowNodeResult) => {
    nodes.push(r);
    const onNode = input.onNode;
    if (!onNode) return;
    writes = writes.then(async () => {
      // A persistence failure must not take down the graph — losing one ledger
      // row is bad, losing the answer the user waited for is worse. Swallowed
      // HERE rather than by the caller so one bad write cannot break the chain
      // for every node behind it.
      try {
        await onNode(r);
      } catch (e) {
        log.error("voac.flow: onNode failed", { node: r.node.id, err: String(e) });
      }
    });
    await writes;
  };

  for (const [stageIndex, stage] of spec.stages.entries()) {
    await Promise.all(
      stage.nodes.map(async (node) => {
        const startedMs = Date.now();
        const base = { node, stageId: stage.id, stageIndex };

        try {
          if (node.kind === "tool") {
            const args = bindToolInput(node.tool!, objective, locale);
            const out = await runTool(node.tool!, args);
            facts[node.tool!] = out;
            await record({
              ...base, ok: true, error: null,
              input: `${node.tool}(${JSON.stringify(args)})`,
              output: JSON.stringify(out).slice(0, 4000),
              latencyMs: Date.now() - startedMs,
            });
            return;
          }

          if (node.kind === "grade") {
            // Pure and free: re-read the draft's numeric claims against the
            // facts that were actually pulled. No second model — a model
            // grading its own output buys confidence it has not earned.
            const draft = carry[carry.length - 1] ?? "";
            const report = verifyNarrative(draft, facts);
            grade = {
              total: report.total, verified: report.verified,
              coverage: report.coverage, trustLevel: report.trustLevel,
            };
            await record({
              ...base, ok: true, error: null,
              input: `${report.total} numeric claim(s) in the draft`,
              output: `${report.verified}/${report.total} grounded in the gathered facts — trust ${report.trustLevel}.`,
              latencyMs: Date.now() - startedMs,
            });
            return;
          }

          // ---- reason / narrate: the only nodes that spend a token ----------
          const isNarrate = node.kind === "narrate";
          const prompt = isNarrate
            ? [
                grade && grade.total > 0 && grade.coverage < 0.8
                  ? `Only ${grade.verified} of ${grade.total} figures in the draft matched the gathered facts. Drop or hedge every figure you cannot support.`
                  : "",
                `Write the final answer for a manager, in ${locale === "ar" ? "Arabic" : "English"}. Use only what is established above.`,
                `Request: ${objective}`,
              ].filter(Boolean).join("\n\n")
            : (NODE_PROMPT[node.id] ?? NODE_PROMPT.reason)(objective);

          const user = [
            carry.length ? `Established so far:\n${carry.join("\n\n")}` : "",
            `Facts:\n${renderContext(facts)}`,
            prompt,
          ].filter(Boolean).join("\n\n---\n\n");

          const res = await callLlm(
            { system, user, maxTokens: isNarrate ? 1200 : 600 },
            () =>
              `(stub — no model configured; node "${node.id}" would have run over ${Object.keys(facts).length} gathered fact set(s))`,
          );
          llmCalls += 1;
          if (res.isStub) {
            if (isNarrate) answerStubbed = true;
          } else {
            realCalls += 1;
          }

          if (isNarrate) text = res.text;
          else carry.push(`[${node.labelEn}] ${res.text}`);

          await record({
            ...base, ok: true, error: null,
            input: prompt.slice(0, 900),
            output: res.text,
            latencyMs: Date.now() - startedMs,
          });
        } catch (e) {
          log.error("voac.flow: node failed", { node: node.id, stage: stage.id, err: String(e) });
          await record({
            ...base, ok: false,
            input: node.tool ?? node.id,
            output: null,
            error: String(e).slice(0, 900),
            latencyMs: Date.now() - startedMs,
          });
        }
      }),
    );
  }

  // "Stub" means no model was reachable AT ALL. A partially degraded run is a
  // real run that went badly, and must be billed and labelled as one.
  const stub = llmCalls > 0 && realCalls === 0;

  return {
    text,
    llmCalls,
    realCalls,
    stub,
    // Only interesting when the run was NOT wholly stubbed: in a real stub run
    // every node is a placeholder and saying so per-node is noise.
    answerStubbed: answerStubbed && !stub,
    nodes,
    // Stub mode is the ABSENCE of a model, not an empty answer — flagging it
    // here would make every key-less run look like a defect.
    emptyAnswer: !stub && !text.trim(),
    grade,
  };
}

/**
 * The exact LLM-call cost of this graph, known before the first token.
 *
 * topology.ts can only estimate from a cost multiplier. Once the shape is
 * fixed the number is exact, so the budget check can refuse honestly instead
 * of discovering the overspend halfway through.
 */
export function plannedLlmCalls(spec: FlowSpec): number {
  return llmNodeCount(spec);
}
