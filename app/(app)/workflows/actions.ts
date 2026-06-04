"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authz";
import { prisma } from "@/lib/db/db";
import { getTemplate, defaultParams } from "@/lib/workflows/templates";
import { runWorkflow, type RunMode } from "@/lib/workflows/runtime";
import { seedWorkflows } from "@/lib/workflows/seed";
import { getGalleryTemplate } from "@/lib/workflows/templates.gallery";

export async function createWorkflow(formData: FormData): Promise<void> {
  await requireUser();
  const name = String(formData.get("name") ?? "Untitled workflow").trim().slice(0, 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 320) || null;

  const wf = await prisma.workflow.create({
    data: { name, description, enabled: false, status: "DRAFT" },
  });
  revalidatePath("/workflows");
  redirect(`/workflows/studio/${wf.id}`);
}

export async function addNode(formData: FormData): Promise<void> {
  await requireUser();
  const workflowId = String(formData.get("workflowId") ?? "");
  const templateKey = String(formData.get("templateKey") ?? "");
  if (!workflowId || !templateKey) throw new Error("workflowId + templateKey required");

  const t = getTemplate(templateKey);
  if (!t) throw new Error("unknown template");

  // Auto-place at the bottom of its column.
  const peers = await prisma.workflowNode.count({
    where: { workflowId, kind: t.kind },
  });

  await prisma.workflowNode.create({
    data: {
      workflowId,
      kind: t.kind,
      templateKey,
      configJson: JSON.stringify(defaultParams(t)),
      posX: t.defaultColumn,
      posY: peers,
    },
  });
  revalidatePath(`/workflows/studio/${workflowId}`);
}

export async function deleteNode(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  const workflowId = String(formData.get("workflowId") ?? "");
  if (!id) return;
  await prisma.workflowNode.delete({ where: { id } });
  revalidatePath(`/workflows/studio/${workflowId}`);
}

export async function updateNodeConfig(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const workflowId = String(formData.get("workflowId") ?? "");
  const configJson = String(formData.get("configJson") ?? "{}");
  if (!id) return;
  // Validate it's parseable JSON.
  try { JSON.parse(configJson); } catch { throw new Error("invalid config JSON"); }
  await prisma.workflowNode.update({ where: { id }, data: { configJson } });
  revalidatePath(`/workflows/studio/${workflowId}`);
}

export async function addEdge(formData: FormData): Promise<void> {
  await requireUser();
  const workflowId = String(formData.get("workflowId") ?? "");
  const fromNodeId = String(formData.get("fromNodeId") ?? "");
  const toNodeId = String(formData.get("toNodeId") ?? "");
  if (!workflowId || !fromNodeId || !toNodeId) return;
  if (fromNodeId === toNodeId) return;
  // Idempotent — composite-unique on (workflowId, fromNodeId, toNodeId).
  try {
    await prisma.workflowEdge.create({
      data: { workflowId, fromNodeId, toNodeId },
    });
  } catch {
    /* duplicate — ignore */
  }
  revalidatePath(`/workflows/studio/${workflowId}`);
}

export async function deleteEdge(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  const workflowId = String(formData.get("workflowId") ?? "");
  if (!id) return;
  await prisma.workflowEdge.delete({ where: { id } });
  revalidatePath(`/workflows/studio/${workflowId}`);
}

export async function toggleWorkflow(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const cur = await prisma.workflow.findUnique({ where: { id } });
  if (!cur) return;
  const enabled = !cur.enabled;
  await prisma.workflow.update({
    where: { id },
    data: { enabled, status: enabled ? "ACTIVE" : "DRAFT" },
  });
  revalidatePath("/workflows");
  revalidatePath(`/workflows/studio/${id}`);
}

export async function testRunWorkflow(input: { workflowId: string }) {
  await requireUser();
  if (!input.workflowId) throw new Error("workflowId required");
  return await runWorkflow(input.workflowId, "test" as RunMode);
}

export async function deleteWorkflow(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.workflow.delete({ where: { id } });
  revalidatePath("/workflows");
  redirect("/workflows");
}

export async function seedExampleWorkflows(): Promise<void> {
  await requireUser();
  await seedWorkflows();
  revalidatePath("/workflows");
}

// Phase NS-3 — clone a gallery template into a fresh Workflow row.
export async function createWorkflowFromTemplate(formData: FormData): Promise<void> {
  await requireUser();
  const templateId = String(formData.get("templateId") ?? "");
  if (!templateId) throw new Error("templateId required");
  const t = getGalleryTemplate(templateId);
  if (!t) throw new Error(`unknown template: ${templateId}`);

  const nodeCreates = t.nodes.map((n, i) => {
    const tpl = getTemplate(n.key);
    if (!tpl) throw new Error(`missing runtime template: ${n.key}`);
    const params = { ...defaultParams(tpl), ...(n.params ?? {}) };
    return {
      kind: tpl.kind,
      templateKey: tpl.key,
      configJson: JSON.stringify(params),
      posX: tpl.defaultColumn,
      posY: i,
    };
  });

  const wf = await prisma.workflow.create({
    data: {
      scope: "default",
      name: t.nameEn,
      description: t.descEn,
      enabled: false,
      status: "DRAFT",
      nodes: { create: nodeCreates },
    },
    include: { nodes: { orderBy: { createdAt: "asc" } } },
  });

  for (const e of t.edges) {
    const fromNode = wf.nodes[e.from];
    const toNode = wf.nodes[e.to];
    if (!fromNode || !toNode) continue;
    await prisma.workflowEdge.create({
      data: { workflowId: wf.id, fromNodeId: fromNode.id, toNodeId: toNode.id },
    });
  }

  revalidatePath("/workflows");
  redirect(`/workflows/studio/${wf.id}`);
}
