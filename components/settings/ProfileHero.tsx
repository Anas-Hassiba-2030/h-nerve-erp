// Premium animated profile hero — stars at the top of /settings.
// Features: aurora gradient, animated rank progression bar, sparkle particles,
// chess-piece symbol that subtly orbits.

import { RankBadge } from "@/components/RankBadge";
import { rankById, RANKS, progressToNext } from "@/lib/gamification";

export function ProfileHero({
  name,
  email,
  title,
  role,
  rank,
  xp,
  bonusPercent,
  loginCount,
  locale,
  brandGradient,
  brandAccent,
}: {
  name: string;
  email: string;
  title: string | null;
  role: string;
  rank: string;
  xp: number;
  bonusPercent: number;
  loginCount: number;
  locale: "ar" | "en";
  brandGradient: string;
  brandAccent: string;
}) {
  const ar = locale === "ar";
  const r = rankById(rank);
  const progress = progressToNext(xp);
  const next = RANKS.find((x) => x.minXp > r.minXp) ?? null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 text-white hn-anim-blur md:p-8"
      style={{ background: brandGradient, minHeight: 220 }}
    >
      {/* Aurora — three drifting blobs */}
      <span
        className="pointer-events-none absolute hn-anim-aurora"
        style={{
          top: "-20%",
          left: "-10%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute hn-anim-aurora"
        style={{
          bottom: "-30%",
          right: "-15%",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${brandAccent}66 0%, transparent 70%)`,
          animationDelay: "-7s",
        }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute hn-anim-aurora"
        style={{
          top: "30%",
          right: "20%",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)",
          animationDelay: "-3s",
        }}
        aria-hidden
      />

      {/* Sparkles */}
      {[
        { top: "16%", left: "12%", size: 8, delay: "0s" },
        { top: "28%", left: "62%", size: 5, delay: "0.6s" },
        { top: "70%", left: "18%", size: 7, delay: "1.2s" },
        { top: "62%", left: "78%", size: 6, delay: "0.3s" },
        { top: "8%",  left: "84%", size: 4, delay: "1.8s" },
      ].map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute hn-anim-sparkle"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: 1,
            background: "white",
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.95)`,
            animationDelay: s.delay,
          }}
          aria-hidden
        />
      ))}

      {/* Content row */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
        {/* Identity block */}
        <div className="flex min-w-0 items-center gap-5">
          {/* Avatar with chess piece + orbiting halo */}
          <div className="relative">
            <span
              className="absolute -inset-2 rounded-2xl hn-anim-pulse-ring"
              style={{ borderRadius: 18 }}
              aria-hidden
            />
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-black hn-theme-chip hn-anim-zoom-bounce"
              style={{
                background: "rgba(255,255,255,0.18)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
                color: r.color === "#7a8a85" ? "white" : "white",
              }}
            >
              <span className="hn-anim-bob">{r.symbol}</span>
            </div>
            {/* Bonus chip */}
            {bonusPercent > 0 ? (
              <span
                className="absolute -bottom-2 -end-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-black ring-2 hn-anim-success"
                style={{
                  background: brandAccent,
                  color: "#1a0e02",
                  borderColor: "white",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                  animationDelay: "0.4s",
                }}
              >
                ⚡ +{bonusPercent.toFixed(1)}%
              </span>
            ) : null}
          </div>

          <div className="min-w-0">
            <div
              className="text-[10px] font-extrabold uppercase tracking-[0.22em] opacity-80 hn-anim-fall"
              style={{ animationDelay: "0.05s" }}
            >
              {ar ? "ملفك في النظام العصبي" : "Your H-Nerve profile"}
            </div>
            <h1
              className="mt-1 text-2xl font-black leading-tight hn-anim-rise md:text-3xl"
              style={{ animationDelay: "0.12s" }}
            >
              {name}
            </h1>
            <div
              className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] font-bold opacity-90 hn-anim-rise"
              style={{ animationDelay: "0.2s" }}
            >
              <span>{title ?? role}</span>
              <span className="opacity-60">·</span>
              <span>{email}</span>
            </div>
            <div
              className="mt-2 flex flex-wrap items-center gap-1.5 hn-anim-rise"
              style={{ animationDelay: "0.28s" }}
            >
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ring-1"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  borderColor: "rgba(255,255,255,0.32)",
                  color: "white",
                }}
              >
                <span style={{ fontSize: 13 }}>{r.symbol}</span>
                {ar ? r.ar : r.en}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-extrabold ring-1"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  borderColor: "rgba(255,255,255,0.32)",
                }}
              >
                {xp.toLocaleString("en-US")} XP
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-extrabold ring-1"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  borderColor: "rgba(255,255,255,0.32)",
                }}
              >
                🔑 {loginCount.toLocaleString("en-US")} {ar ? "دخول" : "logins"}
              </span>
            </div>
          </div>
        </div>

        {/* Rank progress */}
        <div
          className="min-w-[260px] flex-1 hn-anim-slide-r"
          style={{ animationDelay: "0.35s" }}
        >
          <div className="mb-1.5 flex items-baseline justify-between text-[10.5px] font-extrabold opacity-90">
            <span className="uppercase tracking-[0.16em]">
              {next ? (ar ? `إلى ${next.ar}` : `To ${next.en}`) : (ar ? "أعلى رتبة" : "Top rank")}
            </span>
            <span className="font-mono">
              {progress.needed > 0
                ? `${progress.current.toLocaleString("en-US")} / ${progress.needed.toLocaleString("en-US")} XP`
                : (ar ? "مكتمل" : "Maxed")}
            </span>
          </div>
          <div
            className="relative h-3 overflow-hidden rounded-full ring-1"
            style={{
              background: "rgba(0,0,0,0.18)",
              borderColor: "rgba(255,255,255,0.18)",
            }}
          >
            <div
              className="hn-shimmer absolute inset-y-0 start-0 rounded-full transition-[width] duration-700"
              style={{
                width: `${(progress.pct * 100).toFixed(1)}%`,
                background:
                  next
                    ? `linear-gradient(90deg, ${r.color} 0%, ${next.color} 100%)`
                    : `linear-gradient(90deg, ${r.color} 0%, ${brandAccent} 100%)`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[9.5px] font-bold opacity-75">
            {RANKS.map((rk) => (
              <span
                key={rk.id}
                className="flex flex-col items-center gap-0.5"
                style={{ opacity: rk.minXp <= xp ? 1 : 0.45 }}
              >
                <span
                  className={`text-[12px] ${rk.id === r.id ? "hn-anim-bob" : ""}`}
                >
                  {rk.symbol}
                </span>
                <span>{rk.minXp.toLocaleString("en-US")}</span>
              </span>
            ))}
          </div>
          <p
            className="mt-3 text-[10.5px] font-bold leading-snug opacity-90 hn-anim-fade"
            style={{ animationDelay: "0.55s" }}
          >
            {ar ? r.description : r.descriptionEn}
          </p>
        </div>
      </div>
    </section>
  );
}
