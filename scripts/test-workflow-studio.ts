// scripts/test-workflow-studio.ts — Phase Pre-pitch SWEEP-5.
// Bypasses requireUser by calling the underlying lib helpers directly.
// Confirms the studio lifecycle works:
//   1. Seed example workflows (the canonical templates)
//   2. Create a fresh workflow via prisma directly
//   3. Add a trigger + condition + action node
//   4. Wire two edges
//   5. Run the workflow in "test" mode
//   6. Inspect the trace

import { PrismaClient } from "@prisma/client";
import { runWorkflow } from "../lib/workflows/runtime";
import { seedWorkflows } from "../lib/workflows/seed";

const prisma = new PrismaClient();

async function main() {
  console.log("Workflow studio smoke test\n");

  // 1. Seed example workflows.
  const seed = await seedWorkflows();
  console.log(`1) seedWorkflows → wrote ${seed.written} workflow(s) in ${seed.durationMs}ms`);
  const seeded = await prisma.workflow.findMany({ select: { id: true, name: true, status: true } });
  console.log(`   total workflows in DB: ${seeded.length}`);
  for (const w of seeded.slice(0, 5)) console.log(`   - ${w.name} (${w.status})`);

  // 2. Create a fresh workflow.
  const wf = await prisma.workflow.create({
    data: { name: "SMOKE TEST · low-stock email", status: "DRAFT" },
  });
  console.log(`\n2) created workflow ${wf.id}`);

  // 3. Add nodes.
  const trig = await prisma.workflowNode.create({
    data: { workflowId: wf.id, kind: "trigger", templateKey: "dairy.expiry_within", posX: 100, posY: 100, configJson: JSON.stringify({ days: 3 }) },
  });
  const cond = await prisma.workflowNode.create({
    data: { workflowId: wf.id, kind: "condition", templateKey: "filter.severity_at_least", posX: 320, posY: 100, configJson: JSON.stringify({ severity: "WARNING" }) },
  });
  const act = await prisma.workflowNode.create({
    data: { workflowId: wf.id, kind: "action", templateKey: "action.notify_email", posX: 540, posY: 100, configJson: JSON.stringify({ to: "manager-maha@hourani.jo" }) },
  });
  console.log(`3) added nodes: trigger=${trig.templateKey} condition=${cond.templateKey} action=${act.templateKey}`);

  // 4. Wire edges.
  const e1 = await prisma.workflowEdge.create({
    data: { workflowId: wf.id, fromNodeId: trig.id, toNodeId: cond.id },
  });
  const e2 = await prisma.workflowEdge.create({
    data: { workflowId: wf.id, fromNodeId: cond.id, toNodeId: act.id },
  });
  console.log(`4) wired ${[e1, e2].length} edges`);

  // 5. Test-run.
  try {
    const result = await runWorkflow(wf.id, "test");
    console.log(`5) runWorkflow returned: status=${result.status} runId=${result.runId} duration=${result.durationMs}ms`);
    console.log(`   trace events: ${result.trace.length}`);
    for (const t of result.trace) {
      console.log(`   - [${t.kind}:${t.templateKey}] ${t.status} — ${t.message}`);
    }
  } catch (e) {
    console.error("5) runWorkflow THREW:", e instanceof Error ? e.message : e);
  }

  // 6. Cleanup the smoke-test workflow so re-runs are idempotent.
  await prisma.workflow.delete({ where: { id: wf.id } });
  console.log("\n6) cleanup OK");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
