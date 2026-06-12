// /companies/[id] — server data module.
//
// The SAME company findUnique (with includes), the financial groupBy
// aggregate, and the rollup derivations the page used inline. Returns a
// typed object, or null when the company doesn't exist (shell calls
// notFound()). Behaviour-preserving.

import { prisma } from "@/lib/db/db";
import { isPinned } from "@/lib/utils/pins";
import { getCompanyBrand } from "@/lib/utils/companyBrand";

function yearsSince(year: number | null | undefined) {
  if (!year) return null;
  return new Date().getFullYear() - year;
}

export async function getCompanyDetail(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      hotels: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { bookings: true } } },
      },
      dairyBatches: {
        orderBy: { productionDate: "desc" },
        take: 6,
      },
      farms: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { crops: true } } },
      },
      programs: {
        orderBy: { createdAt: "desc" },
      },
      transactions: {
        orderBy: { occurredAt: "desc" },
        take: 8,
      },
      futureProjects: {
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 6,
      },
      esgScores: {
        orderBy: [{ year: "desc" }, { period: "desc" }],
        take: 1,
      },
      forecastsOut: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { target: { select: { name: true, code: true } } },
      },
      forecastsIn: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { source: { select: { name: true, code: true } } },
      },
      _count: {
        select: {
          users: true,
          hotels: true,
          dairyBatches: true,
          farms: true,
          programs: true,
          transactions: true,
          futureProjects: true,
          forecastsOut: true,
          forecastsIn: true,
        },
      },
    },
  });

  if (!company) return null;

  const brand = getCompanyBrand(company.code);
  const pinnedNow = await isPinned("COMPANY", company.id);

  // Aggregate financials for this company.
  const financialAgg = await prisma.transaction.groupBy({
    by: ["kind"],
    where: { companyId: company.id },
    _sum: { amount: true },
  });
  const incomeTotal = financialAgg
    .filter((g) => g.kind === "INCOME" || g.kind === "REVENUE")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const expenseTotal = financialAgg
    .filter((g) => g.kind === "EXPENSE" || g.kind === "COST")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const netTotal = incomeTotal - expenseTotal;

  // Hotel rollup.
  const totalRooms = company.hotels.reduce((acc, h) => acc + (h.totalRooms ?? 0), 0);
  // Dairy rollup (production volume from recent batches).
  const recentLiters = company.dairyBatches.reduce(
    (acc, b) => acc + (b.quantityLiters ?? 0),
    0
  );
  // Farm rollup.
  const totalDunum = company.farms.reduce((acc, f) => acc + (f.areaDunum ?? 0), 0);

  const age = yearsSince(company.foundedYear);
  const latestEsg = company.esgScores[0];

  return {
    company,
    brand,
    pinnedNow,
    incomeTotal,
    expenseTotal,
    netTotal,
    totalRooms,
    recentLiters,
    totalDunum,
    age,
    latestEsg,
  };
}

export type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompanyDetail>>>;
