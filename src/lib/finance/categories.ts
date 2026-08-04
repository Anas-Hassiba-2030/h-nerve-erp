// lib/finance/categories.ts — canonical Transaction.category values.
//
// WHY THIS EXISTS: `Transaction.category` is a free-text column, and the finance
// form offered a bare text input with a placeholder ("حجوزات / رواتب / تسويق…").
// That is fine for a human reading one row and useless for anything that has to
// AGGREGATE — which is exactly what the VOAC's ceiling calculation needs. With
// free text, "F&B", "f&b", "أغذية ومشروبات" and "food and beverage" are four
// different categories, so a query for hotel dairy spend returns nothing while
// the spend plainly exists.
//
// So: a canonical list with Arabic labels, plus a normaliser that folds the
// obvious spelling variants onto it. Free text is still ALLOWED — the column is
// unchanged and old rows keep working — but the form now suggests these, and
// analytics resolve through `normalizeCategory`.
//
// Pure module. No DB.

export type TransactionCategory = {
  /** Stored in Transaction.category. Stable, uppercase, ASCII. */
  id: string;
  labelAr: string;
  labelEn: string;
  /** "INCOME" | "EXPENSE" | "BOTH" — which side of the ledger it usually lands on. */
  side: "INCOME" | "EXPENSE" | "BOTH";
  /** Spelling variants folded onto this id by normalizeCategory (lowercased). */
  aliases: string[];
};

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  // --- Hospitality ---------------------------------------------------
  {
    id: "ROOMS",
    labelAr: "إيرادات الغرف",
    labelEn: "Room revenue",
    side: "INCOME",
    aliases: ["rooms", "حجوزات", "غرف", "room revenue", "accommodation"],
  },
  {
    id: "FNB",
    labelAr: "أغذية ومشروبات",
    labelEn: "Food & Beverage",
    side: "BOTH",
    aliases: ["f&b", "fnb", "f and b", "food", "food & beverage", "food and beverage", "أغذية", "مأكولات", "أغذية ومشروبات", "مطعم"],
  },
  {
    id: "FNB_DAIRY",
    labelAr: "أغذية ومشروبات — ألبان",
    labelEn: "F&B — dairy purchases",
    side: "EXPENSE",
    // The category the VOAC's cross-company brokerage actually depends on:
    // without it, hotel dairy spend is invisible and the flagship flow cannot
    // be quantified at all. See docs/VOAC-RUNTIME.md §8.
    aliases: ["dairy", "ألبان", "مشتريات ألبان", "dairy purchases", "f&b dairy"],
  },
  // --- Operating -----------------------------------------------------
  {
    id: "PAYROLL",
    labelAr: "رواتب وأجور",
    labelEn: "Payroll",
    side: "EXPENSE",
    aliases: ["payroll", "رواتب", "أجور", "salaries", "wages"],
  },
  {
    id: "MARKETING",
    labelAr: "تسويق",
    labelEn: "Marketing",
    side: "EXPENSE",
    aliases: ["marketing", "تسويق", "advertising", "دعاية"],
  },
  {
    id: "UTILITIES",
    labelAr: "خدمات ومرافق",
    labelEn: "Utilities",
    side: "EXPENSE",
    aliases: ["utilities", "مرافق", "كهرباء", "ماء", "energy"],
  },
  {
    id: "MAINTENANCE",
    labelAr: "صيانة",
    labelEn: "Maintenance",
    side: "EXPENSE",
    aliases: ["maintenance", "صيانة", "repairs"],
  },
  // --- Production / supply -------------------------------------------
  {
    id: "DAIRY",
    labelAr: "إنتاج الألبان",
    labelEn: "Dairy production",
    side: "BOTH",
    aliases: ["dairy production", "إنتاج ألبان", "milk"],
  },
  {
    id: "PRODUCE",
    labelAr: "محاصيل ومنتجات زراعية",
    labelEn: "Produce",
    side: "BOTH",
    aliases: ["produce", "محاصيل", "زراعة", "crops"],
  },
  {
    id: "FEED",
    labelAr: "أعلاف",
    labelEn: "Animal feed",
    side: "BOTH",
    aliases: ["feed", "أعلاف", "fodder", "علف"],
  },
  {
    id: "LOGISTICS",
    labelAr: "نقل وشحن",
    labelEn: "Logistics",
    side: "EXPENSE",
    aliases: ["logistics", "نقل", "شحن", "freight", "shipping"],
  },
  // --- Education ------------------------------------------------------
  {
    id: "TUITION",
    labelAr: "رسوم دراسية",
    labelEn: "Tuition",
    side: "INCOME",
    aliases: ["tuition", "رسوم", "رسوم دراسية", "fees"],
  },
  // --- Catch-all ------------------------------------------------------
  {
    id: "OTHER",
    labelAr: "أخرى",
    labelEn: "Other",
    side: "BOTH",
    aliases: ["other", "أخرى", "misc", "متفرقات"],
  },
];

const BY_ID = new Map(TRANSACTION_CATEGORIES.map((c) => [c.id, c]));

const BY_ALIAS = (() => {
  const m = new Map<string, string>();
  for (const c of TRANSACTION_CATEGORIES) {
    m.set(c.id.toLowerCase(), c.id);
    for (const a of c.aliases) m.set(a.toLowerCase(), c.id);
  }
  return m;
})();

export function getCategory(id: string): TransactionCategory | undefined {
  return BY_ID.get(id);
}

/**
 * Fold a free-text category onto a canonical id.
 *
 * Returns null when nothing matches — the caller then knows it is looking at a
 * genuinely uncategorised row rather than silently bucketing it into OTHER,
 * which would hide how much of the ledger is untagged.
 */
export function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  return BY_ALIAS.get(key) ?? null;
}

/**
 * The categories that represent a hotel BUYING dairy — the demand side of the
 * VOAC's flagship cross-company flow.
 */
export const FNB_DAIRY_CATEGORY_IDS = ["FNB_DAIRY", "FNB", "DAIRY"] as const;

/** Does this raw category represent hotel-side dairy/F&B spend? */
export function isFnbDairySpend(raw: string | null | undefined): boolean {
  const id = normalizeCategory(raw);
  return id !== null && (FNB_DAIRY_CATEGORY_IDS as readonly string[]).includes(id);
}

/** Label for display, falling back to the raw string for legacy free text. */
export function categoryLabel(raw: string | null | undefined, locale: "ar" | "en" = "ar"): string {
  const id = normalizeCategory(raw);
  const cat = id ? BY_ID.get(id) : undefined;
  if (!cat) return (raw ?? "").trim() || (locale === "ar" ? "غير مصنّف" : "Uncategorised");
  return locale === "ar" ? cat.labelAr : cat.labelEn;
}
