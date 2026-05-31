import { rankById, type Rank } from "@/lib/gamification";
import { getLocale } from "@/lib/i18n.server";

// BILINGUAL: rank name + bonus suffix flip AR/EN. Locale from the optional
// `locale` prop or the h_nerve_locale cookie (server component). Previously the
// rank name + "٪ بونص" suffix were hardcoded Arabic.
export function RankBadge({
  rank,
  showBonus = true,
  locale,
}: {
  rank: Rank;
  showBonus?: boolean;
  locale?: "ar" | "en";
}) {
  const lc = locale ?? getLocale();
  const ar = lc === "ar";
  const r = rankById(rank);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rank-piece" style={{ color: r.color }}>{r.symbol}</span>
      <span className="text-sm font-semibold" style={{ color: r.color }}>
        {ar ? r.ar : r.en}
      </span>
      {showBonus && (
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          +{r.bonusPercent}{ar ? "٪ بونص" : "% bonus"}
        </span>
      )}
    </span>
  );
}
