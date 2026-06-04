// /workspace/operations — server data module.
//
// Holds the SAME prisma queries + derivations the page used inline, now
// factored into per-sector async functions that return typed objects.
// Behaviour-preserving: identical where/orderBy/take and identical math.

import { prisma, prismaUnscoped } from "@/lib/db";
import { getAsOf } from "@/lib/timemachine";

// ---------------------------------------------------------------------------
// DAIRY — flagship production board
// ---------------------------------------------------------------------------
export async function getDairyOpsData(ar: boolean) {
  const batches = await prisma.dairyBatch.findMany({
    orderBy: { productionDate: "desc" },
    take: 400,
  });

  const now = Date.now();
  const DAY = 86_400_000;
  const totalLiters = batches.reduce((a, b) => a + (b.quantityLiters ?? 0), 0);
  const gradeA = batches.filter((b) => b.qualityGrade === "A").length;
  const gradeOk = batches.filter((b) =>
    ["A", "B"].includes(b.qualityGrade),
  ).length;
  const qcRate = batches.length
    ? Math.round((gradeOk / batches.length) * 100)
    : 0;

  const STATUS_ORDER = ["IN_PRODUCTION", "READY", "SHIPPED", "RETAIL", "EXPIRED"];
  const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
    IN_PRODUCTION: { ar: "قيد الإنتاج", en: "In production" },
    READY: { ar: "جاهز", en: "Ready" },
    SHIPPED: { ar: "مُرحّل", en: "Shipped" },
    RETAIL: { ar: "تجزئة", en: "Retail" },
    EXPIRED: { ar: "منتهي", en: "Expired" },
  };
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s] ?? { ar: s, en: s },
    items: batches.filter((b) => b.status === s),
  })).filter((c) => c.items.length > 0);

  // Expiry watch — batches within 5 days of expiry, not already expired
  const expiring = batches
    .filter((b) => {
      const dleft = (new Date(b.expiryDate).getTime() - now) / DAY;
      return dleft >= 0 && dleft <= 5 && b.status !== "RETAIL";
    })
    .sort(
      (a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );

  // Throughput — liters produced per month, last 6 months oldest→newest
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const tp = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now - i * 30 * DAY);
    tp.set(monthKey(d), 0);
  }
  for (const b of batches) {
    const k = monthKey(new Date(b.productionDate));
    if (tp.has(k)) tp.set(k, (tp.get(k) ?? 0) + (b.quantityLiters ?? 0));
  }
  const throughput = Array.from(tp.entries()).map(([k, v]) => ({
    label: k.slice(5),
    liters: Math.round(v),
  }));
  const tpMax = Math.max(1, ...throughput.map((t) => t.liters));

  // Destination split — where shipped/retail batches are routed
  const destAgg = new Map<string, number>();
  for (const b of batches) {
    const d = (b.destination ?? "").trim() || (ar ? "غير محدّد" : "Unassigned");
    destAgg.set(d, (destAgg.get(d) ?? 0) + 1);
  }
  const destinations = Array.from(destAgg.entries())
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 6);
  const destTotal = destinations.reduce((a, d) => a + d.n, 0) || 1;

  return {
    batches,
    now,
    DAY,
    totalLiters,
    gradeA,
    qcRate,
    byStatus,
    expiring,
    throughput,
    tpMax,
    destinations,
    destTotal,
  };
}
export type DairyOpsData = Awaited<ReturnType<typeof getDairyOpsData>>;

// ---------------------------------------------------------------------------
// HOSPITALITY
// ---------------------------------------------------------------------------
export async function getHospitalityOpsData(ar: boolean) {
  // Hotels are workspace-scoped by the middleware. Bookings are not
  // (no companyId) — scope them via the hotel ids we just fetched.
  const hotels = await prisma.hotel.findMany({
    orderBy: { totalRooms: "desc" },
  });
  const hotelIds = hotels.map((h) => h.id);
  const bookings = hotelIds.length
    ? await prisma.booking.findMany({
        where: { hotelId: { in: hotelIds } },
        orderBy: { checkIn: "desc" },
        take: 600,
      })
    : [];

  const now = Date.now();
  const DAY = 86_400_000;
  const totalRooms = hotels.reduce((a, h) => a + (h.totalRooms ?? 0), 0);
  const live = (b: (typeof bookings)[number]) =>
    b.status !== "CANCELLED" &&
    new Date(b.checkIn).getTime() <= now &&
    new Date(b.checkOut).getTime() > now;

  // Per-hotel occupancy
  const occByHotel = hotels.map((h) => {
    const hb = bookings.filter((b) => b.hotelId === h.id && live(b));
    const occRooms = Math.min(
      h.totalRooms,
      hb.reduce((a, b) => a + (b.rooms ?? 1), 0),
    );
    return {
      hotel: h,
      occRooms,
      pct: h.totalRooms ? Math.round((occRooms / h.totalRooms) * 100) : 0,
      activeBookings: hb.length,
    };
  });
  const occupiedRooms = occByHotel.reduce((a, o) => a + o.occRooms, 0);
  const occupancyPct = totalRooms
    ? Math.round((occupiedRooms / totalRooms) * 100)
    : 0;

  // ADR from real booking revenue; RevPAR = occupancy × ADR
  const revenueBookings = bookings.filter((b) => b.status !== "CANCELLED");
  const adr =
    revenueBookings.length > 0
      ? Math.round(
          revenueBookings.reduce(
            (a, b) => a + (b.revenue ?? 0) / Math.max(1, b.rooms ?? 1),
            0,
          ) / revenueBookings.length,
        )
      : Math.round(
          hotels.reduce((a, h) => a + (h.baselineADR ?? 0), 0) /
            Math.max(1, hotels.length),
        );
  const revpar = Math.round((occupancyPct / 100) * adr);

  // Room-type mix
  const mix = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === "CANCELLED") continue;
    mix.set(b.roomType, (mix.get(b.roomType) ?? 0) + 1);
  }
  const roomMix = Array.from(mix.entries())
    .map(([type, n]) => ({ type, n }))
    .sort((a, b) => b.n - a.n);
  const mixTotal = roomMix.reduce((a, m) => a + m.n, 0) || 1;

  // Upcoming check-ins (next 14 days)
  const upcoming = bookings
    .filter((b) => {
      const ci = new Date(b.checkIn).getTime();
      return b.status !== "CANCELLED" && ci >= now && ci - now <= 14 * DAY;
    })
    .sort((a, b) => +new Date(a.checkIn) - +new Date(b.checkIn));

  return {
    hotels,
    bookings,
    now,
    DAY,
    occByHotel,
    occupancyPct,
    adr,
    revpar,
    roomMix,
    mixTotal,
    upcoming,
  };
}
export type HospitalityOpsData = Awaited<ReturnType<typeof getHospitalityOpsData>>;

// ---------------------------------------------------------------------------
// AGRICULTURE
// ---------------------------------------------------------------------------
export async function getAgricultureOpsData(_ar: boolean) {
  // Farms are workspace-scoped; Crops aren't (no companyId) — scope
  // them via the farm ids we just fetched.
  const farms = await prisma.farm.findMany({ orderBy: { name: "asc" } });
  const farmIds = farms.map((f) => f.id);
  const crops = farmIds.length
    ? await prisma.crop.findMany({
        where: { farmId: { in: farmIds } },
        orderBy: { expectedHarvest: "asc" },
        take: 500,
      })
    : [];

  const now = Date.now();
  const DAY = 86_400_000;
  const growing = crops.filter((c) => c.status === "GROWING");
  const harvested = crops.filter(
    (c) => c.status === "HARVESTED" && c.actualYieldKg != null,
  );
  const expSum = harvested.reduce((a, c) => a + (c.expectedYieldKg ?? 0), 0);
  const actSum = harvested.reduce((a, c) => a + (c.actualYieldKg ?? 0), 0);
  const yieldReal = expSum > 0 ? Math.round((actSum / expSum) * 100) : 0;
  const nearHarvest = growing
    .filter((c) => {
      const d = (new Date(c.expectedHarvest).getTime() - now) / DAY;
      return d >= 0 && d <= 14;
    })
    .sort(
      (a, b) =>
        +new Date(a.expectedHarvest) - +new Date(b.expectedHarvest),
    );

  const STATUS_ORDER = ["PLANTED", "GROWING", "HARVESTED", "FAILED"];
  const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
    PLANTED: { ar: "مزروع", en: "Planted" },
    GROWING: { ar: "ينمو", en: "Growing" },
    HARVESTED: { ar: "محصود", en: "Harvested" },
    FAILED: { ar: "فاشل", en: "Failed" },
  };
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s] ?? { ar: s, en: s },
    items: crops.filter((c) => c.status === s),
  })).filter((col) => col.items.length > 0);

  return {
    farms,
    crops,
    now,
    DAY,
    growing,
    harvested,
    yieldReal,
    nearHarvest,
    byStatus,
  };
}
export type AgricultureOpsData = Awaited<ReturnType<typeof getAgricultureOpsData>>;

// ---------------------------------------------------------------------------
// EDUCATION
// ---------------------------------------------------------------------------
export async function getEducationOpsData(_ar: boolean) {
  const programs = await prisma.program.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalFunding = programs.reduce((a, p) => a + (p.fundingJod ?? 0), 0);
  const cohorts = Array.from(new Set(programs.map((p) => p.cohort))).sort();

  // Stage board — incubator pipeline
  const STAGE_ORDER = ["INTAKE", "SCREENING", "ACTIVE", "DEMO", "GRADUATED", "EXITED"];
  const STAGE_LABEL: Record<string, { ar: string; en: string }> = {
    INTAKE: { ar: "استقبال", en: "Intake" },
    SCREENING: { ar: "فرز", en: "Screening" },
    ACTIVE: { ar: "نشط", en: "Active" },
    DEMO: { ar: "عرض", en: "Demo day" },
    GRADUATED: { ar: "متخرّج", en: "Graduated" },
    EXITED: { ar: "خروج", en: "Exited" },
  };
  const seen = Array.from(new Set(programs.map((p) => p.stage)));
  const ordered = [
    ...STAGE_ORDER.filter((s) => seen.includes(s)),
    ...seen.filter((s) => !STAGE_ORDER.includes(s)).sort(),
  ];
  const byStage = ordered
    .map((s) => ({
      stage: s,
      label: STAGE_LABEL[s] ?? { ar: s, en: s },
      items: programs.filter((p) => p.stage === s),
    }))
    .filter((c) => c.items.length > 0);

  // Funding by cohort
  const fundByCohort = cohorts
    .map((c) => ({
      cohort: c,
      total: programs
        .filter((p) => p.cohort === c)
        .reduce((a, p) => a + (p.fundingJod ?? 0), 0),
      n: programs.filter((p) => p.cohort === c).length,
    }))
    .sort((a, b) => b.total - a.total);
  const fundMax = Math.max(1, ...fundByCohort.map((f) => f.total));

  return {
    programs,
    totalFunding,
    cohorts,
    byStage,
    fundByCohort,
    fundMax,
  };
}
export type EducationOpsData = Awaited<ReturnType<typeof getEducationOpsData>>;

// ---------------------------------------------------------------------------
// HOLDING
// Holding = the parent. Its "operations" ARE the portfolio. We use the
// UNSCOPED client deliberately: a holding workspace should see every
// sub-unit, not just its own (near-empty) rows.
// ---------------------------------------------------------------------------
export async function getHoldingOpsData(_ar: boolean) {
  const companies = await prismaUnscoped.company.findMany({
    orderBy: { employees: "desc" },
  });
  // Time-Machine aware — the 30d portfolio window ends at the cursor,
  // so the roll-up shows the group as it stood on that past day.
  const { asOf } = getAsOf();
  const DAY = 86_400_000;
  const until = asOf ?? new Date();
  const since = new Date(until.getTime() - 30 * DAY);
  const window = { gte: since, lte: until };

  const rows = await Promise.all(
    companies.map(async (c) => {
      const [rev, exp, headcount] = await Promise.all([
        prismaUnscoped.transaction.aggregate({
          _sum: { amount: true },
          where: { companyId: c.id, kind: "REVENUE", occurredAt: window },
        }),
        prismaUnscoped.transaction.aggregate({
          _sum: { amount: true },
          where: { companyId: c.id, kind: "EXPENSE", occurredAt: window },
        }),
        prismaUnscoped.user.count({ where: { companyId: c.id } }),
      ]);
      const r = rev._sum.amount ?? 0;
      const e = exp._sum.amount ?? 0;
      return {
        c,
        rev: r,
        net: r - e,
        margin: r > 0 ? Math.round(((r - e) / r) * 100) : 0,
        headcount,
      };
    }),
  );
  rows.sort((a, b) => b.rev - a.rev);

  const groupRev = rows.reduce((a, x) => a + x.rev, 0);
  const groupNet = rows.reduce((a, x) => a + x.net, 0);
  const groupStaff = companies.reduce((a, c) => a + (c.employees ?? 0), 0);
  const revMax = Math.max(1, ...rows.map((x) => x.rev));

  const SECTOR_LABEL: Record<string, { ar: string; en: string }> = {
    HOSPITALITY: { ar: "ضيافة", en: "Hospitality" },
    DAIRY: { ar: "ألبان", en: "Dairy" },
    AGRICULTURE: { ar: "زراعة", en: "Agriculture" },
    EDUCATION: { ar: "تعليم", en: "Education" },
    INVESTMENT: { ar: "استثمار", en: "Investment" },
    TRADE: { ar: "تجارة", en: "Trade" },
  };

  return {
    companies,
    rows,
    groupRev,
    groupNet,
    groupStaff,
    revMax,
    SECTOR_LABEL,
  };
}
export type HoldingOpsData = Awaited<ReturnType<typeof getHoldingOpsData>>;
