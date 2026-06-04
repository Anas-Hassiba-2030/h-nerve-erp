import Link from "next/link";
import { Mail, Clock } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatNumber, formatRelative, ROLES_AR, ROLES_EN, loc } from "@/lib/utils/utils";
import { RANKS } from "@/lib/utils/gamification";
import type { UserDetail } from "../data";

export function UserHero({
  user,
  brand,
  currentRank,
  next,
  progress,
  xp,
  en,
}: {
  user: UserDetail["user"];
  brand: UserDetail["brand"];
  currentRank: UserDetail["currentRank"];
  next: UserDetail["next"];
  progress: UserDetail["progress"];
  xp: number;
  en: boolean;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
      style={{
        background: brand
          ? brand.gradient
          : "linear-gradient(135deg, #0a4d3a 0%, #15846a 50%, #c69345 110%)",
        color: "white",
        minHeight: "200px",
      }}
    >
      <div
        className="absolute inset-0 opacity-20 anim-grad"
        style={{
          background:
            "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
        }}
        aria-hidden
      />
      <div className="relative grid gap-6 lg:grid-cols-[auto,1fr,auto] lg:items-center">
        {/* Big rank piece */}
        <div className="flex flex-col items-center gap-2 anim-pop">
          <div
            className="rank-piece rank-piece-xl"
            style={{ color: currentRank.color, filter: "drop-shadow(0 4px 14px rgba(0,0,0,.2))" }}
            title={en ? currentRank.en : currentRank.ar}
          >
            {currentRank.symbol}
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">
              {currentRank.en}
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: "white", textShadow: "0 1px 4px rgba(0,0,0,.2)" }}
            >
              {en ? currentRank.en : currentRank.ar}
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: "rgba(255,255,255,.2)",
                border: "1px solid rgba(255,255,255,.3)",
              }}
            >
              {loc(ROLES_AR, ROLES_EN, getLocale(), user.role)}
            </span>
            {user.company ? (
              <Link
                href={`/companies/${user.company.id}`}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                style={{
                  background: "rgba(255,255,255,.2)",
                  border: "1px solid rgba(255,255,255,.3)",
                }}
              >
                {user.company.name}
              </Link>
            ) : null}
          </div>
          <h2 className="mt-1 text-3xl font-bold" style={{ letterSpacing: "-0.01em" }}>
            {user.name}
          </h2>
          {user.title ? (
            <p className="text-sm opacity-90">{user.title}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono"
              style={{
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.3)",
              }}
              dir="ltr"
            >
              <Mail className="h-3 w-3" />
              {user.email}
            </span>
            {user.lastLoginAt ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                style={{
                  background: "rgba(255,255,255,.15)",
                  border: "1px solid rgba(255,255,255,.25)",
                }}
              >
                <Clock className="h-3 w-3" />
                {en ? "Last login" : "آخر دخول"} {formatRelative(user.lastLoginAt)}
              </span>
            ) : null}
          </div>

          {/* XP progress */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold opacity-95">
              <span>
                <span className="font-mono text-sm">
                  {formatNumber(xp)}
                </span>{" "}
                XP
              </span>
              {next ? (
                <span>
                  {en ? "Next" : "التالي"}:{" "}
                  <span style={{ color: "white" }}>{en ? next.en : next.ar}</span> (
                  {formatNumber(next.minXp - xp)} XP)
                </span>
              ) : (
                <span>{en ? "Top rank 👑" : "أعلى رتبة 👑"}</span>
              )}
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,.2)" }}
            >
              <div
                className="h-full rounded-full anim-rise-glow"
                style={{
                  width: `${Math.round(progress.pct * 100)}%`,
                  background:
                    "linear-gradient(90deg, white 0%, rgba(255,255,255,.7) 100%)",
                  boxShadow: "0 0 18px rgba(255,255,255,.6)",
                  transition: "width .8s cubic-bezier(.21,.92,.32,1)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Rank ladder */}
        <div className="grid grid-cols-5 gap-2 lg:grid-cols-1 lg:gap-1">
          {RANKS.map((r) => {
            const reached = xp >= r.minXp;
            const isCurrent = r.id === currentRank.id;
            return (
              <div
                key={r.id}
                className="flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 transition"
                style={{
                  background: isCurrent
                    ? "rgba(255,255,255,.25)"
                    : reached
                      ? "rgba(255,255,255,.1)"
                      : "transparent",
                  border: isCurrent
                    ? "1px solid rgba(255,255,255,.5)"
                    : "1px solid transparent",
                  opacity: reached ? 1 : 0.4,
                }}
                title={`${en ? r.en : r.ar} — ${formatNumber(r.minXp)} XP`}
              >
                <span
                  className="text-lg"
                  style={{
                    color: r.color,
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,.2))",
                  }}
                >
                  {r.symbol}
                </span>
                <span className="text-[10px] font-bold opacity-95">
                  {en ? r.en : r.ar}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
