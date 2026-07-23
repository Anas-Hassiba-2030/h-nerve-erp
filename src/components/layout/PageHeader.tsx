// PageHeader — the consistent "page chrome" used by every authenticated route.
// Replaces the cramped single-row Topbar pattern with a clean 2-row layout:
//   Row 1 — eyebrow + title + subtitle (left) | quick search / notifications
//                                                      / locale / theme (right)
//   Row 2 — primary actions (export, new, filters, etc.) when present
//
// Honors RTL automatically. Never clips actions.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LocaleSwitch } from "@/components/nav/LocaleSwitch";
import { ThemeSwitch } from "@/components/nav/ThemeSwitch";
import { CommandPalette } from "@/components/nav/CommandPalette";
// Phase V3-P1-RE — StickyScrollWatcher REMOVED (was the flicker source).
import {
  NotificationCenter,
  type NotifInsight,
  type NotifActivity,
  type NotifTask,
} from "@/components/nav/NotificationCenter";
import { KeyboardShortcuts } from "@/components/nav/KeyboardShortcuts";
import { UserMenu } from "@/components/nav/UserMenu";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getTheme } from "@/lib/theme/theme.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";

export type Crumb = { href: string; label: string };

export async function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  actions,
  metrics,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  // Actions slot — Export, New, Filter, etc. Always rendered on its own row.
  actions?: React.ReactNode;
  // Optional inline metric chips shown next to title for at-a-glance KPIs.
  metrics?: Array<{ label: string; value: string; tone?: "emerald" | "amber" | "blue" | "violet" }>;
}) {
  const locale = await getLocale();
  const theme = await getTheme();
  const ar = locale === "ar";

  const session = await getCurrentUser();
  const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [openInsights, openCount, recentActivity, dueTasks] = await Promise.all([
    prisma.aIInsight.findMany({
      where: { status: "OPEN", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.aIInsight.count({ where: { status: "OPEN", deletedAt: null } }),
    prisma.activityLog.findMany({
      where: { createdAt: { gte: sevenDays } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    session
      ? prisma.task.findMany({
          where: {
            assigneeId: session.id,
            status: { not: "DONE" },
            deletedAt: null,
            OR: [
              { dueAt: null },
              { dueAt: { lte: next7Days } },
            ],
          },
          orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
          take: 8,
        })
      : [],
  ]);

  const notifInsights: NotifInsight[] = openInsights.map((i) => ({
    id: i.id,
    module: i.module,
    severity: i.severity as any,
    title: i.title,
    body: i.body,
    createdAt: i.createdAt.toISOString(),
  }));
  const notifActivity: NotifActivity[] = recentActivity.map((a) => ({
    id: a.id,
    action: a.action,
    entity: a.entity,
    summary: a.summary,
    summaryEn: a.summaryEn,
    actorName: a.actorName,
    createdAt: a.createdAt.toISOString(),
  }));
  const notifTasks: NotifTask[] = dueTasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    module: t.module,
  }));

  // Heritage Modern metric chip — current-color dot pattern (§5.2 in DESIGN-SKILL.md)
  const toneColor: Record<string, string> = {
    emerald: "var(--heri-teal)",
    amber:   "var(--heri-ochre-2)",
    blue:    "var(--heri-copper)",
    violet:  "var(--heri-rose)",
  };

  return (
    <header
      data-page-header
      className="exec-sticky-header sticky top-0 z-20"
      style={{
        background: "color-mix(in srgb, var(--heri-cream) 96%, transparent)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--heri-rule)",
      }}
    >
      {/* removed P1-RE */}
      {/* Heritage hairline accent — terracotta → ochre → teal */}
      <div
        className="h-[2px] w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--heri-terracotta) 0%, var(--heri-ochre) 50%, var(--heri-teal) 100%)",
        }}
      />

      {/* Row 1 — Title block + utility controls */}
      <div data-page-header-row1 className="px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav
                data-page-header-breadcrumbs
                className="mb-2 flex flex-wrap items-center gap-1"
                style={{
                  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: 12,
                  color: "var(--heri-ink-3)",
                  letterSpacing: "0.06em",
                }}
              >
                {breadcrumbs.map((b, i) => (
                  <span key={b.href} className="flex items-center gap-1">
                    <Link
                      href={b.href}
                      className="px-1.5 py-0.5 transition"
                      style={{ color: "var(--heri-ink-2)" }}
                    >
                      {b.label}
                    </Link>
                    {i < breadcrumbs.length - 1 ? (
                      <ChevronLeft
                        className="h-3 w-3 opacity-50 rtl:rotate-180"
                        style={{ color: "var(--heri-rule-strong)" }}
                      />
                    ) : null}
                  </span>
                ))}
              </nav>
            ) : null}

            {eyebrow ? (
              <div
                data-page-header-eyebrow
                className="mb-1.5 heri-eyebrow inline-flex items-center gap-2"
              >
                <span
                  aria-hidden
                  className="inline-block"
                  style={{
                    width: 18,
                    height: 1.5,
                    background: "var(--heri-ochre)",
                  }}
                />
                {eyebrow}
              </div>
            ) : null}

            <h1
              data-page-header-title
              className={ar ? "" : "font-display-latin"}
              style={{
                color: "var(--heri-ink)",
                fontSize: "clamp(20px, 1.8vw, 26px)",
                letterSpacing: ar ? "-0.005em" : "-0.018em",
                lineHeight: 1.2,
                fontWeight: ar ? 600 : 500,
              }}
            >
              {title}
            </h1>

            {subtitle ? (
              <p
                data-page-header-subtitle
                className="mt-1 max-w-3xl"
                style={{
                  color: "var(--heri-ink-3)",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                }}
              >
                {subtitle}
              </p>
            ) : null}

            {metrics && metrics.length > 0 ? (
              <div data-page-header-metrics className="mt-3 flex flex-wrap gap-2">
                {metrics.map((m, i) => (
                  <span
                    key={i}
                    className="heri-pill"
                    style={{ color: toneColor[m.tone ?? "emerald"] }}
                  >
                    <span style={{ opacity: 0.75 }}>{m.label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {m.value}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Utility controls — always single-line, never clip */}
          <div className="flex shrink-0 items-center gap-1.5">
            <CommandPalette locale={locale} />
            <KeyboardShortcuts locale={locale} />
            <NotificationCenter
              insights={notifInsights}
              activity={notifActivity}
              tasks={notifTasks}
              insightCount={openCount}
              locale={locale}
            />
            <span
              className="hidden h-5 w-px md:block"
              style={{ background: "var(--heri-rule-strong)" }}
            />
            <LocaleSwitch current={locale} />
            <ThemeSwitch current={theme.id} locale={locale} />
            <UserMenu locale={locale} userName={session?.name ?? null} />
          </div>
        </div>
      </div>

      {/* Row 2 — Primary actions, on a softer cream rail */}
      {actions ? (
        <div
          data-page-header-row2
          className="flex flex-wrap items-center gap-2 px-6 py-2.5"
          style={{
            borderTop: "1px solid var(--heri-rule)",
            background: "var(--heri-cream-2)",
          }}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
