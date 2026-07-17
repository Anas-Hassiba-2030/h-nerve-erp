// /statements — the three financial statements (income statement, balance
// sheet, trial balance), read straight off posted JournalLines. Pure read:
// no new engine, no mutations — lib/finance/statements.ts does the math.
// The income statement is filtered by year (?year=YYYY); the balance sheet
// and trial balance are cumulative as of today.
import { Scale } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  balanceSheet,
  incomeStatement,
  trialBalance,
  type AccountBalanceRow,
  type StatementLine,
} from "@/lib/finance/statements";
import { StatementsTabsClient } from "./StatementsTabsClient";
import "../daylight.css";

export const dynamic = "force-dynamic";

async function accountRows(accountIds: string[], year?: number): Promise<Map<string, { debit: number; credit: number }>> {
  if (accountIds.length === 0) return new Map();
  const grouped = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      accountId: { in: accountIds },
      entry: year ? { status: "POSTED", period: { year } } : { status: "POSTED" },
    },
    _sum: { debit: true, credit: true },
  });
  return new Map(
    grouped.map((g) => [
      g.accountId,
      { debit: Number(g._sum.debit ?? 0), credit: Number(g._sum.credit ?? 0) },
    ]),
  );
}

function SectionTable({ title, lines, totalLabel, total }: { title: string; lines: StatementLine[]; totalLabel: string; total: number }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{title}</th>
            <th style={{ textAlign: "end" }} />
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.code}>
              <td>
                <span className="font-mono" style={{ marginInlineEnd: 8, color: "var(--ink-muted)" }}>{l.code}</span>
                {l.name}
              </td>
              <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(l.amount)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td>{totalLabel}</td>
            <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function StatementsPage(props: { searchParams: Promise<{ year?: string }> }) {
  const searchParams = await props.searchParams;
  const locale = await getLocale();
  const ar = locale === "ar";

  // Tenant-scoped account list; JournalLines are then restricted to these
  // account ids, so every aggregate below is tenant-scoped transitively.
  const [accounts, periods] = await Promise.all([
    prisma.ledgerAccount.findMany({ orderBy: { code: "asc" }, take: 500 }),
    prisma.financialPeriod.findMany({ orderBy: { year: "desc" }, select: { year: true }, take: 120 }),
  ]);
  const years = [...new Set(periods.map((p) => p.year))];
  const currentYear = new Date().getFullYear();
  const parsedYear = Number(searchParams.year);
  const year = years.includes(parsedYear) ? parsedYear : (years[0] ?? currentYear);

  const accountIds = accounts.map((a) => a.id);
  const [allTime, yearOnly] = await Promise.all([
    accountRows(accountIds),
    accountRows(accountIds, year),
  ]);

  const toRows = (sums: Map<string, { debit: number; credit: number }>): AccountBalanceRow[] =>
    accounts.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      debit: sums.get(a.id)?.debit ?? 0,
      credit: sums.get(a.id)?.credit ?? 0,
    }));

  const tb = trialBalance(toRows(allTime));
  const pl = incomeStatement(toRows(yearOnly));
  const bs = balanceSheet(toRows(allTime));
  const hasPostings = tb.totalDebit > 0 || tb.totalCredit > 0;

  const plNode = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>{ar ? "السنة المالية:" : "Fiscal year:"}</span>
        {(years.length ? years : [currentYear]).map((y) => (
          <Link key={y} href={`/statements?year=${y}`} className={y === year ? "btn btn-primary" : "btn"} style={{ paddingBlock: 4 }}>
            {y}
          </Link>
        ))}
      </div>
      <SectionTable
        title={ar ? "الإيرادات" : "Revenue"}
        lines={pl.revenue}
        totalLabel={ar ? "إجمالي الإيرادات" : "Total revenue"}
        total={pl.totalRevenue}
      />
      <SectionTable
        title={ar ? "المصروفات" : "Expenses"}
        lines={pl.expenses}
        totalLabel={ar ? "إجمالي المصروفات" : "Total expenses"}
        total={pl.totalExpenses}
      />
      <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
        <span>{ar ? "صافي الربح" : "Net profit"}</span>
        <span className={`font-mono ${pl.netProfit >= 0 ? "metric-up" : "metric-down"}`}>{formatMoney(pl.netProfit)}</span>
      </div>
    </div>
  );

  const bsNode = (
    <div className="space-y-4">
      <SectionTable
        title={ar ? "الأصول" : "Assets"}
        lines={bs.assets}
        totalLabel={ar ? "إجمالي الأصول" : "Total assets"}
        total={bs.totalAssets}
      />
      <SectionTable
        title={ar ? "الالتزامات" : "Liabilities"}
        lines={bs.liabilities}
        totalLabel={ar ? "إجمالي الالتزامات" : "Total liabilities"}
        total={bs.totalLiabilities}
      />
      <SectionTable
        title={ar ? "حقوق الملكية" : "Equity"}
        lines={[...bs.equity, { code: "—", name: ar ? "أرباح الفترة الحالية" : "Current earnings", amount: bs.currentEarnings }]}
        totalLabel={ar ? "إجمالي حقوق الملكية" : "Total equity"}
        total={bs.totalEquity}
      />
      <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
        <span>{ar ? "المعادلة المحاسبية" : "Accounting equation"}</span>
        <span className={bs.balanced ? "metric-up" : "metric-down"}>
          {bs.balanced ? (ar ? "متوازنة ✓" : "Balanced ✓") : (ar ? "غير متوازنة!" : "Out of balance!")}
        </span>
      </div>
    </div>
  );

  const tbNode = (
    <div className="space-y-4">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{ar ? "الحساب" : "Account"}</th>
              <th style={{ textAlign: "end" }}>{ar ? "مدين" : "Debit"}</th>
              <th style={{ textAlign: "end" }}>{ar ? "دائن" : "Credit"}</th>
            </tr>
          </thead>
          <tbody>
            {tb.lines
              .filter((l) => l.balanceDebit !== 0 || l.balanceCredit !== 0)
              .map((l) => (
                <tr key={l.code}>
                  <td>
                    <span className="font-mono" style={{ marginInlineEnd: 8, color: "var(--ink-muted)" }}>{l.code}</span>
                    {l.name}
                  </td>
                  <td className="font-mono" style={{ textAlign: "end" }}>{l.balanceDebit ? formatMoney(l.balanceDebit) : "—"}</td>
                  <td className="font-mono" style={{ textAlign: "end" }}>{l.balanceCredit ? formatMoney(l.balanceCredit) : "—"}</td>
                </tr>
              ))}
            <tr style={{ fontWeight: 700 }}>
              <td>{ar ? "الإجمالي" : "Total"}</td>
              <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(tb.totalDebit)}</td>
              <td className="font-mono" style={{ textAlign: "end" }}>{formatMoney(tb.totalCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between" }}>
        <span>{ar ? "التوازن" : "Balance check"}</span>
        <span className={tb.balanced ? "metric-up" : "metric-down"}>
          {tb.balanced ? (ar ? "مدين = دائن ✓" : "Debits = Credits ✓") : (ar ? "غير متوازن!" : "Out of balance!")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{ar ? "القوائم المالية" : "Financial Statements"}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            {ar
              ? `${formatNumber(accounts.length)} حساب في دفتر الأستاذ · مبنية من قيود اليومية المرحّلة`
              : `${formatNumber(accounts.length)} ledger accounts · built from posted journal entries`}
          </p>
        </div>

        {!hasPostings ? (
          <EmptyState
            icon={Scale}
            title={ar ? "لا قيود مرحّلة بعد" : "No posted entries yet"}
            description={
              ar
                ? "أنشئ فاتورة أو سجّل دفعة — القوائم المالية تُبنى تلقائياً من قيود اليومية."
                : "Create an invoice or record a payment — statements build automatically from journal entries."
            }
          />
        ) : (
          <StatementsTabsClient
            trialBalance={tbNode}
            incomeStatement={plNode}
            balanceSheet={bsNode}
            labels={{
              trialBalance: ar ? "ميزان المراجعة" : "Trial balance",
              incomeStatement: ar ? "قائمة الدخل" : "Income statement",
              balanceSheet: ar ? "الميزانية العمومية" : "Balance sheet",
            }}
          />
        )}
      </div>
    </div>
  );
}
