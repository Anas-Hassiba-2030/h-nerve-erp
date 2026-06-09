// scripts/verify/brain-mcp-smoke.ts
//
// End-to-end smoke for the stdio MCP server: spawns `brain:mcp` as a real
// subprocess and drives it with a real MCP client over the wire — proving the
// transport, tool registration, and DB read path all work together.
//
//   npm run brain:mcp:smoke
//
// Read-only, no API keys (runs unscoped against whatever DATABASE_URL points
// at). Exits 0 on success, 1 on any failure.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { prisma } from "@/lib/db/db";
import { COMPANY_CODE_TO_TENANT_SLUG } from "@/lib/tenancy/tenancy";

const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

// Resolve the scope env for the spawned server. Default: unscoped (simplest
// smoke). With `--scoped`, look up a real Company id + its tenant slug from the
// seeded DB so we prove the PRODUCTION posture (scoped boot serving real data),
// exercising the env-fallback scoping path end-to-end.
async function resolveScopeEnv(scoped: boolean): Promise<Record<string, string>> {
  if (!scoped) return { H_NERVE_MCP_ALLOW_UNSCOPED: "1" };
  const company = await prisma.company.findFirst({ select: { id: true, code: true } });
  if (!company) {
    console.log("  (no Company rows — falling back to unscoped)");
    return { H_NERVE_MCP_ALLOW_UNSCOPED: "1" };
  }
  const tenant = COMPANY_CODE_TO_TENANT_SLUG[company.code] ?? "hourani-hotels";
  console.log(`  scope → workspace=${company.id} tenant=${tenant}`);
  return { H_NERVE_MCP_WORKSPACE: company.id, H_NERVE_MCP_TENANT: tenant };
}

async function main() {
  const scoped = process.argv.includes("--scoped");
  console.log(`\n  BRAIN-MCP STDIO SMOKE (${scoped ? "SCOPED" : "unscoped"})\n` + "─".repeat(40));
  const scopeEnv = await resolveScopeEnv(scoped);

  const transport = new StdioClientTransport({
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["tsx", "scripts/ops/brain-mcp.ts"],
    // Inherit the parent env (DATABASE_URL, PATH); scope per --scoped.
    env: { ...process.env, ...scopeEnv } as Record<string, string>,
    stderr: "inherit",
  });

  const client = new Client({ name: "brain-mcp-smoke", version: "1.0.0" }, { capabilities: {} });

  await client.connect(transport);
  console.log(`  ${G("✓ connected")} to the stdio server`);

  // 1) Tools advertised over the wire
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  const EXPECTED = ["causalSubgraph", "councilDebate", "narrate", "pullFacts", "recallMemory", "retrieveDocuments", "simulate"];
  const ok7 = EXPECTED.every((n) => names.includes(n)) && names.length === 7;
  console.log(`  ${ok7 ? G("✓") : R("✗")} listTools → ${tools.length} tools ${DIM(names.join(", "))}`);

  // 2) Call a real read tool over the protocol → must return live DB data
  const res: any = await client.callTool({ name: "pullFacts", arguments: {} });
  const text = res?.content?.[0]?.text ?? "";
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* leave null */
  }
  const factsOk = parsed && Array.isArray(parsed.insights) && parsed.hotels;
  console.log(
    `  ${factsOk ? G("✓") : R("✗")} callTool pullFacts → ${
      factsOk ? `${parsed.insights.length} insights, hotels.occupiedNow=${parsed.hotels.occupiedNow}` : R("unexpected payload: " + text.slice(0, 120))
    }`,
  );

  // 3) A retrieval tool (exercises the embedder + CRAG + ragGuard over the wire)
  const docRes: any = await client.callTool({ name: "retrieveDocuments", arguments: { query: "contract expiry risk" } });
  const docParsed = JSON.parse(docRes?.content?.[0]?.text ?? "{}");
  const docsOk = typeof docParsed.quality === "string" && Array.isArray(docParsed.documents);
  console.log(`  ${docsOk ? G("✓") : R("✗")} callTool retrieveDocuments → quality=${docParsed.quality}, ${docParsed.documents?.length ?? 0} docs`);

  await client.close();
  const allOk = ok7 && factsOk && docsOk;
  console.log("─".repeat(40));
  console.log(allOk ? G("  VERDICT: MCP transport + DB read path work over the wire.\n") : R("  VERDICT: smoke FAILED — see above.\n"));
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(R("smoke crashed:"), e);
  process.exit(1);
});
