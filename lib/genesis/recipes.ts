// lib/genesis/recipes.ts — Phase 21 (Genesis Seed) declarative catalog.
//
// The single source of truth for the SHAPE of the Hourani demo dataset, used
// by the /admin/genesis wizard to preview what a seed instantiates BEFORE the
// operator commits — sector by sector, bilingual, with a live present/missing
// status diffed against the real database counts.
//
// This module is pure (no Prisma, no Next) so it unit-tests in isolation. The
// page passes in live counts; `summarizeGenesis()` returns per-sector status.

export type RecipeLine = {
  /** Stable id for the entity line. */
  key: string;
  ar: string;
  en: string;
  /**
   * The live-count key this line is measured against (a key in the counts
   * map the page provides). Lines that share a key are different facets of
   * the same underlying model and only the first carries the presence check.
   */
  countKey: string;
  /**
   * Approximate number a full seed creates. Loop-driven volumes are marked
   * with `approx: true` so the UI can render them as "≈ N" / "N+".
   */
  target: number;
  approx?: boolean;
};

export type Recipe = {
  id: string;
  ar: string;
  en: string;
  /** One-line bilingual subtitle describing the sector. */
  subAr: string;
  subEn: string;
  /** The single live-count key that decides this sector's presence. */
  presenceKey: string;
  lines: RecipeLine[];
};

// The four operating sectors + two cross-cutting layers (people, intelligence).
// Counts are grounded in the canonical seed (prisma/seed.ts); loop-driven
// volumes (rooms, bookings, insights) are flagged approximate.
export const GENESIS_RECIPES: Recipe[] = [
  {
    id: "hospitality",
    ar: "الضيافة",
    en: "Hospitality",
    subAr: "أرينا سبيس للضيافة — فنادق ومنتجعات",
    subEn: "Arena Space Hospitality — hotels & resorts",
    presenceKey: "hotels",
    lines: [
      { key: "hosp-co", ar: "شركة الضيافة", en: "Hospitality company", countKey: "hotels", target: 1 },
      { key: "hosp-hotels", ar: "فنادق", en: "Hotels", countKey: "hotels", target: 3 },
      { key: "hosp-rooms", ar: "غرف", en: "Rooms", countKey: "hotels", target: 200, approx: true },
      { key: "hosp-bookings", ar: "حجوزات", en: "Bookings", countKey: "bookings", target: 120, approx: true },
    ],
  },
  {
    id: "dairy",
    ar: "الألبان",
    en: "Dairy",
    subAr: "المها للألبان — خطوط إنتاج ودفعات",
    subEn: "Maha Dairy — production lines & batches",
    presenceKey: "dairyBatches",
    lines: [
      { key: "dairy-co", ar: "شركة الألبان", en: "Dairy company", countKey: "dairyBatches", target: 1 },
      { key: "dairy-batches", ar: "دفعات إنتاج", en: "Production batches", countKey: "dairyBatches", target: 30, approx: true },
      { key: "dairy-forecasts", ar: "تنبؤات التوريد", en: "Supply forecasts", countKey: "supplyForecasts", target: 24, approx: true },
    ],
  },
  {
    id: "agriculture",
    ar: "الزراعة الذكية",
    en: "Smart Agriculture",
    subAr: "لوران للزراعة — مزارع ومحاصيل",
    subEn: "Loran Agriculture — farms & crops",
    presenceKey: "farms",
    lines: [
      { key: "agri-co", ar: "شركة الزراعة", en: "Agriculture company", countKey: "farms", target: 1 },
      { key: "agri-farms", ar: "مزارع", en: "Farms", countKey: "farms", target: 4, approx: true },
      { key: "agri-crops", ar: "محاصيل", en: "Crops", countKey: "crops", target: 12, approx: true },
    ],
  },
  {
    id: "education",
    ar: "التعليم",
    en: "Education",
    subAr: "حاضنة تانك — برامج ومسارات",
    subEn: "Tank Incubator — programs & tracks",
    presenceKey: "programs",
    lines: [
      { key: "edu-co", ar: "شركة التعليم", en: "Education company", countKey: "programs", target: 1 },
      { key: "edu-programs", ar: "برامج", en: "Programs", countKey: "programs", target: 8, approx: true },
    ],
  },
  {
    id: "intelligence",
    ar: "ذكاء الدماغ",
    en: "Brain Intelligence",
    subAr: "الذاكرة السببية والإشارات والخطط",
    subEn: "Causal memory, insights & plans",
    presenceKey: "brainEdges",
    lines: [
      { key: "int-edges", ar: "روابط سببية", en: "Causal edges", countKey: "brainEdges", target: 40, approx: true },
      { key: "int-insights", ar: "إشارات الدماغ", en: "Brain insights", countKey: "insights", target: 18, approx: true },
      { key: "int-docs", ar: "مستندات المرجع", en: "Reference documents", countKey: "documents", target: 6, approx: true },
    ],
  },
  {
    id: "people",
    ar: "الأشخاص",
    en: "People",
    subAr: "مستخدمون وأدوار افتراضية",
    subEn: "Users & default roles",
    presenceKey: "users",
    lines: [
      { key: "ppl-users", ar: "مستخدمون", en: "Users", countKey: "users", target: 4, approx: true },
      { key: "ppl-companies", ar: "شركات", en: "Companies", countKey: "companies", target: 4 },
    ],
  },
];

export type SectorStatus = "empty" | "partial" | "complete";

export type SectorSummary = {
  id: string;
  ar: string;
  en: string;
  subAr: string;
  subEn: string;
  /** Live present count for the sector's presence key. */
  present: number;
  /** Sum of targets across the sector's lines. */
  target: number;
  status: SectorStatus;
  lines: Array<RecipeLine & { present: number; missing: boolean }>;
};

export type GenesisSummary = {
  sectors: SectorSummary[];
  /** True when every sector has zero presence — a blank workspace. */
  isEmpty: boolean;
  /** Number of sectors with at least some data present. */
  sectorsPresent: number;
  totalSectors: number;
};

/**
 * Diff the declarative recipes against live database counts and produce a
 * per-sector preview. Missing counts default to 0 (treated as "will create").
 */
export function summarizeGenesis(counts: Record<string, number>): GenesisSummary {
  const get = (k: string) => Math.max(0, Math.floor(counts[k] ?? 0));

  const sectors: SectorSummary[] = GENESIS_RECIPES.map((r) => {
    const present = get(r.presenceKey);
    const target = r.lines.reduce((s, l) => s + l.target, 0);
    const lines = r.lines.map((l) => {
      const linePresent = get(l.countKey);
      return { ...l, present: linePresent, missing: linePresent <= 0 };
    });
    const anyPresent = lines.some((l) => l.present > 0);
    const allPresent = lines.every((l) => l.present > 0);
    const status: SectorStatus = !anyPresent ? "empty" : allPresent ? "complete" : "partial";
    return { id: r.id, ar: r.ar, en: r.en, subAr: r.subAr, subEn: r.subEn, present, target, status, lines };
  });

  const sectorsPresent = sectors.filter((s) => s.status !== "empty").length;
  return {
    sectors,
    isEmpty: sectorsPresent === 0,
    sectorsPresent,
    totalSectors: sectors.length,
  };
}

/** The set of live-count keys the page must provide for a full summary. */
export function requiredCountKeys(): string[] {
  const keys = new Set<string>();
  for (const r of GENESIS_RECIPES) {
    keys.add(r.presenceKey);
    for (const l of r.lines) keys.add(l.countKey);
  }
  return [...keys];
}
