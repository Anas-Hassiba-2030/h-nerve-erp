import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { isSafeId } from "@/lib/auth/authz";
import { prisma } from "@/lib/db/db";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Whitelist of entity types that can host an ENTITY thread. Mirrors the set
// of detail pages where the Discuss button is mounted. Extending later means
// adding the type here AND mounting the button on the new detail page.
const VALID_ENTITIES = [
  "FORECAST",
  "BOOKING",
  "INSIGHT",
  "TASK",
  "PROJECT",
  "HOTEL",
  "DAIRY",
  "FARM",
  "PROGRAM",
  "TRANSACTION",
  "COMPANY",
] as const;

type EntityType = (typeof VALID_ENTITIES)[number];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const entityType = String(
    (body as Record<string, unknown>)?.entityType ?? "",
  ).toUpperCase();
  const entityId = String((body as Record<string, unknown>)?.entityId ?? "");
  const labelRaw = (body as Record<string, unknown>)?.label;
  const label =
    typeof labelRaw === "string" && labelRaw.length > 0
      ? labelRaw.slice(0, 200)
      : undefined;

  if (!VALID_ENTITIES.includes(entityType as EntityType) || !isSafeId(entityId)) {
    return NextResponse.json(
      { ok: false, error: "bad_request" },
      { status: 400 },
    );
  }

  // Join (or create) the single canonical ENTITY thread for this record.
  // Two officials can click "Discuss" at the same moment, so every step here
  // is race-tolerant: a concurrent insert that trips a unique constraint
  // (P2002) is treated as "someone beat me to it", and we converge on the
  // existing thread instead of 500-ing.
  async function joinThread(threadId: string): Promise<void> {
    try {
      await prisma.threadParticipant.create({
        data: { threadId, userId: user!.id },
      });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e; // already a participant — fine.
    }
  }

  try {
    // 1) Already a participant in an existing ENTITY thread for this record?
    const own = await prisma.messageThread.findFirst({
      where: {
        kind: "ENTITY",
        entityType,
        entityId,
        participants: { some: { userId: user.id } },
      },
      select: { id: true },
    });
    if (own) {
      return NextResponse.json({ ok: true, threadId: own.id });
    }

    // 2) Someone else already opened an ENTITY thread for this record — join it
    //    so officials converge on a single canonical discussion per record
    //    rather than fragmenting into per-user side-threads.
    const shared = await prisma.messageThread.findFirst({
      where: { kind: "ENTITY", entityType, entityId },
      select: { id: true },
    });
    if (shared) {
      await joinThread(shared.id);
      return NextResponse.json({ ok: true, threadId: shared.id });
    }

    // 3) First discussion for this entity — create the thread.
    const created = await prisma.messageThread.create({
      data: {
        kind: "ENTITY",
        entityType,
        entityId,
        title: label,
        createdById: user.id,
        participants: { create: [{ userId: user.id }] },
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, threadId: created.id });
  } catch (e) {
    // A concurrent request likely created the thread between our check and our
    // insert — re-resolve the canonical thread and join it rather than failing.
    const existing = await prisma.messageThread
      .findFirst({
        where: { kind: "ENTITY", entityType, entityId },
        select: { id: true },
      })
      .catch(() => null);
    if (existing) {
      await joinThread(existing.id).catch(() => {});
      return NextResponse.json({ ok: true, threadId: existing.id });
    }
    console.error("[discuss] thread resolution failed:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
