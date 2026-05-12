// Activity log helper — server-only.
// Use logActivity() inside server actions to record audit trail entries.

import "server-only";
import { prisma } from "./db";
import { getCurrentUser } from "./session";

export type ActivityAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "FORECAST"
  | "INSIGHT"
  | "APPROVE"
  | "REJECT"
  | "ASSIGN";

export type ActivityEntity =
  | "BOOKING"
  | "DAIRY"
  | "FARM"
  | "CROP"
  | "PROGRAM"
  | "FORECAST"
  | "INSIGHT"
  | "TASK"
  | "PROJECT"
  | "TRANSACTION"
  | "USER"
  | "COMPANY"
  | "HOTEL"
  | "MARKET"
  | "ESG"
  | "AUTH"
  | "REPORT";

export interface LogActivityInput {
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: string;
  summary: string;       // Arabic
  summaryEn?: string;    // English
  meta?: Record<string, unknown>;
  module?: string;
}

/**
 * Record an activity log entry. Fails silently — never block the calling
 * server action because of a logging failure.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const user = await getCurrentUser();
    await prisma.activityLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
        summaryEn: input.summaryEn ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
        actorId: user?.id ?? null,
        actorName: user?.name ?? null,
        module: input.module ?? null,
      },
    });
  } catch (e) {
    // swallow — activity log must never crash a write path.
    console.warn("[activityLog] failed", e);
  }
}

/** Soft sweep — keep last 5000 entries. Call from a maintenance route. */
export async function pruneActivityLog(keep = 5000): Promise<number> {
  const total = await prisma.activityLog.count();
  if (total <= keep) return 0;
  const cutoff = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: keep,
    take: 1,
    select: { createdAt: true },
  });
  if (cutoff.length === 0) return 0;
  const res = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff[0].createdAt } },
  });
  return res.count;
}
