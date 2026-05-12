import { rankById, type Rank } from "@/lib/gamification";

export function RankBadge({
  rank,
  size = "md",
  showLabel = true,
}: {
  rank: Rank | string;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
}) {
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
          <span className="text-xs font-extrabold" style={{ color: "var(--text)" }}>{r.ar}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{r.bonusPercent}٪ بونص</span>
        </span>
      ) : null}
    </span>
  );
}
