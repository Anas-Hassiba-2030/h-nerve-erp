// Chess-rank progression for H-Nerve gamification

export type Rank = "PAWN" | "BISHOP" | "KNIGHT" | "QUEEN" | "KING";

export const RANKS: ReadonlyArray<{
  id: Rank;
  ar: string;
  en: string;
  symbol: string; // unicode chess piece
  minXp: number;
  bonusPercent: number;
  color: string;
  description: string;
  descriptionEn: string;
}> = [
  {
    id: "PAWN",
    ar: "بيدق",
    en: "Pawn",
    symbol: "♟",
    minXp: 0,
    bonusPercent: 0,
    color: "#7a8a85",
    description: "بداية الرحلة. كل ملك بدأ من هنا.",
    descriptionEn: "The journey begins. Every king started here.",
  },
  {
    id: "BISHOP",
    ar: "فيل",
    en: "Bishop",
    symbol: "♝",
    minXp: 51,
    bonusPercent: 3,
    color: "#0d7eaf",
    description: "حركة قطرية واسعة — أفق أوسع وقدرة أعلى.",
    descriptionEn: "Diagonal vision — broader horizon, sharper edge.",
  },
  {
    id: "KNIGHT",
    ar: "حصان",
    en: "Knight",
    symbol: "♞",
    minXp: 151,
    bonusPercent: 6,
    color: "#15846a",
    description: "قفزات استراتيجية — تتجاوز ما يقف في طريقك.",
    descriptionEn: "Strategic leaps — moves through obstacles.",
  },
  {
    id: "QUEEN",
    ar: "وزير",
    en: "Queen",
    symbol: "♛",
    minXp: 301,
    bonusPercent: 10,
    color: "#b06a1a",
    description: "أقوى قطعة على اللوحة — قيادة شاملة.",
    descriptionEn: "Most powerful piece — total command.",
  },
  {
    id: "KING",
    ar: "ملك",
    en: "King",
    symbol: "♚",
    minXp: 500,
    bonusPercent: 15,
    color: "#7a1f3f",
    description: "القرار النهائي. حماية المملكة كلها.",
    descriptionEn: "The final say. Guardian of the whole kingdom.",
  },
];

export function rankFor(xp: number): (typeof RANKS)[number] {
  let result = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) result = r;
  }
  return result;
}

export function nextRank(xp: number): (typeof RANKS)[number] | null {
  const idx = RANKS.findIndex((r) => xp < r.minXp);
  return idx === -1 ? null : RANKS[idx];
}

export function progressToNext(xp: number): { current: number; needed: number; pct: number } {
  const cur = rankFor(xp);
  const nxt = nextRank(xp);
  if (!nxt) return { current: xp - cur.minXp, needed: 0, pct: 1 };
  const span = nxt.minXp - cur.minXp;
  const into = xp - cur.minXp;
  return { current: into, needed: span, pct: Math.min(1, into / span) };
}

export function bonusFor(xp: number): number {
  return rankFor(xp).bonusPercent;
}

// Map a rank id to its full descriptor
export function rankById(id: string): (typeof RANKS)[number] {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}
