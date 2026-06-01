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
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import { getLocale } from "@/lib/i18n.server";
import {
  formatMoney,
  formatNumber,
  formatDateTime,
  formatShortDate,
} from "@/lib/utils";
import "../../daylight.css";

const KIND_AR: Record<string, string> = {
  REVENUE: "إيراد",
  INCOME: "دخل",
  EXPENSE: "مصروف",
  COST: "تكلفة",
  TRANSFER: "تحويل داخلي",
};

const KIND_EN: Record<string, string> = {
  REVENUE: "Revenue",
  INCOME: "Income",
  EXPENSE: "Expense",
  COST: "Cost",
  TRANSFER: "Internal transfer",
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
      company: {
        select: { id: true, name: true, nameEn: true, code: true, sector: true },
      },
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
      include: { company: { select: { name: true, nameEn: true, code: true } } },
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
    ? "var(--emerald)"
    : isExpense
      ? "#b85c38"
      : "var(--gold)";

  const companyIncome = companyAgg
    .filter((g) => g.kind === "INCOME" || g.kind === "REVENUE")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const companyExpense = companyAgg
    .filter((g) => g.kind === "EXPENSE" || g.kind === "COST")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const companyNet = companyIncome - companyExpense;

  const pinned = await isPinned("TRANSACTION", tx.id);

  const en = getLocale() === "en";
  const companyName = en ? (tx.company.nameEn ?? tx.company.name) : tx.company.name;
  const kindLabel = en
    ? (KIND_EN[tx.kind] ?? tx.kind)
    : (KIND_AR[tx.kind] ?? tx.kind);

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Financial ledger" : "السجل المالي"}
        title={tx.description ?? tx.category}
        subtitle={tx.reference}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/finance" className="dl-btn dl-btn-secondary" style={{ fontSize: 13 }}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              {en ? "Ledger" : "السجل"}
            </Link>
            <PinButton
              entityType="TRANSACTION"
              entityId={tx.id}
              label={`${tx.reference} — ${tx.description ?? tx.category}`}
              href={`/finance/${tx.id}`}
              icon="Wallet"
              initial={pinned}
              tone="default"
              locale={en ? "en" : "ar"}
            />
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero strip with big amount */}
        <section className="panel reveal" style={{ padding: "20px 24px" }}>
          <div className="grid gap-6 lg:grid-cols-[auto,1fr,auto] lg:items-center">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center"
              style={{
                background: "var(--cream)",
                border: "1px solid var(--line)",
                color: accent,
              }}
            >
              <Icon className="h-8 w-8" strokeWidth={1.4} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: accent,
                    border: "1px solid var(--line)",
                  }}
                >
                  {kindLabel}
                </span>
                <Link
                  href={`/companies/${tx.company.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--gold)",
                    border: "1px solid var(--line)",
                    textDecoration: "none",
                  }}
                >
                  {companyName}
                </Link>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-muted)",
                    border: "1px solid var(--line)",
                    padding: "3px 8px",
                    borderRadius: 4,
                  }}
                >
                  {tx.reference}
                </span>
              </div>
              <h2
                className="mt-2"
                style={{
                  fontSize: "clamp(22px,2vw,30px)",
                  fontWeight: 500,
                  color: "var(--ink)",
                  letterSpacing: "-0.012em",
                  lineHeight: 1.15,
                }}
              >
                {tx.description ?? tx.category}
              </h2>
              <p className="mt-1" style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>
                {tx.category}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono" style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                  {formatDateTime(tx.occurredAt)}
                </span>
              </div>
            </div>

            <div className="text-end">
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>{en ? "Amount" : "المبلغ"}</div>
              <div
                className="mt-1 font-mono"
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
              <div className="mt-1.5 font-mono" style={{ fontSize: 10.5, color: "var(--ink-muted)" }} dir="ltr">
                {tx.currency}
              </div>
            </div>
          </div>
        </section>

        {/* KPI band — company P&L snapshot */}
        <DaylightKpiGrid>
          <DaylightKpi
            label={en ? `${companyName} revenue` : `إيرادات ${companyName}`}
            value={formatMoney(companyIncome)}
            hint={en ? "Historical total" : "إجمالي تاريخي"}
          />
          <DaylightKpi
            label={en ? `${companyName} expenses` : `مصاريف ${companyName}`}
            value={formatMoney(companyExpense)}
            hint={en ? "Historical total" : "إجمالي تاريخي"}
          />
          <DaylightKpi
            label={en ? "Net" : "الصافي"}
            value={formatMoney(companyNet)}
            hint={companyNet >= 0 ? (en ? "Profit" : "ربح") : (en ? "Loss" : "خسارة")}
          />
        </DaylightKpiGrid>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            {/* Description */}
            {tx.description ? (
              <DaylightPanel
                title={
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                    {en ? "Notes" : "الملاحظات"}
                  </span>
                }
              >
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                  {tx.description}
                </p>
              </DaylightPanel>
            ) : null}

            {/* Same category */}
            {siblingsCategory.length > 0 ? (
              <DaylightPanel
                title={
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                    {tx.category}
                  </span>
                }
                aside={<span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>{en ? "Same category" : "حركات بنفس التصنيف"}</span>}
              >
                <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
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
                          <div className="truncate font-semibold" style={{ color: "var(--ink)", fontSize: 13 }}>
                            {s.description ?? s.category}
                          </div>
                          <div className="font-mono mt-0.5" style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>
                            {s.reference} • {s.company.code} • {formatShortDate(s.occurredAt)}
                          </div>
                        </Link>
                        <span
                          className="font-mono font-semibold"
                          style={{
                            color: sIsIncome ? "var(--emerald)" : "#b85c38",
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
              </DaylightPanel>
            ) : null}

            {/* Same company */}
            {siblingsCompany.length > 0 ? (
              <DaylightPanel
                title={
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                    {en ? "Other transactions" : "حركات أخرى"} — {companyName}
                  </span>
                }
                aside={
                  <Link href={`/companies/${tx.company.id}`} style={{ color: "var(--gold)", textDecoration: "none", fontSize: 11.5 }}>
                    {en ? "Company profile →" : "ملف الشركة ←"}
                  </Link>
                }
              >
                <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
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
                          <div className="truncate font-semibold" style={{ color: "var(--ink)", fontSize: 13 }}>
                            {s.description ?? s.category}
                          </div>
                          <div className="font-mono mt-0.5" style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>
                            {s.reference} • {en ? (KIND_EN[s.kind] ?? s.kind) : (KIND_AR[s.kind] ?? s.kind)} • {formatShortDate(s.occurredAt)}
                          </div>
                        </Link>
                        <span
                          className="font-mono font-semibold"
                          style={{
                            color: sIsIncome ? "var(--emerald)" : "#b85c38",
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
              </DaylightPanel>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Created by */}
            {tx.createdBy ? (
              <DaylightPanel
                title={
                  <span className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                    {en ? "User" : "المستخدم"}
                  </span>
                }
                aside={<span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}>{en ? "Logged by" : "من سجّل"}</span>}
              >
                <Link
                  href={`/users/${tx.createdBy.id}`}
                  className="block px-3 py-2 transition"
                  style={{
                    background: "var(--ivory)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  <div className="font-semibold" style={{ color: "var(--ink)", fontSize: 13 }}>
                    {tx.createdBy.name}
                  </div>
                  <div className="font-mono mt-0.5" style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>
                    {tx.createdBy.role} · {formatNumber(tx.createdBy.xp)} XP
                  </div>
                </Link>
              </DaylightPanel>
            ) : null}

            {/* Meta */}
            <DaylightPanel title={en ? "Transaction details" : "تفاصيل الحركة"}>
              <dl className="space-y-2 text-xs">
                <Fact label={en ? "Reference" : "المرجع"} value={tx.reference} mono />
                <Fact label={en ? "Type" : "النوع"} value={kindLabel} />
                <Fact label={en ? "Category" : "التصنيف"} value={tx.category} />
                <Fact
                  label={en ? "Amount" : "المبلغ"}
                  value={`${sign}${formatMoney(tx.amount, tx.currency)}`}
                  color={accent}
                />
                <Fact label={en ? "Currency" : "العملة"} value={tx.currency} mono />
                <Fact label={en ? "Occurred at" : "وقع في"} value={formatDateTime(tx.occurredAt)} />
                <Fact
                  label={en ? "Company" : "الشركة"}
                  value={companyName}
                  link={`/companies/${tx.company.id}`}
                />
              </dl>
            </DaylightPanel>
          </aside>
        </div>
      </div>
    </DaylightShell>
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
    <div className="flex items-center justify-between border-b pb-1.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd
        className={`text-end font-semibold ${mono ? "font-mono" : ""}`}
        style={{ color: color ?? "var(--ink)" }}
      >
        {link ? (
          <Link href={link} className="hover:underline" style={{ color: "var(--gold)" }}>
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
