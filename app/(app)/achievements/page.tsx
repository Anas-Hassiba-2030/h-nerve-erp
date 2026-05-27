import { Trophy, Crown, Medal, Star, Check, Lock, Sparkles, Award } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { CompanyCover } from "@/components/CompanyCover";
import { RankBadge } from "@/components/RankBadge";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { RANKS, rankById, progressToNext } from "@/lib/gamification";
import { formatNumber } from "@/lib/utils";
import { Confetti } from "@/components/Confetti";

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
    prisma.achievement.findMany({ orderBy: { threshold: "asc" } }),
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
    <>
      {myRank.id === "KING" ? <Confetti pieces={80} /> : null}
      <PageHeader
        eyebrow={ar ? "الفريق والمهام" : "People & Tasks"}
        title={ar ? "الإنجازات والرتب" : "Achievements & Ranks"}
        subtitle={
          ar
            ? "نظام رتب الشطرنج: من بيدق إلى ملك. كل رتبة تفتح بونصاً أعلى."
            : "Chess-rank system: Pawn to King. Each rank unlocks a bigger bonus."
        }
      />

      <PageContainer>
        {/* Rank + XP strip */}
        <HeritageSection
          eyebrow={ar ? "نظام التلعيب" : "Gamification"}
          title={ar ? `${myRank.ar} · ${formatNumber(me?.xp ?? 0)} XP` : `${myRank.en} · ${formatNumber(me?.xp ?? 0)} XP`}
          aside={ar ? `+${myRank.bonusPercent}% بونص` : `+${myRank.bonusPercent}% bonus`}
          rtl={ar}
        >
          <div className="flex items-start gap-4">
            <span className="text-4xl" aria-label={ar ? myRank.ar : myRank.en}>{myRank.symbol}</span>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--heri-ink-2)", maxWidth: 480 }}>
              {ar
                ? "شغفك يُقاس. كل تسجيل دخول، كل مهمة، كل فكرة تنتج XP — وكل XP يقربك من الملك."
                : "Your effort is measured. Every login, task, idea earns XP — every XP closer to the crown."}
            </p>
          </div>
        </HeritageSection>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <div className="heri-card" style={{ padding: "18px 20px" }}>
            <div className="heri-eyebrow heri-eyebrow-ink">{ar ? "رتبتك" : "Your rank"}</div>
            <div className="mt-3 flex items-center gap-2">
              <span style={{ fontSize: 28 }}>{myRank.symbol}</span>
              <span className="heri-number" style={{ fontSize: 22, fontWeight: 600, color: "var(--heri-ochre-2)" }}>
                {ar ? myRank.ar : myRank.en}
              </span>
            </div>
            <div className="heri-number-mono mt-2" style={{ fontSize: 11, color: "var(--heri-ink-3)" }}>
              +{myRank.bonusPercent}% {ar ? "بونص" : "bonus"}
            </div>
          </div>
          <HeriKpi label="XP" raw={me?.xp ?? 0} kind="number" hint={ar ? "نقاط الخبرة" : "experience"} />
          <HeriKpi label={ar ? "إنجازات مفتوحة" : "Badges unlocked"}
            raw={earnedCount} kind="number" hint={`/ ${totalCount}`} accent="var(--heri-teal)" />
          <HeriKpi label={ar ? "نسبة البونص" : "Bonus rate"}
            raw={me?.bonusPercent ?? 0} kind="number" hint="%" accent="var(--heri-ochre)" />
        </section>

        {/* Rank ladder */}
        <HeritageSection eyebrow={ar ? "السلم" : "Ladder"} title={ar ? "سلم الرتب" : "Rank ladder"} rtl={ar}>
          <div className="grid gap-3 heri-stagger md:grid-cols-5">
            {RANKS.map((r) => {
              const isCurrent = r.id === myRank.id;
              const xp = me?.xp ?? 0;
              const reached = xp >= r.minXp;
              return (
                <div
                  key={r.id}
                  className={`relative rounded-2xl p-4 text-center transition   ${isCurrent ? "ring-2 " : ""}`}
                  style={{
                    background: reached ? "var(--heri-cream-2)" : "var(--heri-cream-2)",
                    border: "1px solid var(--border)",
                    [`--tw-ring-color` as any]: r.color,
                  }}
                >
                  {isCurrent ? (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--heri-copper)] px-2 py-0.5 text-[9px] font-black text-[#1a0e02]">
                      {ar ? "أنت هنا" : "YOU"}
                    </span>
                  ) : null}
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-4xl font-black"
                    style={{
                      background: reached
                        ? "linear-gradient(135deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)"
                        : "var(--heri-cream)",
                      color: reached ? "white" : r.color,
                      opacity: reached ? 1 : 0.4,
                    }}
                  >
                    {r.symbol}
                  </div>
                  <div className="mt-2 text-base font-extrabold" style={{ color: "var(--heri-ink)" }}>
                    {ar ? r.ar : r.en}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                    {formatNumber(r.minXp)} XP · +{r.bonusPercent}٪
                  </div>
                </div>
              );
            })}
          </div>
        </HeritageSection>

        {/* Medal catalog — grouped by tier, highest first */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2
                className=" text-base font-extrabold"
                style={{ color: "var(--heri-ink)" }}
              >
                {ar ? "كتالوج الميداليات" : "Medal catalog"}
              </h2>
              <p
                className="mt-0.5 text-[12px]"
                style={{ color: "var(--heri-ink-3)" }}
              >
                {ar
                  ? "كل ميدالية تفتح بإنجاز محدد — اعمل، أنجز، اكسب."
                  : "Each medal unlocks via a specific milestone — work, finish, earn."}
              </p>
            </div>
            <span
              className="font-mono text-xs font-bold"
              style={{ color: "var(--heri-ink-3)" }}
            >
              {earnedCount} / {totalCount}
            </span>
          </div>

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
                      className="text-sm font-extrabold uppercase tracking-[0.18em]"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {ar ? TIER_LABEL[tier].ar : TIER_LABEL[tier].en}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                      {tierEarned} / {items.length}{" "}
                      {ar ? "مفتوح" : "earned"}
                    </div>
                  </div>
                  <span
                    className="ms-auto h-px flex-1"
                    style={{ background: "var(--heri-rule)" }}
                    aria-hidden
                  />
                </header>

                <div className="grid gap-3 heri-stagger md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                          className="relative mt-3 text-sm font-black leading-snug"
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
        </section>

        {/* Podium leaderboard */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2
                className=" text-base font-extrabold"
                style={{ color: "var(--heri-ink)" }}
              >
                {ar ? "لوحة الصدارة" : "Leaderboard"}
              </h2>
              <p
                className="mt-0.5 text-[12px]"
                style={{ color: "var(--heri-ink-3)" }}
              >
                {ar ? "الأعلى XP في المجموعة" : "Top XP across the group"}
              </p>
            </div>
            <Crown className="h-5 w-5" style={{ color: "var(--heri-copper)" }} />
          </div>

          {/* Podium — top 3 */}
          {top3.length > 0 ? (
            <div className="grid gap-3 heri-stagger md:grid-cols-3 md:items-end">
              {/* Visual order: 2nd | 1st | 3rd via DOM ordering on md+ */}
              {[1, 0, 2]
                .map((idx) => top3[idx])
                .filter(Boolean)
                .map((u) => {
                  const placeIdx = top3.findIndex((x) => x.id === u.id);
                  const isMe = u.id === session.id;
                  const isFirst = placeIdx === 0;
                  const rank = rankById(u.rank as any);
                  const color = avatarColorFor(u.avatarColor);
                  return (
                    <article
                      key={u.id}
                      className="  relative overflow-hidden rounded-2xl p-5 text-center"
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg, var(--heri-cream-2) 0%, var(--heri-cream-2) 100%)"
                          : "var(--heri-cream-2)",
                        border: `1px solid ${isMe ? "var(--heri-ochre)" : "var(--heri-rule)"}`,
                        boxShadow: isFirst
                          ? "0 18px 40px -18px color-mix(in srgb, var(--heri-copper) 60%, transparent)"
                          : "var(--)",
                        minHeight: isFirst ? 240 : 200,
                        marginBottom: isFirst ? 0 : 12,
                      }}
                    >
                      {isFirst ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(135deg, color-mix(in srgb, var(--heri-copper) 14%, transparent) 0%, transparent 60%)",
                          }}
                        />
                      ) : null}
                      <div
                        className="text-4xl"
                        aria-label={`${ar ? "المرتبة" : "Rank"} ${placeIdx + 1}`}
                      >
                        {PODIUM_MEDAL[placeIdx]}
                      </div>
                      <div
                        className={`relative mx-auto mt-3 flex items-center justify-center rounded-full font-black text-white ${isFirst ? "h-20 w-20 text-2xl" : "h-16 w-16 text-xl"}`}
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
                          className={`font-extrabold ${isFirst ? "text-base" : "text-sm"}`}
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {u.name}
                          {isMe ? (
                            <span
                              className="ms-1.5 text-[10px] font-bold"
                              style={{ color: "var(--heri-ochre)" }}
                            >
                              ({ar ? "أنت" : "you"})
                            </span>
                          ) : null}
                        </div>
                        {u.company?.name ? (
                          <div
                            className="text-[11px]"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            {u.company.name}
                          </div>
                        ) : null}
                      </div>
                      <div className="relative mt-3 flex items-center justify-center gap-2">
                        <RankBadge rank={u.rank as any} size="sm" showLabel={false} />
                        <span
                          className="font-mono text-sm font-black"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {formatNumber(u.xp)}
                        </span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          XP
                        </span>
                      </div>
                      <div
                        className="relative mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: "var(--heri-cream-2)",
                          color: "var(--heri-ochre-2)",
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
            <div className="card overflow-hidden">
              <ul className="heri-stagger divide-y divide-[var(--border)]">
                {rest.map((u, i) => {
                  const isMe = u.id === session.id;
                  const place = i + 4;
                  const rank = rankById(u.rank as any);
                  const color = avatarColorFor(u.avatarColor);
                  return (
                    <li
                      key={u.id}
                      className=" grid items-center gap-3 px-4 py-3"
                      style={{
                        gridTemplateColumns: "32px auto 1fr auto auto auto",
                        background: isMe
                          ? "var(--heri-cream-2)"
                          : undefined,
                      }}
                    >
                      <span
                        className="font-mono text-sm font-black"
                        style={{ color: "var(--heri-ink-3)" }}
                      >
                        {place}
                      </span>
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-white"
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
                          className="truncate text-sm font-extrabold"
                          style={{ color: "var(--heri-ink)" }}
                        >
                          {u.name}
                          {isMe ? (
                            <span
                              className="ms-1.5 text-[10px] font-bold"
                              style={{ color: "var(--heri-ochre)" }}
                            >
                              ({ar ? "أنت" : "you"})
                            </span>
                          ) : null}
                        </div>
                        {u.company?.name ? (
                          <div
                            className="truncate text-[11px]"
                            style={{ color: "var(--heri-ink-3)" }}
                          >
                            {u.company.name}
                          </div>
                        ) : null}
                      </div>
                      <RankBadge rank={u.rank as any} size="sm" showLabel={false} />
                      <span
                        className="font-mono text-sm font-bold"
                        style={{ color: "var(--heri-ink)" }}
                      >
                        {formatNumber(u.xp)}{" "}
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: "var(--heri-ink-3)" }}
                        >
                          XP
                        </span>
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: "var(--heri-ink-3)" }}
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
        </section>
      </PageContainer>
    </>
  );
}

