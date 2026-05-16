"use server";

// Wave W4 — the workspace ERP becomes functional. Each action is a
// guarded server action: requireRole("MANAGER") → mutate ONE field on
// a workspace-scoped row → write an ActivityLog audit row →
// revalidatePath. No schema changes; every column already exists.
//
// Invariant (CLAUDE.md): the brain proposes, humans commit. W6 makes
// that literal — only MANAGER+ may commit these mutations. STAFF get a
// read-only workspace (the action forms don't render for them either —
// defense in depth: server gate here, UI gate in the pages).

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { prisma, prismaUnscoped } from "@/lib/db";

const BATCH_CHAIN = ["IN_PRODUCTION", "READY", "SHIPPED", "RETAIL"];
const STAGE_CHAIN = ["IDEA", "EVALUATION", "APPROVED", "IN_PROGRESS", "LIVE"];

async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  summary: string,
  summaryEn: string,
  meta: Record<string, unknown>,
) {
  try {
    await prismaUnscoped.activityLog.create({
      data: {
        action,
        entity,
        entityId,
        actorId,
        summary,
        summaryEn,
        meta: JSON.stringify(meta),
      },
    });
  } catch {
    /* audit must never block the mutation */
  }
}

/** Advance a dairy batch one step along the production chain. */
export async function advanceBatchStatus(formData: FormData): Promise<void> {
  const user = await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Scoped read — the middleware guarantees this batch belongs to the
  // active workspace, so a user can't advance another company's batch.
  const batch = await prisma.dairyBatch.findUnique({ where: { id } });
  if (!batch) return;

  const idx = BATCH_CHAIN.indexOf(batch.status);
  if (idx < 0 || idx >= BATCH_CHAIN.length - 1) return; // terminal/unknown
  const next = BATCH_CHAIN[idx + 1];

  await prisma.dairyBatch.update({
    where: { id },
    data: { status: next },
  });
  await audit(
    user.id,
    "UPDATE",
    "DAIRY",
    id,
    `تقديم الدفعة ${batch.batchNumber}: ${batch.status} ← ${next}`,
    `Advanced batch ${batch.batchNumber}: ${batch.status} → ${next}`,
    { batchNumber: batch.batchNumber, from: batch.status, to: next },
  );
  revalidatePath("/workspace/operations");
}

/** Inline-edit a project's budget (JOD). Clamped to [0, 1e9]. */
export async function updateProjectBudget(formData: FormData): Promise<void> {
  const user = await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("budget") ?? "").replace(/[^0-9.]/g, "");
  if (!id) return;
  const next = Number(raw);
  if (!Number.isFinite(next) || next < 0) return;
  const clamped = Math.min(1_000_000_000, Math.round(next));

  const project = await prisma.futureProject.findUnique({ where: { id } });
  if (!project || project.budgetJod === clamped) return;

  await prisma.futureProject.update({
    where: { id },
    data: { budgetJod: clamped },
  });
  await audit(
    user.id,
    "UPDATE",
    "PROJECT",
    id,
    `تعديل ميزانية «${project.title}»: ${project.budgetJod} ← ${clamped}`,
    `Edited budget "${project.title}": ${project.budgetJod} → ${clamped}`,
    { title: project.title, from: project.budgetJod, to: clamped },
  );
  revalidatePath("/workspace/pipeline");
}

/**
 * Assign (or clear) the owner of a unit pipeline project. The owner is
 * picked from this unit's team on the Team page, so we store the name
 * (FutureProject.ownerName already exists — no schema change). Empty =
 * unassign. Scoped read guarantees cross-company safety.
 */
export async function assignProjectOwner(formData: FormData): Promise<void> {
  const user = await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ownerRaw = String(formData.get("owner") ?? "").trim().slice(0, 120);
  const nextOwner = ownerRaw === "" ? null : ownerRaw;

  const project = await prisma.futureProject.findUnique({ where: { id } });
  if (!project || (project.ownerName ?? null) === nextOwner) return;

  await prisma.futureProject.update({
    where: { id },
    data: { ownerName: nextOwner },
  });
  await audit(
    user.id,
    "UPDATE",
    "PROJECT",
    id,
    `إسناد مالك «${project.title}»: ${project.ownerName ?? "—"} ← ${nextOwner ?? "بدون مالك"}`,
    `Owner of "${project.title}": ${project.ownerName ?? "—"} → ${nextOwner ?? "Unassigned"}`,
    { title: project.title, from: project.ownerName ?? null, to: nextOwner },
  );
  revalidatePath("/workspace/team");
  revalidatePath("/workspace/pipeline");
}

/** Advance a future project one stage along the pipeline. */
export async function advanceProjectStage(formData: FormData): Promise<void> {
  const user = await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const project = await prisma.futureProject.findUnique({ where: { id } });
  if (!project) return;

  const idx = STAGE_CHAIN.indexOf(project.stage);
  if (idx < 0 || idx >= STAGE_CHAIN.length - 1) return;
  const next = STAGE_CHAIN[idx + 1];

  await prisma.futureProject.update({
    where: { id },
    data: { stage: next },
  });
  await audit(
    user.id,
    "UPDATE",
    "PROJECT",
    id,
    `تقديم مشروع «${project.title}»: ${project.stage} ← ${next}`,
    `Advanced project "${project.title}": ${project.stage} → ${next}`,
    { title: project.title, from: project.stage, to: next },
  );
  revalidatePath("/workspace/pipeline");
}

/**
 * Dismiss a brain signal. AIInsight isn't workspace-scoped (it carries
 * `module`, not companyId) so we use the unscoped client and only flip
 * status — never delete (soft, auditable).
 */
export async function dismissSignal(formData: FormData): Promise<void> {
  const user = await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const insight = await prismaUnscoped.aIInsight.findUnique({
    where: { id },
  });
  if (!insight || insight.status !== "OPEN") return;

  await prismaUnscoped.aIInsight.update({
    where: { id },
    data: { status: "DISMISSED" },
  });
  await audit(
    user.id,
    "UPDATE",
    "INSIGHT",
    id,
    `تجاهل إشارة: ${insight.title}`,
    `Dismissed signal: ${insight.title}`,
    { title: insight.title, module: insight.module, severity: insight.severity },
  );
  revalidatePath("/workspace/intelligence");
}

// Module → the plan metric that module's signals typically move.
const MODULE_METRIC: Record<string, string> = {
  DAIRY: "expiry_risk",
  HOTELS: "occupancy",
  FARMS: "yield",
  EDUCATION: "engagement",
  FINANCE: "margin",
  SUPPLY: "margin",
  MARKETS: "revenue",
};

/**
 * Accept a brain signal → spawn a DRAFT Plan. This is the marquee
 * "brain proposes, humans commit" flow (CLAUDE.md). We create the plan
 * in DRAFT — it is NOT committed here. The user commits it later in
 * /plans. The signal moves to ACTIONED so it leaves the open feed.
 */
export async function acceptSignal(formData: FormData): Promise<void> {
  const user = await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const insight = await prismaUnscoped.aIInsight.findUnique({
    where: { id },
  });
  if (!insight || insight.status !== "OPEN") return;

  const metric = MODULE_METRIC[insight.module] ?? "margin";
  // Severity → how aggressive the proposed target is.
  const targetDelta =
    insight.severity === "CRITICAL" || insight.severity === "ALERT"
      ? 0.15
      : insight.severity === "WARN"
        ? 0.1
        : 0.06;
  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const plan = await prismaUnscoped.plan.create({
    data: {
      goal: `معالجة: ${insight.title}`,
      goalEn: `Address: ${insight.title}`,
      rationale: insight.body.slice(0, 600),
      rationaleEn: insight.body.slice(0, 600),
      targetMetric: metric,
      targetDelta,
      targetDeadline: deadline,
      confidence: 0.6,
      status: "DRAFT", // brain proposes; human commits in /plans
      sourceInsightId: insight.id,
    },
  });

  // Signal leaves the open feed — it's been turned into a plan.
  await prismaUnscoped.aIInsight.update({
    where: { id },
    data: { status: "ACTIONED" },
  });

  await audit(
    user.id,
    "INSIGHT",
    "INSIGHT",
    id,
    `قُبلت إشارة وأُنشئت خطة مسوّدة: ${insight.title}`,
    `Accepted signal → draft plan created: ${insight.title}`,
    {
      insightId: insight.id,
      planId: plan.id,
      module: insight.module,
      targetMetric: metric,
      targetDelta,
    },
  );
  revalidatePath("/workspace/intelligence");
  revalidatePath("/plans");
}
