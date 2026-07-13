// prisma/seedSectors.ts — C9 incremental / additive seeding.
//
// The companion to prisma/seed.ts's monolithic seedOperator(). Where
// seedOperator() WIPES then rebuilds everything (the "re-seed from scratch"
// path), seedMissingSectors() is ADDITIVE and IDEMPOTENT:
//
//   1. read live entity counts (cross-workspace),
//   2. diff them against the declarative recipes via planIncrementalSeed()
//      (lib/genesis/recipes.ts) to find sectors with status === "empty",
//   3. ensure the shared parents (companies + users) exist via find-or-create
//      — NEVER deleteMany, never overwrite,
//   4. run ONLY the missing sectors' builders (the exact functions
//      seedOperator() composes, reused).
//
// It is safe to re-run: a sector that already has data is skipped, and the
// parents are upserted by their natural keys (company.code, user.email).
//
// This module is run via the /admin/genesis wizard action (additive path) and
// is import-safe in a live Next.js process. It does NOT touch seedOperator()'s
// behaviour — that remains the destructive full reseed.

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { planIncrementalSeed } from "../../src/lib/genesis/recipes";
import {
  seedHospitality,
  seedDairy,
  seedAgri,
  seedEducation,
  seedIntelligence,
  restoreRandom,
  type SeedCtx,
} from "./seed";

// Map a recipe sector id → its builder. `people` has no builder here because
// it IS the shared parents, which ensureSeedCtx() find-or-creates regardless.
const SECTOR_BUILDERS: Record<string, (ctx: SeedCtx) => Promise<void>> = {
  hospitality: seedHospitality,
  dairy: seedDairy,
  agriculture: seedAgri,
  education: seedEducation,
  intelligence: seedIntelligence,
};

export type IncrementalSeedResult = {
  /** Sector ids selected as empty by the planner. */
  planned: string[];
  /** Sector ids whose builder actually ran (planned ∩ has-a-builder). */
  built: string[];
  /** Sector ids selected but skipped because they have no builder (people). */
  skippedNoBuilder: string[];
  /** True when the planner found nothing missing. */
  nothingToDo: boolean;
};

/**
 * Read the same live counts the /admin/genesis page reads, so the additive
 * planner sees the workspace exactly as the wizard preview does.
 */
async function readLiveCounts(db: PrismaClient): Promise<Record<string, number>> {
  const safe = async (fn: () => Promise<number>) => {
    try {
      return await fn();
    } catch {
      return 0;
    }
  };
  const [
    companies,
    hotels,
    bookings,
    users,
    insights,
    brainEdges,
    dairyBatches,
    supplyForecasts,
    farms,
    crops,
    programs,
    documents,
  ] = await Promise.all([
    safe(() => db.company.count()),
    safe(() => db.hotel.count()),
    safe(() => db.booking.count()),
    safe(() => db.user.count()),
    safe(() => db.aIInsight.count()),
    safe(() => db.brainEdge.count()),
    safe(() => db.dairyBatch.count()),
    safe(() => db.supplyForecast.count()),
    safe(() => db.farm.count()),
    safe(() => db.crop.count()),
    safe(() => db.program.count()),
    safe(() => db.document.count()),
  ]);
  return {
    companies,
    hotels,
    bookings,
    users,
    insights,
    brainEdges,
    dairyBatches,
    supplyForecasts,
    farms,
    crops,
    programs,
    documents,
  };
}

// ---------------------------------------------------------------------------
// Shared parents — find-or-create. These mirror the company/user shapes the
// canonical seed creates (prisma/seed.ts), but they NEVER wipe and they
// upsert by natural key so re-running is a no-op when the parents exist.
// ---------------------------------------------------------------------------

const COMPANY_SEEDS = [
  { code: "ARENA", name: "أرينا سبيس للضيافة", nameEn: "Arena Space Hospitality", sector: "HOSPITALITY", country: "JO", city: "عمّان", foundedYear: 2014, employees: 240, brandColor: "amber", ticker: "ARENA.ASE", description: "سلسلة فنادق ومنتجعات متميزة في عمّان وبلغاريا، تستهدف رجال الأعمال والسياحة العائلية الفاخرة." },
  { code: "MAHA", name: "المها للألبان", nameEn: "Maha Dairy Industries", sector: "DAIRY", country: "JO", city: "الزرقاء", foundedYear: 1992, employees: 380, brandColor: "sky", ticker: "MAHA.ASE", description: "ذراع مجموعة الحوراني في الصناعات الغذائية: الألبان، اللبنة، الجبن الأبيض، والمنتجات الطازجة." },
  { code: "LORAN", name: "لوران للاستثمار الزراعي", nameEn: "Loran Agricultural Investment", sector: "AGRICULTURE", country: "JO", city: "الأغوار", foundedYear: 2001, employees: 165, brandColor: "emerald", ticker: "LORAN.ASE", description: "دفيئات ذكية، مزارع مفتوحة، وثروة حيوانية. مزوّد المجموعة الرئيسي بالخضروات الطازجة والألبان الخام." },
  { code: "AAU", name: "جامعة عمّان الأهلية", nameEn: "Al-Ahliyya Amman University", sector: "EDUCATION", country: "JO", city: "عمّان", foundedYear: 1990, employees: 1200, brandColor: "indigo", ticker: "AAU.ASE", description: "أول جامعة خاصة في الأردن، تحتضن «The Tank» لريادة الأعمال ودفيئة زراعية ذكية للأبحاث التطبيقية." },
  { code: "HH", name: "الحوراني القابضة", nameEn: "Hourani Holding", sector: "INVESTMENT", country: "JO", city: "عمّان", foundedYear: 1979, employees: 80, brandColor: "slate", ticker: "HH.ASE", description: "الكيان الأم — يدير محفظة الاستثمارات والشراكات الاستراتيجية للمجموعة منذ 1979." },
] as const;

/**
 * Find-or-create the five companies + eight users that every sector builder
 * needs, then assemble the SeedCtx. Idempotent: existing rows are reused
 * (matched by company.code / user.email), missing ones are created. No wipe.
 */
export async function ensureSeedCtx(db: PrismaClient): Promise<SeedCtx> {
  // -- Companies (find-or-create by unique code) ----------------------------
  const byCode: Record<string, any> = {};
  for (const c of COMPANY_SEEDS) {
    const existing = await db.company.findFirst({ where: { code: c.code } });
    byCode[c.code] = existing ?? (await db.company.create({ data: { ...c } }));
  }
  const arena = byCode.ARENA;
  const maha = byCode.MAHA;
  const loran = byCode.LORAN;
  const aau = byCode.AAU;
  const hHolding = byCode.HH;
  const allCompanies = [arena, maha, loran, aau, hHolding];

  // -- Users (find-or-create by unique email) -------------------------------
  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "admin123", 10);
  const userSeeds = [
    { email: "admin@hourani.jo", name: "أنس حسيبة", role: "ADMIN", title: "مهندس النظام المركزي", companyId: hHolding.id, avatarColor: "emerald", rank: "KING", xp: 920, loginCount: 87, bonusPercent: 12 },
    { email: "anashasiba91@gmail.com", name: "أنس حسيبة", role: "ADMIN", title: "المالك · مهندس النظام", companyId: hHolding.id, avatarColor: "gold", rank: "KING", xp: 1000, loginCount: 1, bonusPercent: 12 },
    { email: "ceo@hourani.jo", name: "د. عبدالله الحوراني", role: "EXECUTIVE", title: "الرئيس التنفيذي للمجموعة", companyId: hHolding.id, avatarColor: "amber", rank: "KING", xp: 1100, loginCount: 142, bonusPercent: 15 },
    { email: "arena.gm@hourani.jo", name: "ريم الزواهرة", role: "MANAGER", title: "مدير عام أرينا سبيس", companyId: arena.id, avatarColor: "amber", rank: "QUEEN", xp: 410, loginCount: 58, bonusPercent: 9 },
    { email: "maha.gm@hourani.jo", name: "م. خالد العمري", role: "MANAGER", title: "مدير الإنتاج — المها", companyId: maha.id, avatarColor: "sky", rank: "KNIGHT", xp: 245, loginCount: 41, bonusPercent: 6 },
    { email: "loran.gm@hourani.jo", name: "م. ليلى أبو رمان", role: "MANAGER", title: "مدير المزارع — لوران", companyId: loran.id, avatarColor: "emerald", rank: "KNIGHT", xp: 220, loginCount: 38, bonusPercent: 6 },
    { email: "staff@hourani.jo", name: "نور الخطيب", role: "STAFF", title: "أخصائي تسويق رقمي", companyId: arena.id, avatarColor: "amber", rank: "BISHOP", xp: 95, loginCount: 24, bonusPercent: 3 },
    { email: "newhire@hourani.jo", name: "محمد الزغول", role: "STAFF", title: "محلل عمليات", companyId: maha.id, avatarColor: "sky", rank: "PAWN", xp: 28, loginCount: 6, bonusPercent: 1 },
  ];
  const byEmail: Record<string, any> = {};
  for (const u of userSeeds) {
    const existing = await db.user.findFirst({ where: { email: u.email } });
    byEmail[u.email] = existing ?? (await db.user.create({ data: { ...u, passwordHash: adminHash } }));
  }
  const allUsers = userSeeds.map((u) => byEmail[u.email]);

  return {
    prisma: db,
    companies: { arena, maha, loran, aau, hHolding },
    allCompanies,
    users: {
      admin: byEmail["admin@hourani.jo"],
      owner: byEmail["anashasiba91@gmail.com"],
      ceo: byEmail["ceo@hourani.jo"],
      arenaGm: byEmail["arena.gm@hourani.jo"],
      mahaGm: byEmail["maha.gm@hourani.jo"],
      loranGm: byEmail["loran.gm@hourani.jo"],
      staffMember: byEmail["staff@hourani.jo"],
      newHire: byEmail["newhire@hourani.jo"],
    },
    allUsers,
  };
}

/**
 * ADDITIVE, IDEMPOTENT seed. Reads live counts, plans which sectors are empty,
 * ensures shared parents exist (no wipe), and runs only the missing builders.
 *
 * @param db Prisma client to use (the action passes prismaUnscoped so the
 *           top-up writes the default workspace, mirroring db:seed).
 */
export async function seedMissingSectors(db: PrismaClient): Promise<IncrementalSeedResult> {
  const counts = await readLiveCounts(db);
  const planned = planIncrementalSeed(counts);

  if (planned.length === 0) {
    return { planned: [], built: [], skippedNoBuilder: [], nothingToDo: true };
  }

  // Build the shared parents once — find-or-create, never wipe.
  const ctx = await ensureSeedCtx(db);

  const built: string[] = [];
  const skippedNoBuilder: string[] = [];
  try {
    for (const sectorId of planned) {
      const builder = SECTOR_BUILDERS[sectorId];
      if (!builder) {
        // `people` (parents) is selected when the workspace had no users; the
        // parents are already ensured above, so there's nothing more to build.
        skippedNoBuilder.push(sectorId);
        continue;
      }
      await builder(ctx);
      built.push(sectorId);
    }
  } finally {
    // Importing prisma/seed.ts patches Math.random to a seeded PRNG; don't
    // leave a live Next.js process with a deterministic global RNG.
    restoreRandom();
  }

  return { planned, built, skippedNoBuilder, nothingToDo: false };
}
