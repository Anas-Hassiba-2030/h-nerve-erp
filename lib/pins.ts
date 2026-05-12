// Server-only pin helpers — toggle, list, check.
// Pins are scoped per user via the iron-session.

import "server-only";
import { prisma } from "./db";
import { requireUser } from "./session";

export type PinEntityType =
  | "COMPANY"
  | "HOTEL"
  | "BOOKING"
  | "DAIRY"
  | "FARM"
  | "PROGRAM"
  | "FORECAST"
  | "INSIGHT"
  | "TASK"
  | "PROJECT"
  | "TRANSACTION";

export interface PinPayload {
  entityType: PinEntityType;
  entityId: string;
  label: string;
  labelEn?: string;
  href: string;
  icon?: string;
}

/** Toggle: add if missing, remove if present. Returns the new pinned state. */
export async function togglePin(input: PinPayload): Promise<boolean> {
  const user = await requireUser();
  const existing = await prisma.pin.findUnique({
    where: {
      userId_entityType_entityId: {
        userId: user.id,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    },
  });
  if (existing) {
    await prisma.pin.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.pin.create({
    data: {
      userId: user.id,
      entityType: input.entityType,
      entityId: input.entityId,
      label: input.label,
      labelEn: input.labelEn ?? null,
      href: input.href,
      icon: input.icon ?? null,
    },
  });
  return true;
}

export async function listPins(userId?: string) {
  const id = userId ?? (await requireUser()).id;
  return prisma.pin.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
  });
}

export async function isPinned(
  entityType: PinEntityType,
  entityId: string,
): Promise<boolean> {
  const user = await requireUser();
  const found = await prisma.pin.findUnique({
    where: {
      userId_entityType_entityId: {
        userId: user.id,
        entityType,
        entityId,
      },
    },
  });
  return Boolean(found);
}

export async function pinCountFor(userId: string): Promise<number> {
  return prisma.pin.count({ where: { userId } });
}
