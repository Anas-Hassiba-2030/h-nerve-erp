"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { hasRole, isSafeId, requireRole } from "@/lib/auth/authz";
import { prisma } from "@/lib/db/db";
import {
  hardDelete,
  hardDeleteMany,
  softRestore,
  softRestoreMany,
  type SoftEntity,
} from "@/lib/db/softDelete";
import { flashToast } from "@/lib/utils/toast";

const VALID: SoftEntity[] = ["task", "project", "insight", "forecast"];

// Authorization rule for trash operations:
//   - STAFF can only act on tasks they own (assigneeId === user.id)
//   - MANAGER+ can act on any soft-deleted record
async function canActOn(
  entity: SoftEntity,
  id: string,
  user: { id: string; role: string },
): Promise<boolean> {
  if (hasRole(user, "MANAGER")) return true;
  if (entity !== "task") return false; // group entities are manager-only
  const task = await prisma.task.findUnique({
    where: { id },
    select: { assigneeId: true, deletedAt: true },
  });
  return Boolean(task && task.deletedAt && task.assigneeId === user.id);
}

// ---------- single-row actions ----------

export async function restoreOne(formData: FormData) {
  const user = await requireUser();
  const entity = String(formData.get("entity") ?? "") as SoftEntity;
  const id = String(formData.get("id") ?? "");
  if (!VALID.includes(entity) || !isSafeId(id)) return;
  if (!(await canActOn(entity, id, user))) return;
  await softRestore(entity, id);
  flashToast({
    type: "restored",
    entity,
    id,
    label: "تم الاسترجاع من سلة المحذوفات",
  });
  revalidatePath("/trash");
}

export async function purgeOne(formData: FormData) {
  const user = await requireRole("MANAGER");
  const entity = String(formData.get("entity") ?? "") as SoftEntity;
  const id = String(formData.get("id") ?? "");
  if (!VALID.includes(entity) || !isSafeId(id)) return;
  if (!(await canActOn(entity, id, user))) return;
  await hardDelete(entity, id);
  flashToast({
    type: "info",
    entity: "info",
    label: "تم الحذف نهائياً",
  });
  revalidatePath("/trash");
}

// ---------- bulk actions ----------
//
// The selection comes in as a single JSON-encoded "selection" field carrying
// an array of { entity, id } pairs. The trash UI builds it client-side from
// the row checkboxes, so the round trip stays one form submission.

type SelectionRow = { entity: SoftEntity; id: string };

function readSelection(formData: FormData): SelectionRow[] {
  const raw = String(formData.get("selection") ?? "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{ entity: string; id: string }>;
    return parsed
      .filter(
        (r): r is SelectionRow =>
          !!r &&
          VALID.includes(r.entity as SoftEntity) &&
          typeof r.id === "string" &&
          r.id.length > 0,
      )
      .map((r) => ({ entity: r.entity as SoftEntity, id: r.id }));
  } catch {
    return [];
  }
}

function groupByEntity(rows: SelectionRow[]): Record<SoftEntity, string[]> {
  const out: Record<SoftEntity, string[]> = {
    task: [],
    project: [],
    insight: [],
    forecast: [],
  };
  for (const r of rows) out[r.entity].push(r.id);
  return out;
}

// Filter a selection down to rows the user is actually permitted to act on.
async function filterAuthorized(
  rows: Array<{ entity: SoftEntity; id: string }>,
  user: { id: string; role: string },
): Promise<Array<{ entity: SoftEntity; id: string }>> {
  if (hasRole(user, "MANAGER")) return rows;
  // STAFF: keep only tasks they own.
  const taskIds = rows.filter((r) => r.entity === "task").map((r) => r.id);
  if (!taskIds.length) return [];
  const owned = await prisma.task.findMany({
    where: { id: { in: taskIds }, assigneeId: user.id },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((o) => o.id));
  return rows.filter((r) => r.entity === "task" && ownedSet.has(r.id));
}

export async function restoreSelected(formData: FormData) {
  const user = await requireUser();
  const requested = readSelection(formData);
  if (!requested.length) return;
  const rows = await filterAuthorized(requested, user);
  if (!rows.length) return;
  const grouped = groupByEntity(rows);
  let total = 0;
  for (const e of VALID) {
    if (grouped[e].length) total += await softRestoreMany(e, grouped[e]);
  }
  flashToast({
    type: "restored",
    entity: "info",
    label: `تم استرجاع ${total} عنصر`,
  });
  revalidatePath("/trash");
}

export async function purgeSelected(formData: FormData) {
  const user = await requireRole("MANAGER");
  const requested = readSelection(formData);
  if (!requested.length) return;
  const rows = await filterAuthorized(requested, user);
  if (!rows.length) return;
  const grouped = groupByEntity(rows);
  let total = 0;
  for (const e of VALID) {
    if (grouped[e].length) total += await hardDeleteMany(e, grouped[e]);
  }
  flashToast({
    type: "info",
    entity: "info",
    label: `تم حذف ${total} عنصر نهائياً`,
  });
  revalidatePath("/trash");
}

export async function purgeAllExpired() {
  const user = await requireRole("MANAGER");
  // Only managers and above can sweep across the group. STAFF would only get
  // their own expired tasks anyway; a single-user sweep isn't a useful UX.
  if (!hasRole(user, "MANAGER")) return;
  // Items past the documented 24h grace period — same threshold as the
  // cleanup cron in lib/cleanupSoftDeletes.ts.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const where = { deletedAt: { lt: cutoff, not: null } } as const;
  // We can't import prisma directly into "use server" without bundling
  // concerns — the hardDeleteMany helpers walk through the same table-by-
  // table dispatch. Use the lib helper to stay consistent.
  const { prisma } = await import("@/lib/db/db");
  const [t, p, i, f] = await Promise.all([
    prisma.task.deleteMany({ where }),
    prisma.futureProject.deleteMany({ where }),
    prisma.aIInsight.deleteMany({ where }),
    prisma.supplyForecast.deleteMany({ where }),
  ]);
  const total = t.count + p.count + i.count + f.count;
  flashToast({
    type: "info",
    entity: "info",
    label: `تم تفريغ ${total} عنصر منتهي الصلاحية`,
  });
  revalidatePath("/trash");
}
