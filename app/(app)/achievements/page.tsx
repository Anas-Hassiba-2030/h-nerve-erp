import { Trophy, Crown, Medal, Star, Check, Lock, Sparkles, Award } from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { CompanyCover } from "@/components/empire/CompanyCover";
import { RankBadge } from "@/components/ui/RankBadge";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { RANKS, rankById, progressToNext } from "@/lib/utils/gamification";
import { formatNumber } from "@/lib/utils/utils";
import { Confetti } from "@/components/ui/Confetti";
import "../daylight.css";

export const dynamic = "force-dynamic";

// Tier visual identity — these are recognizable medal colors so they stay
// constant across themes (avoid theme tokens here on purpose).
const TIER_VISUAL: Record<
  string,
  { gradient: string; icon: typeof Trophy; bandColor: string; textOn: string }
> = {
  BRONZE: {
    gradient: "linear-gradient(135deg, #fbbf24 0%, #b45309 100%)",
    icon: Medal,
    bandColor: "#b45309",
    textOn: "#3b1f00",
  },
  SILVER: {
    gradient: "linear-gradient(135deg, #f3f4f6 0%, #6b7280 100%)",
    icon: Trophy,
    bandColor: "#6b7280",
    textOn: "#1f2937",
  },
  GOLD: {
    gradient: "linear-gradient(135deg, #fde68a 0%, #d97706 100%)",
    icon: Crown,
    bandColor: "#d97706",
    textOn: "#3b1f00",
  },
  PLATINUM: {
    gradient: "linear-gradient(135deg, #c4b5fd 0%, #6d28d9 100%)",
    icon: Star,
    bandColor: "#6d28d9",
    textOn: "#1e1b4b",
  },
};

const TIER_ORDER = ["PLATINUM", "GOLD", "SILVER", "BRONZE"] as const;

const TIER_LABEL: Record<string, { ar: string; en: string }> = {
  BRONZE: { ar: "البرونزية", en: "Bronze" },
  SILVER: { ar: "الفضية", en: "Silver" },
  GOLD: { ar: "الذهبية", en: "Gold" },
  PLATINUM: { ar: "البلاتينية", en: "Platinum" },
};

// Avatar circles use the user's chosen accent — schema stores a Tailwind-style
// color name; this maps to a real hex.
const AVATAR_COLOR: Record<string, string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#64748b",
  red: "#ef4444",
  green: "#22c55e",
  indigo: "#6366f1",
  pink: "#ec4899",
  sky: "#0ea5e9",
  teal: "#14b8a6",
};
const avatarColorFor = (c: string | null | undefined) =>
  AVATAR_COLOR[(c ?? "").toLowerCase()] ?? AVATAR_COLOR.emerald;

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const PODIUM_MEDAL = ["🥇", "🥈", "🥉"] as const;

export default async function AchievementsPage() {
  const ar = getLocale() === "ar";
  const session = await getCurrentUser();
  if (!session) return null;

  const [me, allAchievements, leaderboard] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      include: { achievements: { include: { achievement: true } } },
    }),
    prisma.achievement.findMany({ orderBy: { threshold: "asc" }, take: 100 }),
    prisma.user.findMany({
      orderBy: { xp: "desc" },
      include: { company: true, _count: { select: { achievements: true } } },
      take: 10,
    }),
  ]);

  const earnedIds = new Set(me?.achievements.map((a) => a.achievementId) ?? []);
  const earnedAtById = new Map(
    me?.achievements.map((ua) => [ua.achievementId, ua.earnedAt]) ?? [],
  );
  const earnedCount = earnedIds.size;
  const totalCount = allAchievements.length;
  const myRank = rankById(me?.rank ?? "PAWN");

  // Group catalog by tier; only render sections that have entries.
  type Achievement = (typeof allAchievements)[number];
  const byTier: Record<string, Achievement[]> = {
    BRONZE: [],
    SILVER: [],
    GOLD: [],
    PLATINUM: [],
  };
  for (const a of allAchievements) {
    const key = a.tier in byTier ? a.tier : "BRONZE";
    byTier[key].push(a);
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Date format for earnedAt — en-US digits per established convention.
  const dateFmt = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      {myRank.id === "KING" ? <Confetti pieces={80} /> : null}
      <DaylightHeader
        eyebrow={ar ? "الفريق والمهام" : "People & Tasks"}
        title={ar ? "الإنجازات والرتب" : "Achievements & Ranks"}
        subtitle={
          ar
            ? "نظام رتب الشطرنج: من بيدق إلى ملك. كل رتبة تفتح بونصاً أعلى."
            : "Chess-rank system: Pawn to King. Each rank unlocks a bigger bonus."
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "رتبتك" : "Your rank"} value={`${myRank.symbol} ${ar ? myRank.ar : myRank.en}`} hint={`+${myRank.bonusPercent}% ${ar ? "بونص" : "bonus"}`} />
        <DaylightKpi label="XP" value={formatNumber(me?.xp ?? 0)} hint={ar ? "نقاط الخبرة" : "experience"} />
        <DaylightKpi label={ar ? "إنجازات مفتوحة" : "Badges unlocked"} value={formatNumber(earnedCount)} hint={`/ ${totalCount}`} />
        <DaylightKpi label={ar ? "نسبة البونص" : "Bonus rate"} value={formatNumber(me?.bonusPercent ?? 0)} hint="%" />
      </DaylightKpiGrid>

        {/* Rank + XP strip */}
        <DaylightPanel
          title={ar ? `${myRank.ar} · ${formatNumber(me?.xp ?? 0)} XP` : `${myRank.en} · ${formatNumber(me?.xp ?? 0)} XP`}
          aside={ar ? `+${myRank.bonusPercent}% بونص` : `+${myRank.bonusPercent}% bonus`}
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl" aria-label={ar ? myRank.ar : myRank.en}>{myRank.symbol}</span>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--ink-muted)", maxWidth: 480 }}>
              {ar
                ? "شغفك يُقاس. كل تسجيل دخول، كل مهمة، كل فكرة تنتج XP — وكل XP يقربك من الملك."
                : "Your effort is measured. Every login, task, idea earns XP — every XP closer to the crown."}
            </p>
          </div>
        </DaylightPanel>

        {/* Rank ladder */}
        <DaylightPanel title={ar ? "سلم الرتب" : "Rank ladder"} aside={ar ? "السلم" : "Ladder"}>
          <div className="grid gap-3 md:grid-cols-5">
            {RANKS.map((r) => {
              const isCurrent = r.id === myRank.id;
              const xp = me?.xp ?? 0;
              const reached = xp >= r.minXp;
              return (
                <div
                  key={r.id}
                  className={`relative rounded-2xl p-4 text-center transition   ${isCurrent ? "ring-2 " : ""}`}
                  style={{
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    [`--tw-ring-color` as any]: r.color,
                  }}
                >
                  {isCurrent ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: "var(--gold)", color: "#1a0e02" }}>
                      {ar ? "أنت هنا" : "YOU"}
                    </span>
                  ) : null}
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-4xl font-bold"
                    style={{
                      background: reached
                        ? "linear-gradient(135deg, var(--gold) 0%, var(--gold) 100%)"
                        : "var(--cream)",
                      color: reached ? "white" : r.color,
                      opacity: reached ? 1 : 0.4,
                    }}
                  >
                    {r.symbol}
                  </div>
                  <div className="mt-2 text-base font-semibold" style={{ color: "var(--ink)" }}>
                    {ar ? r.ar : r.en}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {formatNumber(r.minXp)} XP · +{r.bonusPercent}٪
                  </div>
                </div>
              );
            })}
          </div>
        </DaylightPanel>

        {/* Medal catalog — grouped by tier, highest first */}
        <DaylightPanel title={ar ? "كتالوج الميداليات" : "Medal catalog"} aside={`${earnedCount} / ${totalCount}`}>
          <div className="space-y-6">
          {TIER_ORDER.filter((t) => byTier[t].length > 0).map((tier) => {
            const items = byTier[tier];
            const visual = TIER_VISUAL[tier];
            const Icon = visual.icon;
            const tierEarned = items.filter((a) => earnedIds.has(a.id)).length;

            return (
              <div key={tier} className="space-y-3">
                <header className="flex items-center gap-3 ">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: visual.gradient,
                      color: visual.textOn,
                      boxShadow: `0 6px 16px -6px ${visual.bandColor}`,
                    }}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "var(--ink)" }}
                    >
                      {ar ? TIER_LABEL[tier].ar : TIER_LABEL[tier].en}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      {tierEarned} / {items.length}{" "}
                      {ar ? "مفتوح" : "earned"}
                    </div>
                  </div>
                  <span
                    className="ms-auto h-px flex-1"
                    style={{ background: "var(--line)" }}
                    aria-hidden
                  />
                </header>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((a) => {
                    const earned = earnedIds.has(a.id);
                    const earnedAt = earnedAtById.get(a.id);
                    return (
                      <article
                        key={a.id}
                        className={`  relative overflow-hidden rounded-2xl border p-4 ${earned ? "" : "grayscale"}`}
                        style={{
                          background: visual.gradient,
                          color: visual.textOn,
                          borderColor: earned
                            ? visual.bandColor
                            : "rgba(0,0,0,0.1)",
                          opacity: earned ? 1 : 0.6,
                          minHeight: 140,
                        }}
                      >
                        {/* Sheen overlay for earned cards */}
                        {earned ? (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
                              mixBlendMode: "overlay",
                            }}
                          />
                        ) : null}

                        <div className="relative flex items-start justify-between gap-3">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{
                              background: "rgba(255,255,255,0.25)",
                              border: "1px solid rgba(255,255,255,0.35)",
                              backdropFilter: "blur(4px)",
                            }}
                            aria-hidden
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          {earned ? (
                            <span
                              className=" inline-flex h-7 w-7 items-center justify-center rounded-full text-white"
                              style={{
                                background: "rgba(16,185,129,0.95)",
                                boxShadow: "0 4px 12px -4px rgba(16,185,129,0.5)",
                              }}
                              aria-label={ar ? "مفتوحة" : "Earned"}
                            >
                              <Check className="h-4 w-4" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                              style={{
                                background: "rgba(0,0,0,0.25)",
                                color: "white",
                              }}
                              aria-label={ar ? "مغلقة" : "Locked"}
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>

                        <h3
                          className="relative mt-3 text-sm font-bold leading-snug"
                          style={{ color: visual.textOn }}
                        >
                          {ar ? a.name : a.nameEn}
                        </h3>
                        <p
                          className="relative mt-1 text-[11.5px] leading-relaxed"
                          style={{ color: visual.textOn, opacity: 0.85 }}
                        >
                          {a.description}
                        </p>

                        <div className="relative mt-3 flex items-center gap-1.5 text-[10.5px] font-bold">
                          {earned && earnedAt ? (
                            <span
                              className="rounded-md px-1.5 py-0.5"
                              style={{
                                background: "rgba(255,255,255,0.4)",
                                color: visual.textOn,
                              }}
                            >
                              {ar ? "فُتحت" : "Earned"} ·{" "}
                              {dateFmt.format(new Date(earnedAt))}
                            </span>
                          ) : (
                            <span
                              className="rounded-md px-1.5 py-0.5"
                              style={{
                                background: "rgba(0,0,0,0.2)",
                                color: "white",
                              }}
                            >
                              {ar ? "تفتح عند" : "Unlock at"} ·{" "}
                              {formatNumber(a.threshold)} XP
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </DaylightPanel>

        {/* Podium leaderboard */}
        <DaylightPanel title={ar ? "لوحة الصدارة" : "Leaderboard"} aside={ar ? "الأعلى XP في المجموعة" : "Top XP across the group"}>
          {/* Podium — top 3 */}
          {top3.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3 md:items-end">
              {/* Visual order: 2nd | 1st | 3rd via DOM ordering on md+ */}
              {[1, 0, 2]
                .map((idx) => top3[idx])
                .filter(Boolean)
                .map((u) => {
                  const placeIdx = top3.findIndex((x) => x.id === u.id);
                  const isMe = u.id === session.id;
                  const isFirst = placeIdx === 0;
                  const color = avatarColorFor(u.avatarColor);
                  return (
                    <article
                      key={u.id}
                      className="  relative overflow-hidden rounded-2xl p-5 text-center"
                      style={{
                        background: "var(--cream)",
                        border: `1px solid ${isMe ? "var(--gold)" : "var(--line)"}`,
                        minHeight: isFirst ? 240 : 200,
                        marginBottom: isFirst ? 0 : 12,
                      }}
                    >
                      <div
                        className="text-4xl"
                        aria-label={`${ar ? "المرتبة" : "Rank"} ${placeIdx + 1}`}
                      >
                        {PODIUM_MEDAL[placeIdx]}
                      </div>
                      <div
                        className={`relative mx-auto mt-3 flex items-center justify-center rounded-full font-bold text-white ${isFirst ? "h-20 w-20 text-2xl" : "h-16 w-16 text-xl"}`}
                        style={{
                          background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 60%, #000) 100%)`,
                          boxShadow: `0 8px 22px -8px ${color}`,
                        }}
                        aria-hidden
                      >
                        {initialsOf(u.name)}
                      </div>
                      <div className="relative mt-3">
                        <div
                          className={`font-semibold ${isFirst ? "text-base" : "text-sm"}`}
                          style={{ color: "var(--ink)" }}
                        >
                          {u.name}
                          {isMe ? (
                            <span
                              className="ms-1.5 text-[10px] font-bold"
                              style={{ color: "var(--gold)" }}
                            >
                              ({ar ? "أنت" : "you"})
                            </span>
                          ) : null}
                        </div>
                        {u.company?.name ? (
                          <div
                            className="text-[11px]"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            {u.company.name}
                          </div>
                        ) : null}
                      </div>
                      <div className="relative mt-3 flex items-center justify-center gap-2">
                        <RankBadge rank={u.rank as any} size="sm" showLabel={false} />
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color: "var(--ink)" }}
                        >
                          {formatNumber(u.xp)}
                        </span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          XP
                        </span>
                      </div>
                      <div
                        className="relative mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: "var(--cream)",
                          color: "var(--gold)",
                        }}
                      >
                        <Trophy className="h-3 w-3" />
                        {u._count.achievements}{" "}
                        {ar ? "إنجاز" : "badges"}
                      </div>
                    </article>
                  );
                })}
            </div>
          ) : null}

          {/* Rest 4-10 */}
          {rest.length > 0 ? (
            <div className="panel reveal" style={{ padding: 0, overflow: "hidden" }}>
              <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
                {rest.map((u, i) => {
                  const isMe = u.id === session.id;
                  const place = i + 4;
                  const color = avatarColorFor(u.avatarColor);
                  return (
                    <li
                      key={u.id}
                      className=" grid items-center gap-3 px-4 py-3"
                      style={{
                        gridTemplateColumns: "32px auto 1fr auto auto auto",
                        background: isMe
                          ? "var(--cream)"
                          : undefined,
                      }}
                    >
                      <span
                        className="font-mono text-sm font-bold"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        {place}
                      </span>
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 60%, #000) 100%)`,
                          boxShadow: `0 4px 10px -4px ${color}`,
                        }}
                        aria-hidden
                      >
                        {initialsOf(u.name)}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="truncate text-sm font-semibold"
                          style={{ color: "var(--ink)" }}
                        >
                          {u.name}
                          {isMe ? (
                            <span
                              className="ms-1.5 text-[10px] font-bold"
                              style={{ color: "var(--gold)" }}
                            >
                              ({ar ? "أنت" : "you"})
                            </span>
                          ) : null}
                        </div>
                        {u.company?.name ? (
                          <div
                            className="truncate text-[11px]"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            {u.company.name}
                          </div>
                        ) : null}
                      </div>
                      <RankBadge rank={u.rank as any} size="sm" showLabel={false} />
                      <span
                        className="font-mono text-sm font-bold"
                        style={{ color: "var(--ink)" }}
                      >
                        {formatNumber(u.xp)}{" "}
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          XP
                        </span>
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        <Trophy className="h-3 w-3" />
                        {u._count.achievements}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </DaylightPanel>
    </DaylightShell>
  );
}

