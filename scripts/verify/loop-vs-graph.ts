// scripts/verify/loop-vs-graph.ts
//
// The same question, the same model, two engines — side by side.
//
// This exists because the argument for graph orchestration is easy to assert
// and easy to doubt. The claim: a small local model cannot drive the tool LOOP,
// because the loop only advances when the model emits `tool_use`, and small
// models routinely answer in prose instead. A GRAPH does not depend on that —
// our code fetches the facts and the model only reasons over them.
//
// Run it and read the "tools used" line of each block. That one line is the
// whole argument, or its refutation.
//
//   LOCAL_LLM_BASE_URL="http://127.0.0.1:11434" \
//   LOCAL_LLM_MODEL="qwen2.5-coder:3b" \
//   DATABASE_URL="file:<abs path to a LOCAL dev db>" \
//   npx tsx --tsconfig tsconfig.scripts.json scripts/verify/loop-vs-graph.ts
//
// Read-only against domain data. Writes nothing at all — it calls the executor
// directly rather than through the driver, so not even a ledger row is created.
// Never point it at production.

import { makePrismaClient } from "../_prisma";

async function main() {
  const prisma = makePrismaClient();
  const { llmConfig } = await import("../../src/lib/brain/llm");
  const { runToolLoop } = await import("../../src/lib/brain/orchestrator");
  const { runFlow } = await import("../../src/lib/voac/flowGraph.live");
  const { flowSpecFor } = await import("../../src/lib/voac/flowGraph");
  const { getRole } = await import("../../src/lib/voac/roles");

  const cfg = llmConfig();
  console.log(`\nprovider=${cfg.provider}  model=${cfg.model}`);
  if (!cfg.enabled) {
    console.log("\nNo model configured — both engines would return stubs and prove nothing.");
    console.log("Set LOCAL_LLM_BASE_URL (or an API key) and run again.");
    return;
  }

  const objective =
    "How many hotel rooms are occupied right now, and how many dairy batches are near expiry?";
  const role = getRole("dairy-yield-controller")!;
  const system = "You answer with the figures you are given. Never invent a number.";

  console.log(`\nobjective: ${objective}\n${"=".repeat(64)}`);

  // ---- 1. THE LOOP -------------------------------------------------------
  const t0 = Date.now();
  const loop = await runToolLoop({ system, question: objective, priorTurns: [] });
  const loopMs = Date.now() - t0;
  console.log("\nLOOP — src/lib/brain/orchestrator.ts");
  console.log(`  rounds     : ${loop.rounds}`);
  console.log(`  tools used : ${loop.toolCalls.map((c) => c.name).join(", ") || "NONE — the model never emitted tool_use"}`);
  console.log(`  elapsed    : ${(loopMs / 1000).toFixed(1)}s`);
  console.log(`  answer     : ${String(loop.text).replace(/\s+/g, " ").slice(0, 240)}`);

  // ---- 2. THE GRAPH ------------------------------------------------------
  const spec = flowSpecFor(role.defaultTopology, role.tools)!;
  const t1 = Date.now();
  const flow = await runFlow({ spec, objective, system, locale: "en" });
  const flowMs = Date.now() - t1;
  const tools = flow.nodes.filter((n) => n.node.kind === "tool");
  console.log(`\nGRAPH — src/lib/voac/flowGraph.live.ts (topology "${spec.topology}")`);
  console.log(`  llm calls  : ${flow.llmCalls}`);
  console.log(`  tools used : ${tools.map((n) => `${n.node.tool}${n.ok ? "" : " (FAILED)"}`).join(", ") || "none"}`);
  console.log(`  elapsed    : ${(flowMs / 1000).toFixed(1)}s`);
  console.log(`  answer     : ${String(flow.text).replace(/\s+/g, " ").slice(0, 240)}`);

  // ---- 3. The figures they were supposed to reach ------------------------
  // Computed the SAME way pullFacts does, or the comparison is against a number
  // the model was never shown — which would make a correct answer look wrong
  // (or, worse, a wrong one look right).
  const rooms = await prisma.hotel.aggregate({ _sum: { totalRooms: true } });
  const totalRooms = rooms._sum.totalRooms ?? 0;
  const bookings = await prisma.booking.count({
    where: { status: { in: ["CONFIRMED", "ACTIVE", "CHECKED_IN"] } },
  });
  const near = await prisma.dairyBatch.count({
    where: { expiryDate: { lte: new Date(Date.now() + 5 * 864e5), gte: new Date() } },
  });
  console.log(`\n${"=".repeat(64)}`);
  console.log(`ground truth: occupiedNow=${Math.min(bookings, totalRooms)} (of ${totalRooms} rooms)  nearExpiry=${near}`);
  console.log("An engine that reached no tool cannot have reached these numbers except by luck.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("loop-vs-graph failed:", e);
    process.exit(1);
  });
