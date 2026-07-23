import Link from "next/link";
import {
  Sparkles,
  Wrench,
  Bug,
  Shield,
  Gauge,
  GitBranch,
  Calendar,
} from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { getLocale } from "@/lib/i18n/i18n.server";
import { CHANGELOG, type ChangelogCategory } from "@/lib/utils/changelogData";
import "../daylight.css";

const CATEGORY_AR: Record<ChangelogCategory, string> = {
  feature: "ميزة",
  fix: "إصلاح",
  polish: "تلميع",
  security: "أمان",
  perf: "أداء",
};
const CATEGORY_EN: Record<ChangelogCategory, string> = {
  feature: "Feature",
  fix: "Fix",
  polish: "Polish",
  security: "Security",
  perf: "Performance",
};

// Color the timeline dot per category — values picked to match the existing
// .badge-* class palette in globals.css.
const CATEGORY_DOT: Record<ChangelogCategory, string> = {
  feature: "#10b981", // emerald
  fix: "#3b82f6",     // blue
  polish: "#f59e0b",  // amber
  security: "#f43f5e", // rose
  perf: "#8b5cf6",    // violet
};

const CATEGORY_BADGE: Record<ChangelogCategory, string> = {
  feature: "badge-emerald",
  fix: "badge-blue",
  polish: "badge-amber",
  security: "badge-red",
  perf: "badge-violet",
};

const CATEGORY_ICON: Record<ChangelogCategory, typeof Sparkles> = {
  feature: Sparkles,
  fix: Bug,
  polish: Wrench,
  security: Shield,
  perf: Gauge,
};

type Filter = "all" | ChangelogCategory;

const FILTERS: Array<{ id: Filter; ar: string; en: string }> = [
  { id: "all", ar: "الكل", en: "All" },
  { id: "feature", ar: "الميزات", en: "Features" },
  { id: "polish", ar: "التلميع", en: "Polish" },
  { id: "fix", ar: "الإصلاحات", en: "Fixes" },
];

export default async function ChangelogPage(
  props: {
    searchParams: Promise<{ filter?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const ar = (await getLocale()) === "ar";
  const raw = searchParams.filter;
  const filter: Filter =
    raw === "feature" || raw === "polish" || raw === "fix" ? raw : "all";

  const visible =
    filter === "all"
      ? CHANGELOG
      : CHANGELOG.filter((e) => e.category === filter);

  // Counts kept in en-US digits per spec
  const counts: Record<Filter, number> = {
    all: CHANGELOG.length,
    feature: CHANGELOG.filter((e) => e.category === "feature").length,
    polish: CHANGELOG.filter((e) => e.category === "polish").length,
    fix: CHANGELOG.filter((e) => e.category === "fix").length,
    security: CHANGELOG.filter((e) => e.category === "security").length,
    perf: CHANGELOG.filter((e) => e.category === "perf").length,
  };

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "النظام" : "System"}
        title={ar ? "السجل الزمني للتطوير" : "Changelog"}
        subtitle={
          ar
            ? "كل ميزة، تلميع، أو إصلاح وصل إلى المنصة منذ يومها الأول."
            : "Every feature, polish, and fix that has shipped since day one."
        }
      />
        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((p) => {
            const active = p.id === filter;
            const href = p.id === "all" ? "/changelog" : `/changelog?filter=${p.id}`;
            return (
              <Link
                key={p.id}
                href={href}
                className={active ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                style={{ borderRadius: 999 }}
                aria-current={active ? "page" : undefined}
              >
                <span>{ar ? p.ar : p.en}</span>
                <span
                  className="ms-1 inline-flex items-center justify-center rounded-full px-1.5 text-[12px] font-mono font-bold"
                  style={{
                    minWidth: 18,
                    background: active
                      ? "rgba(255,255,255,0.22)"
                      : "color-mix(in srgb, var(--ink-muted) 14%, transparent)",
                    color: active ? "#fff" : "var(--ink-muted)",
                  }}
                >
                  {counts[p.id]}
                </span>
              </Link>
            );
          })}
          <span
            className="ms-auto inline-flex items-center gap-1.5 text-[13px] font-bold"
            style={{ color: "var(--ink-muted)" }}
          >
            <GitBranch className="h-3.5 w-3.5" />
            {visible.length} / {CHANGELOG.length} {ar ? "إدخال" : "entries"}
          </span>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical rail. Sits at insetInlineStart so it always lands on the
              start side regardless of LTR/RTL. */}
          <div
            aria-hidden
            className="absolute"
            style={{
              insetInlineStart: 22,
              top: 8,
              bottom: 8,
              width: 2,
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--gold) 35%, transparent) 0%, var(--line) 30%, var(--line) 70%, color-mix(in srgb, var(--gold) 35%, transparent) 100%)",
              borderRadius: 999,
            }}
          />

          <ol className="space-y-5">
            {visible.map((entry, i) => {
              const t = ar ? entry.ar : entry.en;
              const dot = CATEGORY_DOT[entry.category];
              const Icon = CATEGORY_ICON[entry.category];
              return (
                <li
                  key={`${entry.version}-${entry.date}-${i}`}
                  className="relative ps-14 anim-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  {/* Dot — sits over the rail with a halo ring against the page bg */}
                  <span
                    aria-hidden
                    className="absolute flex h-11 w-11 items-center justify-center rounded-full"
                    style={{
                      insetInlineStart: 0,
                      top: 6,
                      background: dot,
                      color: "#fff",
                      boxShadow: `0 0 0 4px var(--cream), 0 0 0 5px color-mix(in srgb, ${dot} 35%, transparent), 0 6px 16px -4px color-mix(in srgb, ${dot} 60%, transparent)`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <article className="card card-pad card-hover">
                    {/* Top meta row */}
                    <header className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[13px] font-bold"
                        style={{
                          background: "var(--cream)",
                          color: "var(--brand-deep)",
                        }}
                      >
                        <Calendar className="h-3 w-3" />
                        {entry.date}
                      </span>
                      <span
                        className="rounded-md px-2 py-0.5 font-mono text-[13px] font-bold"
                        style={{
                          background: "var(--ink)",
                          color: "var(--cream)",
                        }}
                      >
                        v{entry.version}
                      </span>
                      <span className={CATEGORY_BADGE[entry.category]}>
                        {ar ? CATEGORY_AR[entry.category] : CATEGORY_EN[entry.category]}
                      </span>
                      {entry.modules.map((m) => (
                        <span key={m} className="badge-slate font-mono">
                          {m}
                        </span>
                      ))}
                    </header>

                    {/* Title + description */}
                    <h2
                      className="mt-3 text-base font-semibold leading-snug md:text-[17px]"
                      style={{ color: "var(--ink)", letterSpacing: "-0.005em" }}
                    >
                      {t.title}
                    </h2>
                    <p
                      className="mt-1.5 text-sm leading-relaxed"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {t.desc}
                    </p>

                    {/* Bullets */}
                    {t.bullets.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {t.bullets.map((b, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-2 text-[12.5px] leading-relaxed"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            <span
                              aria-hidden
                              className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: dot }}
                            />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>

          {/* Empty state */}
          {visible.length === 0 ? (
            <div
              className="card card-pad mt-4 text-center text-sm"
              style={{ color: "var(--ink-muted)" }}
            >
              {ar
                ? "لا توجد إدخالات تطابق هذا الفلتر — جرّب فلتراً آخر."
                : "No entries match this filter — try another one."}
            </div>
          ) : null}
        </div>
    </DaylightShell>
  );
}
