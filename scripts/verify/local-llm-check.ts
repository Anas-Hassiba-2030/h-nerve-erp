// scripts/verify/local-llm-check.ts — prove the brain can run on a model
// hosted on THIS machine, with no API key and no network egress.
//
// Read-only: it calls the model and prints what came back. It touches no
// database, creates no rows, and spends nothing.
//
// Usage (PowerShell):
//   $env:LOCAL_LLM_BASE_URL="http://localhost:11434"
//   $env:LOCAL_LLM_MODEL="qwen2.5-coder:3b"
//   npx tsx --tsconfig tsconfig.scripts.json scripts/verify/local-llm-check.ts
//
// A PASS here means the provider seam works. It does NOT mean a 3B model is
// good enough for the council — that is a quality judgement the operator makes
// by reading the output below.

import { llmConfig, callLlm, callLlmWithTools, localChatUrl } from "@/lib/brain/llm";
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
  console.log(`\n${DIM}── local LLM check ─────────────────────────────${OFF}`);

  let ok = true;
  ok = line(cfg.provider === "local", "provider resolves to 'local'", `got "${cfg.provider}"`) && ok;
  if (cfg.provider !== "local") {
    console.log(
      `\n${RED}Set LOCAL_LLM_BASE_URL first.${OFF} e.g. $env:LOCAL_LLM_BASE_URL="http://localhost:11434"\n`,
    );
    process.exit(1);
  }

  const url = localChatUrl(process.env.LOCAL_LLM_BASE_URL || process.env.OLLAMA_HOST || "");
  console.log(`${DIM}endpoint${OFF} ${url}\n${DIM}model   ${OFF} ${cfg.model}\n`);

  // 1 — plain completion.
  const t0 = Date.now();
  const res = await callLlm(
    {
      system: "You are a terse financial controller. Answer in one sentence.",
      user: "Occupancy rose 4% while F&B cost rose 9%. What is the one thing to check first?",
      maxTokens: 120,
    },
    () => "(stub)",
  );
  ok = line(!res.isStub, "plain completion returned a REAL answer", `${Date.now() - t0}ms`) && ok;
  console.log(`${DIM}  → ${res.text.replace(/\s+/g, " ").slice(0, 200)}${OFF}\n`);

  // 2 — tool calling, which is what the orchestrator loop actually needs.
  // A model that cannot call tools still works for the council (prose), so a
  // failure here is a capability note, not a broken seam.
  const t1 = Date.now();
  const tools = toAnthropicTools().slice(0, 3);
  const loop = await callLlmWithTools({
    system: "Use a tool when one fits the question.",
    messages: [{ role: "user", content: "Pull the facts for the dairy company this month." }],
    tools,
    maxTokens: 300,
  });
  const usedTool = loop.content.some((c: { type?: string }) => c?.type === "tool_use");
  line(!loop.isStub, "tool-loop call returned a REAL response", `${Date.now() - t1}ms`);
  line(usedTool, "model emitted a tool_use block", usedTool ? "" : "prose only — council-capable, loop-limited");

  console.log(
    `\n${ok ? GREEN + "Local inference is wired." : RED + "Local inference is NOT working."}${OFF}` +
      `\n${DIM}Note: production is a Cloudflare Worker and cannot reach this machine.` +
      ` Local models serve dev and self-hosted runs.${OFF}\n`,
  );
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(`${RED}check threw${OFF}`, e);
  process.exit(1);
});
