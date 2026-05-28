import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Building2,
  Calendar,
  User as UserIcon,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatMoney,
  formatNumber,
  formatDateTime,
  formatShortDate,
} from "@/lib/utils";

const KIND_AR: Record<string, string> = {
  REVENUE: "إيراد",
  INCOME: "دخل",
  EXPENSE: "مصروف",
  COST: "تكلفة",
  TRANSFER: "تحويل داخلي",
};

const KIND_ICON = {
  REVENUE: TrendingUp,
  INCOME: TrendingUp,
  EXPENSE: TrendingDown,
  COST: TrendingDown,
  TRANSFER: ArrowLeftRight,
} as const;

export default async function FinanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tx = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true, code: true, sector: true } },
      createdBy: {
        select: { id: true, name: true, role: true, rank: true, xp: true },
      },
    },
  });
  if (!tx) notFound();

  const [siblingsCategory, siblingsCompany, companyAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        category: tx.category,
        id: { not: tx.id },
      },
      orderBy: { occurredAt: "desc" },
      take: 6,
      include: { company: { select: { name: true, code: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        companyId: tx.companyId,
        id: { not: tx.id },
      },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
    prisma.transaction.groupBy({
      by: ["kind"],
      where: { companyId: tx.companyId },
      _sum: { amount: true },
    }),
  ]);

  const Icon =
    KIND_ICON[tx.kind as keyof typeof KIND_ICON] ?? ArrowLeftRight;
  const isIncome = tx.kind === "INCOME" || tx.kind === "REVENUE";
  const isExpense = tx.kind === "EXPENSE" || tx.kind === "COST";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const accent = isIncome
    ? "var(--heri-teal)"
    : isExpense
      ? "var(--heri-terracotta)"
      : "var(--heri-copper)";

  const companyIncome = companyAgg
    .filter((g) => g.kind === "INCOME" || g.kind === "REVENUE")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const companyExpense = companyAgg
    .filter((g) => g.kind === "EXPENSE" || g.kind === "COST")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const companyNet = companyIncome - companyExpense;

  const pinned = await isPinned("TRANSACTION", tx.id);

  return (
    <>
      <PageHeader
        eyebrow="السجل المالي"
        title={tx.description ?? tx.category}
        subtitle={tx.reference}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/finance" className="heri-btn heri-btn-ghost" style={{ fontSize: 13 }}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              السجل
            </Link>
            <PinButton
              entityType="TRANSACTION"
              entityId={tx.id}
              label={`${tx.reference} — ${tx.description ?? tx.category}`}
              href={`/finance/${tx.id}`}
              icon="Wallet"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      <PageContainer>
        {/* Hero strip — Heritage Modern cream plinth with big amount */}
        <section className="heri-hero" style={{ padding: "20px 24px" }}>
          <div className="grid gap-6 lg:grid-cols-[auto,1fr,auto] lg:items-center">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center"
              style={{
                background: "var(--heri-cream-2)",
                border: "1px solid var(--heri-rule-strong)",
                color: accent,
              }}
            >
              <Icon className="h-8 w-8" strokeWidth={1.4} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="heri-pill"
                  style={{
                    color: accent,
                  }}
                >
                  {KIND_AR[tx.kind] ?? tx.kind}
                </span>
                <Link
                  href={`/companies/${tx.company.id}`}
                  className="heri-pill heri-pill-info"
                  style={{ textDecoration: "none" }}
                >
                  {tx.company.name}
                </Link>
                <span
                  className="heri-number-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--heri-ink-3)",
                    border: "1px solid var(--heri-rule)",
                    padding: "3px 8px",
                  }}
                >
                  {tx.reference}
                </span>
              </div>
              <h2
                className="mt-2"
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: "clamp(22px,2vw,30px)",
                  fontWeight: 500,
                  color: "var(--heri-ink)",
                  letterSpacing: "-0.012em",
                  lineHeight: 1.15,
                }}
              >
                {tx.description ?? tx.category}
              </h2>
              <p
                className="mt-1"
                style={{ fontSize: 12.5, color: "var(--heri-ink-3)" }}
              >
                {tx.category}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 heri-number-mono" style={{ fontSize: 11.5, color: "var(--heri-ink-3)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                  {formatDateTime(tx.occurredAt)}
                </span>
              </div>
            </div>

            <div className="text-end">
              <div className="heri-eyebrow heri-eyebrow-ink">المبلغ</div>
              <div
                className="heri-number mt-1"
                style={{
                  fontSize: "clamp(28px, 3vw, 42px)",
                  fontWeight: 500,
                  color: accent,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {sign}
                {formatMoney(tx.amount, tx.currency)}
              </div>
              <div
                className="heri-number-mono mt-1.5"
                style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                dir="ltr"
              >
                {tx.currency}
              </div>
            </div>
          </div>
        </section>

        {/* KPI band — company P&L snapshot */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-3">
          <HeriKpi
            label={`إيرادات ${tx.company.name}`}
            raw={companyIncome}
            kind="money"
            accent="var(--heri-teal)"
            hint="إجمالي تاريخي"
          />
          <HeriKpi
            label={`مصاريف ${tx.company.name}`}
            raw={companyExpense}
            kind="money"
            accent="var(--heri-terracotta)"
            hint="إجمالي تاريخي"
          />
          <HeriKpi
            label="الصافي"
            raw={companyNet}
            kind="money"
            accent={companyNet >= 0 ? "var(--heri-teal)" : "var(--heri-terracotta)"}
            hint={companyNet >= 0 ? "ربح" : "خسارة"}
          />
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px] heri-stagger">
          <div className="space-y-6">
            {/* Description */}
            {tx.description ? (
              <section className="heri-card">
                <div className="heri-eyebrow heri-eyebrow-ink">وصف الحركة</div>
                <h3
                  className="mt-1 mb-2 flex items-center gap-2"
                  style={{
                    fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--heri-ink)",
                  }}
                >
                  <Wallet className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                  الملاحظات
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {tx.description}
                </p>
              </section>
            ) : null}

            {/* Same category */}
            {siblingsCategory.length > 0 ? (
              <section className="heri-card">
                <header className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="heri-eyebrow heri-eyebrow-ink">حركات بنفس التصنيف</div>
                    <h3
                      className="mt-1 flex items-center gap-2"
                      style={{
                        fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--heri-ink)",
                      }}
                    >
                      <Tag className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                      {tx.category}
                    </h3>
                  </div>
                </header>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {siblingsCategory.map((s) => {
                    const sIsIncome = s.kind === "INCOME" || s.kind === "REVENUE";
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <Link
                          href={`/finance/${s.id}`}
                          className="min-w-0 flex-1 hover:underline"
                        >
                          <div
                            className="truncate font-semibold"
                            style={{ color: "var(--heri-ink)", fontSize: 13 }}
                          >
                            {s.description ?? s.category}
                          </div>
                          <div
                            className="heri-number-mono mt-0.5"
                            style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                          >
                            {s.reference} • {s.company.code} • {formatShortDate(s.occurredAt)}
                          </div>
                        </Link>
                        <span
                          className="heri-number-mono font-semibold"
                          style={{
                            color: sIsIncome
                              ? "var(--heri-teal)"
                              : "var(--heri-terracotta)",
                            fontSize: 12,
                          }}
                        >
                          {sIsIncome ? "+" : "−"}
                          {formatMoney(s.amount, s.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* Same company */}
            {siblingsCompany.length > 0 ? (
              <section className="heri-card">
                <header className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="heri-eyebrow heri-eyebrow-ink">من نفس الشركة</div>
                    <h3
                      className="mt-1 flex items-center gap-2"
                      style={{
                        fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--heri-ink)",
                      }}
                    >
                      <Building2 className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                      حركات أخرى — {tx.company.name}
                    </h3>
                  </div>
                  <Link
                    href={`/companies/${tx.company.id}`}
                    className="heri-eyebrow"
                    style={{ color: "var(--heri-ochre)", textDecoration: "none" }}
                  >
                    ملف الشركة ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--heri-rule)]">
                  {siblingsCompany.map((s) => {
                    const sIsIncome = s.kind === "INCOME" || s.kind === "REVENUE";
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <Link
                          href={`/finance/${s.id}`}
                          className="min-w-0 flex-1 hover:underline"
                        >
                          <div
                            className="truncate font-semibold"
                            style={{ color: "var(--heri-ink)", fontSize: 13 }}
                          >
                            {s.description ?? s.category}
                          </div>
                          <div
                            className="heri-number-mono mt-0.5"
                            style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                          >
                            {s.reference} • {KIND_AR[s.kind] ?? s.kind} • {formatShortDate(s.occurredAt)}
                          </div>
                        </Link>
                        <span
                          className="heri-number-mono font-semibold"
                          style={{
                            color: sIsIncome
                              ? "var(--heri-teal)"
                              : "var(--heri-terracotta)",
                            fontSize: 12,
                          }}
                        >
                          {sIsIncome ? "+" : "−"}
                          {formatMoney(s.amount, s.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Created by */}
            {tx.createdBy ? (
              <section className="heri-card">
                <div className="heri-eyebrow heri-eyebrow-ink">من سجّل</div>
                <h3
                  className="mt-1 mb-3 flex items-center gap-2"
                  style={{
                    fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--heri-ink)",
                  }}
                >
                  <UserIcon className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--heri-ochre)" }} />
                  المستخدم
                </h3>
                <Link
                  href={`/users/${tx.createdBy.id}`}
                  className="block px-3 py-2 transition"
                  style={{
                    background: "var(--heri-cream)",
                    border: "1px solid var(--heri-rule)",
                    textDecoration: "none",
                  }}
                >
                  <div
                    className="font-semibold"
                    style={{ color: "var(--heri-ink)", fontSize: 13 }}
                  >
                    {tx.createdBy.name}
                  </div>
                  <div
                    className="heri-number-mono mt-0.5"
                    style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}
                  >
                    {tx.createdBy.role} · {formatNumber(tx.createdBy.xp)} XP
                  </div>
                </Link>
              </section>
            ) : null}

            {/* Meta */}
            <section className="heri-card">
              <div className="heri-eyebrow heri-eyebrow-ink">البطاقة</div>
              <h3
                className="mt-1 mb-3"
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "var(--heri-ink)",
                }}
              >
                تفاصيل الحركة
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="المرجع" value={tx.reference} mono />
                <Fact label="النوع" value={KIND_AR[tx.kind] ?? tx.kind} />
                <Fact label="التصنيف" value={tx.category} />
                <Fact
                  label="المبلغ"
                  value={`${sign}${formatMoney(tx.amount, tx.currency)}`}
                  color={accent}
                />
                <Fact label="العملة" value={tx.currency} mono />
                <Fact label="وقع في" value={formatDateTime(tx.occurredAt)} />
                <Fact
                  label="الشركة"
                  value={tx.company.name}
                  link={`/companies/${tx.company.id}`}
                />
              </dl>
            </section>
          </aside>
        </div>
      </PageContainer>
    </>
  );
}

function Fact({
  label,
  value,
  link,
  mono,
  color,
}: {
  label: string;
  value: string;
  link?: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--heri-rule)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--heri-ink-3)" }}>{label}</dt>
      <dd
        className={`text-end font-semibold ${mono ? "heri-number-mono" : ""}`}
        style={{ color: color ?? "var(--heri-ink)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--heri-ochre)" }}
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
