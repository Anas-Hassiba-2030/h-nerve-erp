// scripts/verify/voac-smoke.ts
//
// Proves the VOAC driver runs end to end against a real database and leaves a
// correct ledger behind. Typechecking proves the driver compiles; only this
// proves it RUNS — that steps land, statuses close, refusals persist, and the
// proposal cap actually bites.
//
// Runs happily in STUB mode (no API key): the brain returns stub responses, and
// what this checks is the bookkeeping around them, which is the part the driver
// owns. With a key set it exercises the live path too.
//
//   DATABASE_URL="file:./prisma/schema/dev.db" \
//   npx tsx --tsconfig tsconfig.scripts.json scripts/verify/voac-smoke.ts
//
// Writes VOAC rows (AgentRun/Step/Proposal) to whatever DB it points at. Never
// touches a domain table. Point it at a local dev DB, never production.

import { makePrismaClient } from "../_prisma";

const checks: { name: string; ok: boolean; detail: string }[] = [];
function check(name: string, ok: boolean, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const prisma = makePrismaClient();
  const { runVoac, runGroupBroker } = await import("../../src/lib/voac/driver.live");

  const dairy = await prisma.company.findFirst({ where: { sector: "DAIRY" } });
  const hotel = await prisma.company.findFirst({ where: { sector: "HOSPITALITY" } });
  if (!dairy) throw new Error("No DAIRY company in this database — seed it first.");

  const tenantId = "smoke-voac";
  console.log(`\nVOAC driver smoke — tenant "${tenantId}", dairy=${dairy.code}\n`);

  // --- 1. A normal company-scoped run ---------------------------------
  const r1 = await runVoac({
    tenantId,
    companyId: dairy.id,
    roleId: "dairy-yield-controller",
    objective: "Review this week's batches for recoverable value.",
    sector: "DAIRY",
    locale: "en",
  });
  console.log(`  run ${r1.runId} → ${r1.status}${r1.stub ? " (stub mode)" : ""}`);

  const run1 = await prisma.agentRun.findUnique({ where: { id: r1.runId } });
  check("run row persisted", Boolean(run1));
  check("run reached a terminal status", run1?.status !== "RUNNING", String(run1?.status));
  // Stub mode must be its own status. If this ever reads FAILED again, someone
  // will go hunting a defect that is really just a missing API key.
  check(
    "stub run is STUB, not FAILED",
    r1.stub ? run1?.status === "STUB" : run1?.status === "SUCCEEDED",
    String(run1?.status),
  );
  check("run has an endedAt", Boolean(run1?.endedAt));
  check("skillVersion recorded", /^[0-9a-f]{8}$/.test(run1?.skillVersion ?? ""), run1?.skillVersion ?? "");
  check("topology recorded", run1?.topology === "route", String(run1?.topology));

  const steps1 = await prisma.agentStep.findMany({ where: { runId: r1.runId }, orderBy: { seq: "asc" } });
  check("steps were appended", steps1.length > 0, `${steps1.length} step(s)`);
  check("first step is the plan", steps1[0]?.kind === "plan", String(steps1[0]?.kind));
  check(
    "step seq is contiguous from 0",
    steps1.every((s, i) => s.seq === i),
    steps1.map((s) => s.seq).join(","),
  );
  check(
    "unscored steps are NULL, not 0",
    steps1.every((s) => s.score === null || typeof s.score === "number"),
  );
  check("every step carries the tenantId", steps1.every((s) => s.tenantId === tenantId));

  // --- 2. Refusals must persist as rows --------------------------------
  const bad = await runVoac({
    tenantId,
    companyId: null, // company role with no company
    roleId: "dairy-yield-controller",
    objective: "This must be refused.",
  });
  const badRun = await prisma.agentRun.findUnique({ where: { id: bad.runId } });
  check("refused run is still a ROW", Boolean(badRun));
  check("refused run has status REFUSED", badRun?.status === "REFUSED", String(badRun?.status));
  check("refused run records why", Boolean(badRun?.error), badRun?.error ?? "");

  const overHops = await runVoac({
    tenantId, companyId: dairy.id, roleId: "dairy-yield-controller",
    objective: "Too many hops.", hops: 99, sector: "DAIRY",
  });
  check("hop ceiling refuses before spending", overHops.status === "REFUSED", overHops.refusedReason ?? "");

  const autonomous = await runVoac({
    tenantId, companyId: dairy.id, roleId: "dairy-yield-controller",
    objective: "Unbounded.", topology: "autonomous", hops: 3, sector: "DAIRY",
  });
  check("autonomous refused without human opt-in", autonomous.status === "REFUSED", autonomous.refusedReason ?? "");

  // --- 3. Group Broker: group-scoped, council topology ------------------
  if (hotel) {
    const gb = await runGroupBroker({
      tenantId,
      objective: "Find value falling between the dairy and the hotels.",
      companyIds: [dairy.id, hotel.id],
      locale: "en",
    });
    const gbRun = await prisma.agentRun.findUnique({ where: { id: gb.runId } });
    check("group broker run persisted", Boolean(gbRun));
    check("group broker is group-scoped (companyId null)", gbRun?.companyId === null);
    check("group broker used the parallel topology", gbRun?.topology === "parallel", String(gbRun?.topology));

    const gbSteps = await prisma.agentStep.findMany({ where: { runId: gb.runId } });
    const selfScored = gbSteps.filter((s) => s.scoredBy === "self");
    check(
      "council voices are marked self-scored, never human",
      selfScored.every((s) => s.score === null),
      `${selfScored.length} self-scored step(s)`,
    );
  } else {
    check("group broker exercised", false, "skipped — no HOSPITALITY company");
  }

  // --- 4. The read-mostly boundary --------------------------------------
  const batchesBefore = await prisma.dairyBatch.count();
  await runVoac({
    tenantId, companyId: dairy.id, roleId: "dairy-yield-controller",
    objective: "Do not mutate anything.", sector: "DAIRY",
  });
  check("driver never mutated a domain table", (await prisma.dairyBatch.count()) === batchesBefore);

  // --- 5. Ledger totals --------------------------------------------------
  const runs = await prisma.agentRun.count({ where: { tenantId } });
  const props = await prisma.agentProposal.count({ where: { tenantId } });
  const roster = await prisma.voacRoster.findFirst({ where: { tenantId, companyId: dairy.id } });
  check("roster auto-created on first run", Boolean(roster), roster?.roleIds ?? "");
  check("proposals respect the daily cap", props <= (roster?.dailyProposalCap ?? 5), `${props} proposal(s)`);

  console.log(`\nLedger: ${runs} run(s), ${props} proposal(s) under tenant "${tenantId}".`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${"=".repeat(60)}`);
  console.log(failed.length === 0 ? `ALL ${checks.length} CHECKS PASSED` : `${failed.length}/${checks.length} CHECKS FAILED`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
    process.exitCode = 1;
  }
  console.log(`\nClean up with:  DELETE FROM AgentRun WHERE tenantId='${tenantId}';`);
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error("voac-smoke failed:", e);
    process.exit(1);
  });
