// lib/brain/tools/pullFacts.ts
import { z } from "zod";
import { prisma } from "@/lib/db/db";
import type { BrainTool } from "./types";

export type FactPack = {
  insights: Array<{ id: string; title: string; severity: string; module: string; body: string }>;
  plans: Array<{ id: string; goal: string; status: string; targetMetric: string; targetDelta: number }>;
  integrations: Array<{ providerKey: string; status: string; errorCount: number }>;
  hotels: { totalRooms: number; occupiedNow: number; activeBookings: number };
  dairy: { batchesThisWeek: number; nearExpiry: number };
  farms: { activeCrops: number; totalFarms: number };
};

// Moved verbatim from converse.ts (behaviour-preserved).
export async function pullFacts(): Promise<FactPack> {
  const [insights, plans, integrations, hotelsAgg, bookings, dairyWeek, dairyExp, crops, farms] =
    await Promise.all([
      prisma.aIInsight.findMany({
        where: { deletedAt: null, status: "OPEN" },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 6,
        select: { id: true, title: true, severity: true, module: true, body: true },
      }),
      prisma.plan.findMany({
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, goal: true, status: true, targetMetric: true, targetDelta: true },
      }),
      prisma.integration.findMany({ take: 6, select: { providerKey: true, status: true, errorCount: true } }),
      prisma.hotel.aggregate({ _sum: { totalRooms: true } }).catch(() => ({ _sum: { totalRooms: 0 } })),
      prisma.booking.count({ where: { status: { in: ["CONFIRMED", "ACTIVE", "CHECKED_IN"] } } }).catch(() => 0),
      prisma.dairyBatch.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }).catch(() => 0),
      prisma.dairyBatch.count({ where: { expiryDate: { lte: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), gte: new Date() } } }).catch(() => 0),
      prisma.crop.count({ where: { status: "GROWING" } }).catch(() => 0),
      prisma.farm.count().catch(() => 0),
    ]);
  const totalRooms = hotelsAgg._sum?.totalRooms ?? 0;
  const occupiedNow = Math.min(bookings, totalRooms);
  return {
    insights,
    plans,
    integrations,
    hotels: { totalRooms, occupiedNow, activeBookings: bookings },
    dairy: { batchesThisWeek: dairyWeek, nearExpiry: dairyExp },
    farms: { activeCrops: crops, totalFarms: farms },
  };
}

export const pullFactsTool: BrainTool<Record<string, never>, FactPack> = {
  name: "pullFacts",
  description:
    "Pull the current cross-unit fact pack (open insights, active plans, integrations, hotel/dairy/farm pulse) from the database. Call first to ground an answer in live numbers.",
  inputSchema: z.object({}).strict(),
  run: async () => pullFacts(),
};
