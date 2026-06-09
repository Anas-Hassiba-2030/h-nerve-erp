// scripts/verify/brain-db-link.ts
//
// Brain ⇄ database link doctor. Run this against ANY database you intend to
// point the brain / brain-MCP at, BEFORE wiring it up, so you don't struggle:
//
//   npm run brain:doctor
//
// It is READ-ONLY (the brain is read-mostly) and needs NO API keys — it uses
// the local fallback embedder, so it never spends credit. It:
//   1. reports the configured DB target + key presence (no secrets printed),
//   2. proves the Prisma client connects (and explains the fix if it can't),
//   3. counts the tables the brain reads (so you know what's seeded),
//   4. runs every read tool end-to-end and shows what came back,
//   5. exits non-zero if the link is broken, zero if the brain can read the DB.

import { prisma } from "@/lib/db/db";
import { runTool } from "@/lib/brain/tools";

// Load .env so the Configuration section shows the real DATABASE_URL. Prisma
// loads .env lazily on client init, but this script reads process.env for
// display first — without this it would print "(unset)" even when healthy.
try {
  (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
} catch {
  /* no .env file — fine, env may be set inline */
}

const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

function maskUrl(url: string | undefined): string {
  if (!url) return "(unset)";
  if (url.startsWith("file:")) return `${url}  → SQLite (local dev)`;
  return url.replace(/(:\/\/)[^@]*@/, "$1***@").replace(/(\?|&).*$/, "$1…");
}

function providerOf(url: string | undefined): "sqlite" | "postgresql" | "unknown" {
  if (!url) return "unknown";
  if (url.startsWith("file:")) return "sqlite";
  if (/^postgres(ql)?:\/\//.test(url)) return "postgresql";
  return "unknown";
}

async function main() {
  let hardFail = false;
  const warnings: string[] = [];

  console.log("\n" + "═".repeat(64));
  console.log("  BRAIN ⇄ DATABASE LINK DOCTOR");
  console.log("═".repeat(64) + "\n");

  // 1) Target + keys ---------------------------------------------------------
  const url = process.env.DATABASE_URL;
  const urlProvider = providerOf(url);
  console.log("1. Configuration");
  console.log(`   DATABASE_URL : ${maskUrl(url)}`);
  console.log(`   URL provider : ${urlProvider}`);
  const keys = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "VOYAGE_API_KEY"].filter((k) => process.env[k]);
  console.log(`   Keys set     : ${keys.length ? keys.join(", ") : DIM("none → STUB brain + local-fallback embedder (zero cost)")}`);
  const mcpScoped = process.env.H_NERVE_MCP_WORKSPACE && process.env.H_NERVE_MCP_TENANT;
  console.log(
    `   MCP scope    : ${
      mcpScoped
        ? G("scoped (both env vars set)")
        : process.env.H_NERVE_MCP_ALLOW_UNSCOPED === "1"
        ? Y("unscoped (ALLOW_UNSCOPED=1)")
        : DIM("n/a for this doctor; the stdio server needs WORKSPACE+TENANT or ALLOW_UNSCOPED=1")
    }`,
  );
  console.log();

  // 2) Connect ---------------------------------------------------------------
  console.log("2. Connectivity");
  try {
    const n = await prisma.aIInsight.count();
    console.log(`   ${G("✓ connected")} — read AIInsight (${n} rows)\n`);
  } catch (e) {
    hardFail = true;
    const msg = String((e as Error)?.message ?? e).split("\n")[0];
    console.log(`   ${R("✗ CONNECT FAILED")}: ${msg}`);
    if (/provider|sqlite|postgres|Error validating datasource|the URL must start/i.test(msg)) {
      console.log(
        `   ${Y("HINT")}: schema datasource provider and DATABASE_URL must match.\n` +
          `         Local SQLite  → set provider="sqlite" in prisma/schema/schema.prisma + DATABASE_URL="file:./dev.db", then \`npx prisma generate && npm run db:push\`.\n` +
          `         Postgres prod → keep provider="postgresql" + DATABASE_URL=postgres://…, then \`npx prisma generate\`.`,
      );
    } else {
      console.log(`   ${Y("HINT")}: is the DB reachable? Did you run \`npx prisma generate\` after changing the schema?`);
    }
    console.log();
    console.log(R("  Link is BROKEN — fix the above before wiring the brain.\n"));
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }

  // 3) What's seeded ---------------------------------------------------------
  console.log("3. Data the brain reads");
  const counts: Record<string, number> = {};
  const countOne = async (label: string, fn: () => Promise<number>) => {
    try {
      counts[label] = await fn();
    } catch {
      counts[label] = -1;
    }
  };
  await Promise.all([
    countOne("AIInsight", () => prisma.aIInsight.count()),
    countOne("Document", () => prisma.document.count()),
    countOne("Memory", () => prisma.memory.count()),
    countOne("BrainNode (graph)", () => prisma.brainNode.count()),
    countOne("Hotel", () => prisma.hotel.count()),
    countOne("Booking", () => prisma.booking.count()),
    countOne("DairyBatch", () => prisma.dairyBatch.count()),
    countOne("Farm", () => prisma.farm.count()),
  ]);
  for (const [k, v] of Object.entries(counts)) {
    const tag = v < 0 ? R("error") : v === 0 ? Y("empty") : G(String(v));
    console.log(`   ${k.padEnd(20)} ${tag}`);
  }
  if ((counts["BrainNode (graph)"] ?? 0) === 0)
    warnings.push("Graph is empty → Graph RAG returns nothing. Seed it: `npx tsx scripts/seed/seed-brain-local.ts`.");
  if ((counts["Document"] ?? 0) === 0)
    warnings.push("No documents → retrieveDocuments returns nothing. Upload docs or run the demo-doc seed.");
  if ((counts["Memory"] ?? 0) === 0)
    warnings.push("No memories → recallMemory returns nothing. Seed: `npx tsx scripts/seed/seed-brain-local.ts`.");
  console.log();

  // 4) Read tools end-to-end -------------------------------------------------
  console.log("4. Read tools (real DB path, local embedder)");
  const probes: Array<{ name: string; input: unknown; summarize: (o: any) => string }> = [
    { name: "pullFacts", input: {}, summarize: (o) => `${o.insights?.length ?? 0} insights, ${o.plans?.length ?? 0} plans, hotels.occupiedNow=${o.hotels?.occupiedNow}` },
    { name: "retrieveDocuments", input: { query: "contract expiry risk" }, summarize: (o) => `quality=${o.quality}, ${o.documents?.length ?? 0} docs (groundingConfidence=${o.groundingConfidence})` },
    { name: "recallMemory", input: { situation: "milk near expiry" }, summarize: (o) => `${o.memories?.length ?? 0} memories` },
    { name: "causalSubgraph", input: { question: "how does arena occupancy affect dairy demand" }, summarize: (o) => `${o.nodes?.length ?? 0} nodes, ${o.links?.length ?? 0} links` },
  ];
  let firstNodeId: string | null = null;
  for (const p of probes) {
    try {
      const out: any = await runTool(p.name, p.input);
      if (p.name === "causalSubgraph") firstNodeId = out?.nodes?.[0]?.id ?? null;
      console.log(`   ${G("✓")} ${p.name.padEnd(18)} ${DIM(p.summarize(out))}`);
    } catch (e) {
      hardFail = true;
      console.log(`   ${R("✗")} ${p.name.padEnd(18)} ${R(String((e as Error)?.message ?? e).split("\n")[0])}`);
    }
  }
  // simulate needs a real nodeId (there is no node enumerator), so probe it
  // with a node surfaced by causalSubgraph — closes the doctor's blind spot.
  try {
    const simIn = firstNodeId ? { nodeId: firstNodeId, delta: 0.1 } : { nodeId: "__none__", delta: 0.1 };
    const sim: any = await runTool("simulate", simIn);
    const note = firstNodeId ? `${sim.impacts?.length ?? 0} impacts from ${firstNodeId}` : "no graph node to seed (empty graph)";
    console.log(`   ${G("✓")} ${"simulate".padEnd(18)} ${DIM(note)}`);
  } catch (e) {
    hardFail = true;
    console.log(`   ${R("✗")} ${"simulate".padEnd(18)} ${R(String((e as Error)?.message ?? e).split("\n")[0])}`);
  }
  console.log(DIM("   (councilDebate + narrate WRITE on each call, so they are not probed read-only)"));
  console.log();

  // 5) Verdict ---------------------------------------------------------------
  console.log("─".repeat(64));
  if (warnings.length) {
    console.log(Y("Notes (not failures — the brain degrades gracefully):"));
    for (const w of warnings) console.log(`   • ${w}`);
    console.log();
  }
  if (hardFail) {
    console.log(R("VERDICT: a read tool threw — the link is not clean. See above.\n"));
  } else {
    console.log(G("VERDICT: brain can read this database. Link is good.\n"));
  }
  await prisma.$disconnect().catch(() => {});
  process.exit(hardFail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(R("doctor crashed:"), e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
