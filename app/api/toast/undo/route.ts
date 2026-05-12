import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { hasRole, isSafeId } from "@/lib/authz";
import { softRestore, type SoftEntity } from "@/lib/softDelete";
import { prisma } from "@/lib/db";

const VALID: SoftEntity[] = ["task", "project", "insight", "forecast"];

// Authorization rule per entity:
//
//   task      — assignee, the deletion's actor (any logged-in user can manage
//               their own tasks), or MANAGER+
//   project   — MANAGER+ (group-wide pipeline)
//   insight   — MANAGER+ (group-wide intelligence)
//   forecast  — MANAGER+ (cross-company AI bridge)
//
// We always check the row exists and is currently soft-deleted before
// restoring; this prevents the endpoint from being used as an existence
// oracle for unrelated IDs.
async function authorizeRestore(
  entity: SoftEntity,
  id: string,
  user: { id: string; role: string },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (entity === "task") {
    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, assigneeId: true, deletedAt: true },
    });
    if (!task || !task.deletedAt) {
      return { ok: false, status: 404, error: "not_found" };
    }
    if (task.assigneeId === user.id) return { ok: true };
    if (hasRole(user, "MANAGER")) return { ok: true };
    return { ok: false, status: 403, error: "forbidden" };
  }

  // project / insight / forecast — manager-grade only.
  if (!hasRole(user, "MANAGER")) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  // Confirm the row exists and is currently soft-deleted.
  const exists =
    entity === "project"
      ? await prisma.futureProject.findUnique({
          where: { id },
          select: { id: true, deletedAt: true },
        })
      : entity === "insight"
        ? await prisma.aIInsight.findUnique({
            where: { id },
            select: { id: true, deletedAt: true },
          })
        : await prisma.supplyForecast.findUnique({
            where: { id },
            select: { id: true, deletedAt: true },
          });

  if (!exists || !exists.deletedAt) {
    return { ok: false, status: 404, error: "not_found" };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const body = await req
    .json()
    .catch(() => ({} as Record<string, unknown>));
  const entity = String((body as Record<string, unknown>)?.entity ?? "");
  const id = String((body as Record<string, unknown>)?.id ?? "");

  if (!VALID.includes(entity as SoftEntity) || !isSafeId(id)) {
    return NextResponse.json(
      { ok: false, error: "bad_request" },
      { status: 400 },
    );
  }

  const decision = await authorizeRestore(
    entity as SoftEntity,
    id,
    user,
  );
  if (!decision.ok) {
    return NextResponse.json(
      { ok: false, error: decision.error },
      { status: decision.status },
    );
  }

  await softRestore(entity as SoftEntity, id);
  return NextResponse.json({ ok: true });
}
