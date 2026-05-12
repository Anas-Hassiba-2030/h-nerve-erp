import { revalidatePath } from "next/cache";
import { prisma } from "./db";

export type SoftEntity = "task" | "project" | "insight" | "forecast";

const PATHS: Record<SoftEntity, string> = {
  task: "/tasks",
  project: "/projects",
  insight: "/insights",
  forecast: "/supply-chain",
};

const LABELS_AR: Record<SoftEntity, { deleted: string; restored: string }> = {
  task: { deleted: "تم حذف المهمة", restored: "تم استرجاع المهمة" },
  project: { deleted: "تم حذف المشروع", restored: "تم استرجاع المشروع" },
  insight: { deleted: "تم حذف الإشارة", restored: "تم استرجاع الإشارة" },
  forecast: { deleted: "تم حذف التوقع", restored: "تم استرجاع التوقع" },
};

export function pathFor(entity: SoftEntity): string {
  return PATHS[entity];
}

export function deletedLabel(entity: SoftEntity): string {
  return LABELS_AR[entity].deleted;
}

export function restoredLabel(entity: SoftEntity): string {
  return LABELS_AR[entity].restored;
}

export async function softDelete(entity: SoftEntity, id: string): Promise<void> {
  const at = new Date();
  switch (entity) {
    case "task":
      await prisma.task.update({ where: { id }, data: { deletedAt: at } });
      break;
    case "project":
      await prisma.futureProject.update({ where: { id }, data: { deletedAt: at } });
      break;
    case "insight":
      await prisma.aIInsight.update({ where: { id }, data: { deletedAt: at } });
      break;
    case "forecast":
      await prisma.supplyForecast.update({ where: { id }, data: { deletedAt: at } });
      break;
  }
  revalidatePath(PATHS[entity]);
}

export async function softRestore(entity: SoftEntity, id: string): Promise<void> {
  switch (entity) {
    case "task":
      await prisma.task.update({ where: { id }, data: { deletedAt: null } });
      break;
    case "project":
      await prisma.futureProject.update({ where: { id }, data: { deletedAt: null } });
      break;
    case "insight":
      await prisma.aIInsight.update({ where: { id }, data: { deletedAt: null } });
      break;
    case "forecast":
      await prisma.supplyForecast.update({ where: { id }, data: { deletedAt: null } });
      break;
  }
  revalidatePath(PATHS[entity]);
}

// Permanently removes a record. Use only after the user opts in from the
// trash UI — there is no undo path past this point.
export async function hardDelete(entity: SoftEntity, id: string): Promise<void> {
  switch (entity) {
    case "task":
      await prisma.task.delete({ where: { id } });
      break;
    case "project":
      await prisma.futureProject.delete({ where: { id } });
      break;
    case "insight":
      await prisma.aIInsight.delete({ where: { id } });
      break;
    case "forecast":
      await prisma.supplyForecast.delete({ where: { id } });
      break;
  }
  revalidatePath(PATHS[entity]);
  revalidatePath("/trash");
}

// Bulk variants used by the trash page's selection toolbar. We use deleteMany
// / updateMany so a hundred-item selection is a single round trip per entity.
export async function softRestoreMany(entity: SoftEntity, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const where = { id: { in: ids } };
  let count = 0;
  switch (entity) {
    case "task":
      count = (await prisma.task.updateMany({ where, data: { deletedAt: null } })).count;
      break;
    case "project":
      count = (await prisma.futureProject.updateMany({ where, data: { deletedAt: null } })).count;
      break;
    case "insight":
      count = (await prisma.aIInsight.updateMany({ where, data: { deletedAt: null } })).count;
      break;
    case "forecast":
      count = (await prisma.supplyForecast.updateMany({ where, data: { deletedAt: null } })).count;
      break;
  }
  revalidatePath(PATHS[entity]);
  revalidatePath("/trash");
  return count;
}

export async function hardDeleteMany(entity: SoftEntity, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const where = { id: { in: ids } };
  let count = 0;
  switch (entity) {
    case "task":
      count = (await prisma.task.deleteMany({ where })).count;
      break;
    case "project":
      count = (await prisma.futureProject.deleteMany({ where })).count;
      break;
    case "insight":
      count = (await prisma.aIInsight.deleteMany({ where })).count;
      break;
    case "forecast":
      count = (await prisma.supplyForecast.deleteMany({ where })).count;
      break;
  }
  revalidatePath(PATHS[entity]);
  revalidatePath("/trash");
  return count;
}
