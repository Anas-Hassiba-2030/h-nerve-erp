import { rankById, type Rank } from "@/lib/utils/gamification";
import { getLocale } from "@/lib/i18n/i18n.server";

// BILINGUAL: rank name + bonus suffix flip AR/EN. Locale from the optional
// `locale` prop or the h_nerve_locale cookie (server component). Previously the
// rank name (r.ar) + "٪ بونص" suffix were hardcoded Arabic.
export function RankBadge({
  rank,
  size = "md",
  showLabel = true,
  locale,
}: {
  rank: Rank | string;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  locale?: "ar" | "en";
}) {
  const ar = (locale ?? getLocale()) === "ar";
  const r = rankById(rank);
  const cls =
    size === "xl" ? "rank-piece rank-piece-xl" :
    size === "lg" ? "rank-piece rank-piece-lg" :
    size === "sm" ? "rank-piece text-base h-7 w-7 rounded-md" :
    "rank-piece text-2xl";

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${cls} anim-pop`} style={{ color: r.color }} aria-label={r.en}>
        {r.symbol}
      </span>
      {showLabel ? (
        <span className="flex flex-col leading-tight">
          <span className="text-xs font-extrabold" style={{ color: "var(--text)" }}>
            {ar ? r.ar : r.en}
          </span>
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            +{r.bonusPercent}{ar ? "٪ بونص" : "% bonus"}
          </span>
        </span>
      ) : null}
    </span>
  );
}
