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
  // A graphed run's first step is its first STAGE. It used to be a bookkeeping
  // "plan" step that the driver wrote before branching — removed, because it
  // carried no stage prefix and so drew a phantom lane on the run page. Loop
  // and council runs still open with it.
  check(
    "the first step is the first thing that ran",
    steps1[0]?.kind === "reason" || steps1[0]?.kind === "plan",
    String(steps1[0]?.kind),
  );
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

  // A refusal's entire point is to prove nothing was spent. closeRun falls back
  // to the STEP COUNT when llmCalls is omitted, so the refusal step itself was
  // being stamped as one LLM call on exactly that path.
  const refusedRuns = await prisma.agentRun.findMany({
    where: { tenantId, status: { in: ["REFUSED", "BUDGET_EXHAUSTED"] } },
  });
  check(
    "a refused run records zero LLM calls",
    refusedRuns.every((r) => r.llmCalls === 0),
    refusedRuns.map((r) => `${r.status}:${r.llmCalls}`).join(" "),
  );

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

  // --- 5. The graph path actually executed as a graph --------------------
  // route/chain/evaluate no longer fall into the generic tool loop. Proving
  // that needs the LEDGER, not the types: a graph that quietly degraded back to
  // one loop call would still typecheck, still succeed, and still look fine.
  const { flowSpecFor, llmNodeCount } = await import("../../src/lib/voac/flowGraph");
  const { traceLanes } = await import("../../src/lib/voac/present");
  const { getRole } = await import("../../src/lib/voac/roles");

  const graphRole = getRole("dairy-yield-controller")!;
  const spec = flowSpecFor(graphRole.defaultTopology, graphRole.tools);
  check("route topology has a flow spec", Boolean(spec), graphRole.defaultTopology);

  const gsteps = await prisma.agentStep.findMany({
    where: { runId: r1.runId }, orderBy: { seq: "asc" },
  });
  const staged = gsteps.filter((s) => /^\d+·[a-z]+ — /.test(s.input));
  check("graph nodes stamped their stage", staged.length > 0, `${staged.length}/${gsteps.length} staged`);

  const lanes = traceLanes(gsteps.map((s) => ({
    id: s.id, seq: s.seq, kind: s.kind, roleId: s.roleId,
    input: s.input, output: s.output, error: s.error, latencyMs: s.latencyMs,
  })));
  check(
    "the trace redraws as the graph's stages",
    lanes.some((l) => l.id === "gather") && lanes.some((l) => l.id === "narrate"),
    lanes.map((l) => l.id).join(" → "),
  );
  // /voac/map and /voac/<runId> exist to prove each other. A bookkeeping step
  // with no stage prefix used to add a phantom lane, so the trace drew one more
  // lane than the map drew stages — and on chain/evaluate two of them said
  // "Plan".
  check(
    "the trace draws exactly as many lanes as the map draws stages",
    lanes.length === spec!.stages.length,
    `${lanes.length} lanes vs ${spec!.stages.length} stages`,
  );
  const gather = lanes.find((l) => l.id === "gather");
  check(
    "the gather stage really fanned out",
    Boolean(gather && gather.steps.length > 1),
    `${gather?.steps.length ?? 0} tool node(s) in one lane`,
  );
  check(
    "a reasoning step is recorded as `reason`, not mislabelled `plan`",
    gsteps.some((s) => s.kind === "reason"),
    gsteps.map((s) => s.kind).join(","),
  );
  // Stub mode makes no real calls, so only assert the count on the live path.
  check(
    "llmCalls matches what the graph declared",
    r1.stub || run1?.llmCalls === llmNodeCount(spec!),
    `${run1?.llmCalls} vs planned ${spec ? llmNodeCount(spec) : "?"}`,
  );

  // --- 6. The conditional edges ------------------------------------------
  // `evaluate` is a topology NO role defaults to, so nothing else in this
  // script would ever execute its guarded stages. Requested explicitly here,
  // because an unexercised branch is where a guard silently inverts.
  const ev = await runVoac({
    tenantId, companyId: dairy.id, roleId: "dairy-yield-controller",
    objective: "Grade your own figures on this week's batches.",
    topology: "evaluate", sector: "DAIRY", locale: "en",
  });
  check("an evaluate run is allowed by the hop ceiling", ev.status !== "REFUSED", ev.refusedReason ?? String(ev.status));

  const evSteps = await prisma.agentStep.findMany({
    where: { runId: ev.runId }, orderBy: { seq: "asc" },
  });
  const evLanes = traceLanes(evSteps.map((s) => ({
    id: s.id, seq: s.seq, kind: s.kind, roleId: s.roleId,
    input: s.input, output: s.output, error: s.error, latencyMs: s.latencyMs,
  })));
  const laneIds = evLanes.map((l) => l.id);
  check("evaluate grades before it writes", laneIds.includes("grade"), laneIds.join(" → "));
  // The revise cycle fires only when the draft's figures did not ground. In
  // stub mode the placeholder text carries a digit that no fact supports, so
  // this SHOULD fire — if it stops firing, the guard has inverted.
  check(
    "the critic cycle ran, and ran once",
    evLanes.filter((l) => l.id === "revise").length === 1,
    laneIds.join(" → "),
  );
  check(
    "each attempt drew its OWN lane — no two iterations merged",
    evLanes.every((l) => l.id === "gather" || !l.parallel),
    evLanes.filter((l) => l.parallel).map((l) => l.id).join(",") || "(only gather is parallel)",
  );
  check(
    "the run never exceeded the ceiling it declared",
    (await prisma.agentRun.findUnique({ where: { id: ev.runId } }))!.llmCalls <=
      llmNodeCount(flowSpecFor("evaluate", graphRole.tools)!),
    `${(await prisma.agentRun.findUnique({ where: { id: ev.runId } }))!.llmCalls} <= ${llmNodeCount(flowSpecFor("evaluate", graphRole.tools)!)}`,
  );

  // --- 7. Ledger totals --------------------------------------------------
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
