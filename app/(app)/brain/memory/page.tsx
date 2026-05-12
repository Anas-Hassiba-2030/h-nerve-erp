// /brain/memory — the memory lake.
//
// Phase 6 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { MemoryCard } from "@/components/brain/MemoryCard";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { Brain, Database, Trash2 } from "lucide-react";
import { seedMemories, deleteMemory, clearMemories } from "./actions";

const MODULE_LABEL: Record<string, { ar: string; en: string }> = {
  HOTELS:    { ar: "الفنادق", en: "Hotels" },
  DAIRY:     { ar: "الألبان", en: "Dairy" },
  FARMS:     { ar: "المزارع", en: "Farms" },
  EDUCATION: { ar: "تعليم", en: "Education" },
  FINANCE:   { ar: "المالية", en: "Finance" },
};

export default async function BrainMemoryPage({
  searchParams,
}: {
  searchParams: { module?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";

  const filter = searchParams.module ?? "";
  const where = filter ? { module: filter } : {};
  const [rows, byModule, total] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: 60,
    }),
    prisma.memory.groupBy({
      by: ["module"],
      _count: { _all: true },
    }),
    prisma.memory.count(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · بحيرة الذاكرة" : "Brain · Memory lake"}
        title={ar ? "ما لا يجب نسيانه" : "What must not be forgotten"}
        subtitle={
          ar
            ? "كل حدث يستحق التذكّر يعيش هنا. عندما تظهر إشارة جديدة، يبحث الدماغ في الذاكرة عن قصص مشابهة."
            : "Every event worth remembering lives here. When a new signal appears, the brain searches the lake for analogies."
        }
      />

      <PageContainer>
        {total === 0 ? (
          <EmptyState ar={ar} />
        ) : (
          <>
            {/* Filter rail */}
            <div
              className="flex flex-wrap items-center gap-1.5 px-1 py-3"
              style={{
                borderTop: "1px solid var(--heri-rule)",
                borderBottom: "1px solid var(--heri-rule)",
              }}
            >
              <span className="heri-eyebrow me-2">
                {ar ? "تصفية" : "Filter"}
              </span>
              <FilterChip
                href="/brain/memory"
                active={!filter}
                label={ar ? "الكل" : "All"}
                count={total}
              />
              {byModule.map((g) => (
                <FilterChip
                  key={g.module}
                  href={`/brain/memory?module=${g.module}`}
                  active={filter === g.module}
                  label={
                    ar
                      ? MODULE_LABEL[g.module]?.ar ?? g.module
                      : MODULE_LABEL[g.module]?.en ?? g.module
                  }
                  count={g._count._all}
                />
              ))}
              <div className="grow" />
              <form action={seedMemories}>
                <button
                  type="submit"
                  className="heri-btn heri-btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                >
                  <Database className="h-3 w-3" strokeWidth={1.5} />
                  {ar ? "إعادة الزرع" : "Re-seed"}
                </button>
              </form>
              <form action={clearMemories}>
                <button
                  type="submit"
                  className="heri-btn heri-btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 11, color: "var(--heri-terracotta)" }}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  {ar ? "مسح الكل" : "Clear all"}
                </button>
              </form>
            </div>

            {/* Memory grid */}
            <div
              className="grid gap-4 heri-stagger"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
              }}
            >
              {rows.map((row) => (
                <MemoryCard
                  key={row.id}
                  memory={{
                    id: row.id,
                    ts: row.occurredAt,
                    module: row.module,
                    headline: { ar: row.headlineAr, en: row.headlineEn },
                    body: { ar: row.bodyAr, en: row.bodyEn },
                    tags: safeStringArray(row.tagsJson),
                    outcome:
                      row.outcomeMetric != null
                        ? {
                            metric: row.outcomeMetric,
                            delta: row.outcomeDelta ?? 0,
                            lessonLearned: row.lessonEn ?? undefined,
                          }
                        : undefined,
                    lesson: { ar: row.lessonAr, en: row.lessonEn },
                  }}
                  ar={ar}
                />
              ))}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="heri-focusable inline-flex items-center gap-2 px-3 py-1.5 transition"
      style={{
        background: active ? "var(--heri-ink)" : "var(--heri-cream)",
        border: active ? "1px solid var(--heri-ink)" : "1px solid var(--heri-rule-strong)",
        color: active ? "var(--heri-cream)" : "var(--heri-ink)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        textDecoration: "none",
      }}
    >
      {label}
      <span
        style={{
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
          opacity: 0.7,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count.toLocaleString("en-US")}
      </span>
    </Link>
  );
}

function EmptyState({ ar }: { ar: boolean }) {
  return (
    <section
      className="heri-hero"
      style={{ padding: "60px 32px", textAlign: "center" }}
    >
      <div
        className="inline-flex h-12 w-12 items-center justify-center mx-auto"
        style={{
          border: "1px solid var(--heri-rule-strong)",
          color: "var(--heri-ochre)",
          background: "var(--heri-cream-2)",
        }}
      >
        <Brain className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h2
        className={ar ? "mt-5" : "font-display-latin mt-5"}
        style={{
          fontSize: "clamp(24px, 3vw, 38px)",
          lineHeight: 1.05,
          letterSpacing: ar ? "-0.005em" : "-0.022em",
          fontWeight: ar ? 600 : 500,
          color: "var(--heri-ink)",
        }}
      >
        {ar ? "البحيرة فارغة." : "The lake is empty."}
      </h2>
      <p
        className="measure mt-3 mx-auto"
        style={{
          fontSize: "clamp(13px, 1vw, 14.5px)",
          lineHeight: 1.55,
          color: "var(--heri-ink-2)",
        }}
      >
        {ar
          ? "اضغط على الزر بالأسفل لزرع ثماني ذكريات تأسيسية. لاحقاً، كل حدث مهمّ يحفظه الدماغ تلقائياً."
          : "Press the button below to seed eight foundational memories. Going forward, the brain captures every meaningful event automatically."}
      </p>
      <div className="mt-6">
        <form action={seedMemories}>
          <button type="submit" className="heri-btn heri-btn-primary">
            <Database className="h-4 w-4" strokeWidth={1.5} />
            {ar ? "ازرع البحيرة" : "Seed the lake"}
          </button>
        </form>
      </div>
    </section>
  );
}

function safeStringArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
