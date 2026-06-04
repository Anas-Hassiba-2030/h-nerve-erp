// /admin/accounts — Chart of Accounts + P&L + Balance Sheet (Phase 8).
// Running balances are for the selected period. Equity on the Balance
// Sheet INCLUDES current-period net income — pre-period-close (Phase
// 11) net income hasn't flowed to Retained Earnings, so without this
// the accounting identity looks off by exactly net income (correct
// accounting, not a bug). Single-tenant aggregate (no tenant switcher
// in this admin family — Phase 11 concern).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { formatMoney2, formatNumber } from "@/lib/utils/utils";
import { AdminFamilyNav } from "@/components/layout/AdminFamilyNav";
import { NewAccountForm } from "./AccountForms";
import "../../daylight.css";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };
const str = (v: string | string[] | undefined) =>
  (typeof v === "string" ? v.trim() : "") || "";

const DEBIT_NORMAL = new Set(["ASSET", "EXPENSE", "COGS"]);
const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "COGS", "EXPENSE"];

export default async function AccountsPage({ searchParams }: { searchParams: SP }) {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const periodSel = str(searchParams.period);
  const fmtP = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

  const [periods, accounts] = await Promise.all([
    prisma.financialPeriod.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.ledgerAccount.findMany({ orderBy: { code: "asc" } }),
  ]);
  const active =
    periods.find((p) => fmtP(p.year, p.month) === periodSel) ?? periods[0] ?? null;

  const grouped = active
    ? await prisma.journalLine.groupBy({
        by: ["accountId"],
        _sum: { debit: true, credit: true },
        where: { entry: { status: "POSTED", periodId: active.id } },
      })
    : [];
  const sums = new Map(
    grouped.map((g) => [
      g.accountId,
      { d: Number(g._sum.debit ?? 0), c: Number(g._sum.credit ?? 0) },
    ]),
  );

  // Natural balance per account (debit-normal vs credit-normal).
  const balOf = (acc: { id: string; type: string }) => {
    const s = sums.get(acc.id) ?? { d: 0, c: 0 };
    return DEBIT_NORMAL.has(acc.type) ? s.d - s.c : s.c - s.d;
  };
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const sumType = (t: string) =>
    r2(accounts.filter((a) => a.type === t).reduce((x, a) => x + balOf(a), 0));

  const revenue = sumType("REVENUE");
  const cogs = sumType("COGS");
  const expense = sumType("EXPENSE");
  const netIncome = r2(revenue - cogs - expense);

  const assets = sumType("ASSET");
  const liabilities = sumType("LIABILITY");
  const equityRaw = sumType("EQUITY");
  const equity = r2(equityRaw + netIncome); // NI not yet closed to RE
  const identityDiff = r2(assets - (liabilities + equity));
  const balanced = Math.abs(identityDiff) < 0.005;

  const tenantDefault = accounts[0]?.tenantId ?? "hourani-hotels";
  const byType = (t: string) => accounts.filter((a) => a.type === t);

  const Stat = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => (
    <div className="flex items-center justify-between py-1 text-sm">
      <span style={{ color: "var(--ink-muted)" }}>{label}</span>
      <span
        className="font-mono"
        style={{ color: "var(--ink)", fontWeight: strong ? 800 : 500 }}
      >
        {formatMoney2(value)}
      </span>
    </div>
  );

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المحاسبة" : "Accounting"}
        title={ar ? "دليل الحسابات" : "Chart of Accounts"}
        subtitle={
          ar
            ? "الأرصدة الجارية + قائمة الدخل + الميزانية للفترة المختارة"
            : "Running balances + P&L + Balance Sheet for the selected period"
        }
      />

      <AdminFamilyNav current="/admin/accounts" ar={ar} />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "حسابات" : "Accounts"} value={formatNumber(accounts.length)} />
        <DaylightKpi label={ar ? "الإيراد" : "Revenue"} value={formatMoney2(revenue)} />
        <DaylightKpi label={ar ? "صافي الدخل" : "Net income"} value={formatMoney2(netIncome)} />
        <DaylightKpi label={ar ? "الميزانية متوازنة" : "BS balanced"} value={balanced ? "✓" : formatMoney2(identityDiff)} />
      </DaylightKpiGrid>

      <div className="mt-3">
        <NewAccountForm tenantDefault={tenantDefault} ar={ar} />
      </div>

      <div className="panel reveal mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
          {ar ? "الفترة" : "Period"}
        </span>
        {periods.length === 0 ? (
          <span className="badge-slate">{ar ? "لا فترات بعد" : "no periods yet"}</span>
        ) : (
          periods.map((p) => {
            const k = fmtP(p.year, p.month);
            const on = active && active.id === p.id;
            return (
              <Link key={p.id} href={`/admin/accounts?period=${k}`} className={on ? "badge-emerald" : "badge-slate"}>
                {k} {p.status === "CLOSED" ? "🔒" : ""}
              </Link>
            );
          })
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="panel reveal mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <Landmark className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>
            {ar ? "دليل الحسابات غير مُهيّأ" : "Chart of Accounts not seeded"}
          </p>
        </div>
      ) : (
        <>
          <section className="mt-3 flex flex-col gap-3">
            {TYPE_ORDER.filter((t) => byType(t).length > 0).map((t) => (
              <DaylightPanel key={t} title={t}>
                <table className="dl-table">
                  <thead>
                    <tr>
                      <th>{ar ? "الرمز" : "Code"}</th>
                      <th>{ar ? "الاسم" : "Name"}</th>
                      <th className="num">{ar ? "الرصيد (الفترة)" : "Balance (period)"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byType(t).map((a) => (
                      <tr key={a.id}>
                        <td className="font-mono">{a.code}</td>
                        <td>
                          {a.name}
                          {!a.active ? <span className="badge-slate ms-2">{ar ? "غير نشط" : "inactive"}</span> : null}
                        </td>
                        <td className="num font-mono">
                          {formatMoney2(balOf(a))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DaylightPanel>
            ))}
          </section>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <DaylightPanel title={ar ? "قائمة الدخل" : "Profit & Loss"}>
              <Stat label={ar ? "الإيراد" : "Revenue"} value={revenue} />
              <Stat label={ar ? "(تكلفة المبيعات)" : "(COGS)"} value={-cogs} />
              <Stat label={ar ? "(مصروفات)" : "(Expenses)"} value={-expense} />
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 4 }} />
              <Stat label={ar ? "صافي الدخل" : "Net income"} value={netIncome} strong />
            </DaylightPanel>
            <DaylightPanel title={ar ? "الميزانية العمومية" : "Balance Sheet"}>
              <Stat label={ar ? "الأصول" : "Assets"} value={assets} strong />
              <Stat label={ar ? "الخصوم" : "Liabilities"} value={liabilities} />
              <Stat label={ar ? "حقوق الملكية + صافي الدخل" : "Equity + net income"} value={equity} />
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 4 }} />
              <div className="flex items-center justify-between py-1 text-sm">
                <span style={{ color: "var(--ink-muted)" }}>
                  {ar ? "أصول − (خصوم + حقوق)" : "Assets − (Liab + Equity)"}
                </span>
                <span className={balanced ? "badge-emerald" : "badge-red"}>
                  {balanced ? (ar ? "متوازنة ✓" : "Balanced ✓") : formatMoney2(identityDiff)}
                </span>
              </div>
            </DaylightPanel>
          </div>
        </>
      )}
    </DaylightShell>
  );
}
