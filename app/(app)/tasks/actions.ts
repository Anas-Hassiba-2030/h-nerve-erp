"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { rankFor, bonusFor } from "@/lib/gamification";
import { softDelete, softRestore, deletedLabel, restoredLabel } from "@/lib/softDelete";
import { flashToast } from "@/lib/toast";
import { logActivity } from "@/lib/activityLog";

const taskSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional().or(z.literal("")),
  kind: z.enum(["CORE", "SIDE"]).default("CORE"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  module: z.string().max(40).default("GENERAL"),
  points: z.coerce.number().int().min(1).default(10),
  dueAt: z.string().optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
});

export async function createTask(formData: FormData) {
  const user = await requireRole("MANAGER");
  const data = taskSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    kind: formData.get("kind") || "CORE",
    priority: formData.get("priority") || "MEDIUM",
    module: formData.get("module") || "GENERAL",
    points: formData.get("points") ?? 10,
    dueAt: formData.get("dueAt") ?? "",
    assigneeId: formData.get("assigneeId") ?? "",
  });
  const created = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      kind: data.kind,
      priority: data.priority,
      module: data.module,
      points: data.points,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      assigneeId: data.assigneeId || user.id,
    },
  });
  await logActivity({
    action: "CREATE",
    entity: "TASK",
    entityId: created.id,
    summary: `مهمة جديدة: ${data.title}`,
    summaryEn: `New task: ${data.title}`,
    module: data.module,
    meta: { kind: data.kind, points: data.points, priority: data.priority },
  });
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function setTaskStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;

  const wasDone = task.status === "DONE";
  const willBeDone = status === "DONE";

  await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: willBeDone ? new Date() : null,
    },
  });

  // Award/withdraw XP if assignee is the current actor
  if (task.assigneeId && willBeDone && !wasDone) {
    const sideMul = task.kind === "SIDE" ? 1.5 : 1;
    const xpDelta = Math.round(task.points * sideMul);
    const u = await prisma.user.findUnique({ where: { id: task.assigneeId } });
    if (u) {
      const newXp = u.xp + xpDelta;
      const newRank = rankFor(newXp).id;
      const newBonus = bonusFor(newXp);
      await prisma.user.update({
        where: { id: u.id },
        data: { xp: newXp, rank: newRank, bonusPercent: newBonus },
      });
    }
  } else if (task.assigneeId && wasDone && !willBeDone) {
    const sideMul = task.kind === "SIDE" ? 1.5 : 1;
    const xpDelta = Math.round(task.points * sideMul);
    const u = await prisma.user.findUnique({ where: { id: task.assigneeId } });
    if (u) {
      const newXp = Math.max(0, u.xp - xpDelta);
      const newRank = rankFor(newXp).id;
      const newBonus = bonusFor(newXp);
      await prisma.user.update({
        where: { id: u.id },
        data: { xp: newXp, rank: newRank, bonusPercent: newBonus },
      });
    }
  }

  await logActivity({
    action: "UPDATE",
    entity: "TASK",
    entityId: id,
    summary: willBeDone
      ? `إنجاز مهمة: ${task.title}`
      : `حالة مهمة "${task.title}" → ${status}`,
    summaryEn: willBeDone
      ? `Completed task: ${task.title}`
      : `Task "${task.title}" status → ${status}`,
    module: task.module,
    meta: { from: task.status, to: status },
  });
  revalidatePath("/tasks");
  revalidatePath("/achievements");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const before = await prisma.task.findUnique({ where: { id } });
  await softDelete("task", id);
  if (before) {
    await logActivity({
      action: "DELETE",
      entity: "TASK",
      entityId: id,
      summary: `حذف مهمة "${before.title}"`,
      summaryEn: `Deleted task "${before.title}"`,
    });
  }
  flashToast({
    type: "deleted",
    entity: "task",
    id,
    label: deletedLabel("task"),
    restorePath: "/api/toast/undo",
  });
}

export async function bulkSetTaskStatus(ids: string[], status: string) {
  const user = await requireUser();
  if (!ids.length || !["TODO", "IN_PROGRESS", "DONE", "BLOCKED"].includes(status)) return;

  const tasks = await prisma.task.findMany({ where: { id: { in: ids } } });

  for (const task of tasks) {
    const wasDone = task.status === "DONE";
    const willBeDone = status === "DONE";
    await prisma.task.update({
      where: { id: task.id },
      data: { status, completedAt: willBeDone ? new Date() : null },
    });
    if (task.assigneeId && willBeDone && !wasDone) {
      const sideMul = task.kind === "SIDE" ? 1.5 : 1;
      const xpDelta = Math.round(task.points * sideMul);
      const u = await prisma.user.findUnique({ where: { id: task.assigneeId } });
      if (u) {
        const newXp = u.xp + xpDelta;
        await prisma.user.update({
          where: { id: u.id },
          data: { xp: newXp, rank: rankFor(newXp).id, bonusPercent: bonusFor(newXp) },
        });
      }
    }
  }

  await logActivity({
    action: "UPDATE",
    entity: "TASK",
    entityId: ids[0],
    summary: `تحديث جماعي لـ ${ids.length} مهام → ${status}`,
    summaryEn: `Bulk update ${ids.length} tasks → ${status}`,
    meta: { ids, status },
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function bulkDeleteTasks(ids: string[]) {
  await requireRole("MANAGER");
  if (!ids.length) return;
  for (const id of ids) {
    await softDelete("task", id);
  }
  await logActivity({
    action: "DELETE",
    entity: "TASK",
    entityId: ids[0],
    summary: `حذف جماعي لـ ${ids.length} مهام`,
    summaryEn: `Bulk deleted ${ids.length} tasks`,
    meta: { ids },
  });
  revalidatePath("/tasks");
}

export async function restoreTask(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await softRestore("task", id);
  const after = await prisma.task.findUnique({ where: { id } });
  if (after) {
    await logActivity({
      action: "RESTORE",
      entity: "TASK",
      entityId: id,
      summary: `استعادة مهمة "${after.title}"`,
      summaryEn: `Restored task "${after.title}"`,
    });
  }
  flashToast({
    type: "restored",
    entity: "task",
    id,
    label: restoredLabel("task"),
  });
}
