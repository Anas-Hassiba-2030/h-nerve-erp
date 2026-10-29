// scripts/verify/gw-llm-check.ts — prove the brain reaches a model through
// gw-front. Read-only: it calls the gateway and prints what came back. It
// touches no database and prints no credential (only whether GW_API_KEY is set).
//
// Usage (PowerShell; GW_API_KEY must already be in the environment):
//   npx tsx --tsconfig tsconfig.scripts.json scripts/verify/gw-llm-check.ts
//
// Checks: plain completion (+ latency; first token is ~3 s), a streaming call
// with time-to-first-token, and one native tool-use turn.

import { llmConfig, callLlm, callLlmWithTools } from "@/lib/brain/llm";
import { stream } from "@/lib/brain/gwClient";
import { toAnthropicTools } from "@/lib/brain/tools";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

function line(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? GREEN + "PASS" : RED + "FAIL"}${OFF}  ${label}${detail ? `  ${DIM}${detail}${OFF}` : ""}`);
  return ok;
}

async function main() {
  const cfg = llmConfig();
  console.log(`\n${DIM}── gw-front LLM check ──────────────────────────${OFF}`);
  console.log(`${DIM}base ${OFF} ${cfg.baseUrl}\n${DIM}model${OFF} ${cfg.model}\n${DIM}key  ${OFF} ${cfg.enabled ? "set" : "NOT set"}\n`);
  if (!cfg.enabled) {
    console.log(`${RED}Set GW_API_KEY first.${OFF}\n`);
    process.exit(1);
  }

  let ok = true;
  const t0 = Date.now();
  const res = await callLlm(
    { system: "Answer in one short sentence.", user: "Name one risk of a rising F&B cost ratio.", maxTokens: 80 },
    () => "(stub)",
  );
  ok = line(!res.isStub, "plain completion returned a REAL answer", `${Date.now() - t0}ms${res.error ? ` error=${res.error}` : ""}`) && ok;
  console.log(`${DIM}  -> ${res.text.replace(/\s+/g, " ").slice(0, 200)}${OFF}\n`);

  const t1 = Date.now();
  let firstMs = -1;
  const sr = await stream(
    { messages: [{ role: "user", content: "Count from 1 to 5 in words." }], maxTokens: 60, model: cfg.model },
    () => {
      if (firstMs < 0) firstMs = Date.now() - t1;
    },
  );
  ok = line(sr.ok && sr.text.length > 0, "streaming call returned text", `first token ${firstMs}ms, total ${Date.now() - t1}ms`) && ok;

  const t2 = Date.now();
  const loop = await callLlmWithTools({
    system: "Use a tool when one fits the question.",
    messages: [{ role: "user", content: "Pull the facts for the dairy company this month." }],
    tools: toAnthropicTools().slice(0, 3),
    maxTokens: 300,
  });
  const usedTool = loop.content.some((c: { type?: string }) => c?.type === "tool_use");
  ok = line(!loop.isStub, "tool-use call returned a REAL response", `${Date.now() - t2}ms`) && ok;
  line(usedTool, "model emitted a tool_use block", usedTool ? "" : "prose only");

  console.log(`\n${ok ? GREEN + "gw-front is wired." : RED + "gw-front is NOT working."}${OFF}\n`);
  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => {
  console.error(`${RED}check threw${OFF}`, String((e as Error)?.message ?? e));
  process.exitCode = 1;
});
