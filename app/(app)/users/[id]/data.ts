// /users/[id] — server data module.
//
// The SAME user findUnique (with select), the 7-way Promise.all of
// related queries, and the rank/task/badge derivations the page used
// inline. Returns a typed object, or null when the user doesn't exist
// (shell calls notFound()). Behaviour-preserving.

import { prisma } from "@/lib/db";
import {
  rankFor,
  nextRank,
  progressToNext,
} from "@/lib/gamification";
import { getCompanyBrand } from "@/lib/companyBrand";

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      avatarColor: true,
      rank: true,
      xp: true,
      bonusPercent: true,
      loginCount: true,
      lastLoginAt: true,
      createdAt: true,
      companyId: true,
      company: {
        select: { id: true, name: true, code: true, sector: true },
      },
    },
  });
  if (!user) return null;

  const [
    achievements,
    earnedAchievements,
    taskCounts,
    recentTasks,
    transactions,
    forecasts,
    insights,
  ] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { threshold: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { assigneeId: user.id },
      _count: true,
    }),
    prisma.task.findMany({
      where: { assigneeId: user.id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 10,
    }),
    prisma.transaction.findMany({
      where: { createdById: user.id },
      orderBy: { occurredAt: "desc" },
      take: 6,
      include: { company: { select: { name: true, code: true } } },
    }),
    prisma.supplyForecast.findMany({
      where: { generatedById: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        source: { select: { name: true, code: true } },
        target: { select: { name: true, code: true } },
      },
    }),
    prisma.aIInsight.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const xp = user.xp ?? 0;
  const currentRank = rankFor(xp);
  const next = nextRank(xp);
  const progress = progressToNext(xp);

  const earnedIds = new Set(
    earnedAchievements.map((e) => e.achievementId)
  );
  const earnedCount = earnedIds.size;
  const totalCount = achievements.length;

  const tasksByStatus: Record<string, number> = {};
  let totalTasks = 0;
  for (const g of taskCounts) {
    tasksByStatus[g.status] = g._count;
    totalTasks += g._count;
  }
  const doneTasks = tasksByStatus["DONE"] ?? 0;
  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const brand = user.company ? getCompanyBrand(user.company.code) : null;

  return {
    user,
    achievements,
    earnedAchievements,
    recentTasks,
    transactions,
    forecasts,
    insights,
    xp,
    currentRank,
    next,
    progress,
    earnedIds,
    earnedCount,
    totalCount,
    tasksByStatus,
    totalTasks,
    doneTasks,
    completionRate,
    brand,
  };
}

export type UserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;
