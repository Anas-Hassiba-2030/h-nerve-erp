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
import {
  llmNodeCount, GROUNDED_COVERAGE, QUIET_TOKEN, factsCarrySignal,
  type FlowNode, type FlowSpec, type FlowStage, type StageGuard,
} from "./flowGraph";

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
  /**
   * The reasoning concluded there is nothing worth a person's attention, so the
   * narrate stage was skipped. A RESULT, not a failure — and the only outcome
   * in this system that costs less than it could have.
   */
  quiet: boolean;
  /**
   * The model asked to stay quiet over evidence that says otherwise, and was
   * overruled. Surfaced because a model trying to silence a finding is worth
   * knowing about — and a veto applied silently teaches nobody anything.
   */
  quietVetoed: boolean;
  /** Stage ids whose guard did not hold. Reporting, so a skip is never silent. */
  skipped: string[];
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

/**
 * The instruction that lets a reasoning node say "nothing here".
 *
 * Appended only to the nodes whose stage is followed by a guarded narrate, so
 * a node that cannot silence anything is never invited to try.
 */
const QUIET_CLAUSE =
  `\n\nIf the facts show nothing that warrants a person's attention, reply with exactly ${QUIET_TOKEN} and nothing else. Do not use that word in any other context.`;

const NODE_PROMPT: Record<string, (o: string) => string> = {
  classify: (o) =>
    `Classify this request in two sentences: which single area it belongs to, and what one number would settle it.\n\nRequest: ${o}`,
  plan: (o) =>
    `In three short lines, name the steps needed to answer this and what evidence each step needs. Do not answer it yet.\n\nRequest: ${o}`,
  reason: (o) =>
    `Using ONLY the facts above, work out the answer. State plainly where the facts do not cover the question.\n\nRequest: ${o}${QUIET_CLAUSE}`,
  draft: (o) =>
    `Using ONLY the facts above, draft the answer with its supporting numbers stated explicitly.\n\nRequest: ${o}${QUIET_CLAUSE}`,
};

/**
 * Did this reasoning node decline to report anything?
 *
 * THE WHOLE OUTPUT must be the token. Searching for it inside prose would let a
 * model that merely quoted the instruction silence a real answer — the same
 * salvaging-from-prose mistake `proposals.ts` refuses to make, and the failure
 * would be silent (a suppressed finding leaves no trace of what it was).
 *
 * Case and wrapping punctuation ARE forgiven, and that is not laziness: probed
 * against the local qwen2.5-coder:3b, the model made the right call and wrote
 * `Nothing-MATERIAL`. Under a strict `===` the quiet edge would simply never
 * have fired — a feature that silently does nothing, which is worse than not
 * shipping it. Models also like to bold things. Loosening the SHAPE of the
 * token is safe; loosening the whole-output rule is not, so that stays exact.
 */
function isQuiet(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/^[^A-Za-z]+/, "")   // leading quotes, backticks, asterisks, bullets
    .replace(/[^A-Za-z]+$/, "")   // trailing punctuation and wrapping
    .toUpperCase();
  return normalized === QUIET_TOKEN;
}

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
  /** Figures in the latest draft that no gathered fact supports. Feeds the revise prompt. */
  let ungrounded: string[] = [];
  /** The model's VOTE, not the decision. See the guard below. */
  let modelSaidQuiet = false;
  let quietVetoed = false;
  const skipped: string[] = [];

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

  /**
   * The router: plain code reading state, deciding whether a stage runs.
   *
   * Never the model. A model writes into state (a draft, a token); this reads
   * what it wrote and picks the edge. Keeping control flow out of the model's
   * hands is the same inversion as binding the tool inputs — and it is why a
   * weak model can drive this graph at all.
   */
  const guardHolds = (guard: StageGuard): boolean => {
    switch (guard) {
      case "revisionNeeded":
        // Nothing to revise toward if the draft made no numeric claim at all —
        // a prose answer with no figures is not ungrounded, it is unquantified,
        // and a revise pass would burn a call chasing claims that do not exist.
        return grade !== null && grade.total > 0 && grade.coverage < GROUNDED_COVERAGE;
      case "hasSomethingToSay":
        // BOTH must agree before the write-up is skipped: the model's own
        // reading AND a deterministic check of the evidence it was handed.
        // The model gets a vote, never the decision — measured: the local 3B
        // emitted the quiet token over a HIGH-severity insight and four
        // batches near expiry. A silenced finding leaves no trace of itself.
        if (!modelSaidQuiet) return true;
        if (factsCarrySignal(facts)) {
          // Recorded, never swallowed: a model trying to silence evidence it
          // was handed is a real signal about that model, and it is invisible
          // if the veto is applied quietly.
          quietVetoed = true;
          return true;
        }
        return false;
    }
  };

  const shouldRun = (stage: FlowStage): boolean => !stage.runIf || guardHolds(stage.runIf);

  for (const [stageIndex, stage] of spec.stages.entries()) {
    if (!shouldRun(stage)) {
      // A skipped stage records NOTHING. traceLanes draws what ran, so an
      // absent lane is the honest picture of a stage that did not happen —
      // whereas a placeholder row would put a node on the chart that never
      // executed, which is the exact failure the trace is drawn to avoid.
      skipped.push(stage.id);
      continue;
    }
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
            // Kept so the revise pass can be told WHICH figures failed. Handing
            // a model "your draft graded poorly, try again" makes it rewrite
            // blind and usually reproduce the same numbers; naming the tokens
            // is the difference between a critic and a complaint.
            ungrounded = report.claims.filter((c) => !c.verified).map((c) => c.claim.token);
            await record({
              ...base, ok: true, error: null,
              input: `${report.total} numeric claim(s) in the draft`,
              output: [
                `${report.verified}/${report.total} grounded in the gathered facts — trust ${report.trustLevel}.`,
                ungrounded.length ? `Unsupported: ${ungrounded.join(", ")}` : "",
              ].filter(Boolean).join(" "),
              latencyMs: Date.now() - startedMs,
            });
            return;
          }

          // ---- reason / narrate: the only nodes that spend a token ----------
          const isNarrate = node.kind === "narrate";
          let prompt: string;
          if (isNarrate) {
            prompt = [
              grade && grade.total > 0 && grade.coverage < GROUNDED_COVERAGE
                ? `Only ${grade.verified} of ${grade.total} figures matched the gathered facts${ungrounded.length ? ` (unsupported: ${ungrounded.join(", ")})` : ""}. Drop or hedge every figure you cannot support.`
                : "",
              `Write the final answer for a manager, in ${locale === "ar" ? "Arabic" : "English"}. Use only what is established above.`,
              `Request: ${objective}`,
            ].filter(Boolean).join("\n\n");
          } else if (node.id === "revise") {
            // Named failures, not a grade. "Your draft scored badly" makes a
            // model rewrite blind and reproduce the same numbers; the specific
            // tokens give it something to actually fix.
            prompt = [
              `The draft above states figures that no gathered fact supports: ${ungrounded.join(", ") || "(none named)"}.`,
              `Rewrite it. Replace each unsupported figure with one the facts DO support, or remove the claim. Do not introduce any new number that is not in the facts.`,
              `Request: ${objective}`,
            ].join("\n\n");
          } else {
            prompt = (NODE_PROMPT[node.id] ?? NODE_PROMPT.reason)(objective);
          }

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

          if (isNarrate) {
            text = res.text;
          } else {
            // A stub is a placeholder sentence, not a considered "nothing here".
            // Reading the quiet token off a stubbed reply would silence a run
            // that never reached a model.
            if (!res.isStub && isQuiet(res.text)) modelSaidQuiet = true;
            carry.push(`[${node.labelEn}] ${res.text}`);
          }

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

  // Derived from what ACTUALLY happened, not from the model's vote. Reading it
  // off `modelSaidQuiet` would let a vetoed run report itself quiet — and the
  // driver writes a canned "nothing to report" narrative for a quiet run, which
  // would then overwrite the real answer the veto just saved.
  const quiet = skipped.includes("narrate");

  return {
    text,
    llmCalls,
    realCalls,
    stub,
    // Only interesting when the run was NOT wholly stubbed: in a real stub run
    // every node is a placeholder and saying so per-node is noise.
    answerStubbed: answerStubbed && !stub,
    nodes,
    quiet,
    quietVetoed,
    skipped,
    // Stub mode is the ABSENCE of a model, not an empty answer — flagging it
    // here would make every key-less run look like a defect. Nor is a QUIET
    // run empty: it reached a conclusion, and the conclusion was that nothing
    // warranted a person's attention. Calling that a fault would punish the
    // one outcome the proposal cap exists to encourage.
    emptyAnswer: !stub && !quiet && !text.trim(),
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
