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
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { prismaUnscoped } from "@/lib/db";
import { Topbar } from "@/components/Topbar";
import { formatMoney2, formatNumber } from "@/lib/utils";
import { AdminFamilyNav } from "@/components/AdminFamilyNav";
import { NewAccountForm } from "./AccountForms";

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
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) redirect("/dashboard");

  const periodSel = str(searchParams.period);
  const fmtP = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

  const [periods, accounts] = await Promise.all([
    prismaUnscoped.financialPeriod.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prismaUnscoped.ledgerAccount.findMany({ orderBy: { code: "asc" } }),
  ]);
  const active =
    periods.find((p) => fmtP(p.year, p.month) === periodSel) ?? periods[0] ?? null;

  const grouped = active
    ? await prismaUnscoped.journalLine.groupBy({
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
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span
        className="font-mono"
        style={{ color: "var(--text)", fontWeight: strong ? 800 : 500 }}
      >
        {formatMoney2(value)}
      </span>
    </div>
  );

  return (
    <>
      <Topbar
        eyebrow={ar ? "المحاسبة" : "Accounting"}
        title={ar ? "دليل الحسابات" : "Chart of Accounts"}
        subtitle={
          ar
            ? "الأرصدة الجارية + قائمة الدخل + الميزانية للفترة المختارة"
            : "Running balances + P&L + Balance Sheet for the selected period"
        }
        actions={<AdminFamilyNav current="/admin/accounts" ar={ar} />}
        metrics={[
          { label: ar ? "حسابات" : "Accounts", value: formatNumber(accounts.length), tone: "blue" },
          { label: ar ? "الإيراد" : "Revenue", value: formatMoney2(revenue), tone: "emerald" },
          { label: ar ? "صافي الدخل" : "Net income", value: formatMoney2(netIncome), tone: netIncome >= 0 ? "emerald" : "amber" },
          { label: ar ? "الميزانية متوازنة" : "BS balanced", value: balanced ? "✓" : formatMoney2(identityDiff), tone: balanced ? "emerald" : "amber" },
        ]}
      />

      <div className="mt-3">
        <NewAccountForm tenantDefault={tenantDefault} ar={ar} />
      </div>

      <div className="card card-pad mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
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
        <div className="card card-pad mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <Landmark className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {ar ? "دليل الحسابات غير مُهيّأ" : "Chart of Accounts not seeded"}
          </p>
        </div>
      ) : (
        <>
          <section className="mt-3 flex flex-col gap-3">
            {TYPE_ORDER.filter((t) => byType(t).length > 0).map((t) => (
              <div key={t} className="card overflow-hidden">
                <div
                  className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
                >
                  {t}
                </div>
                <div className="table-wrap">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th className="px-3 py-2 text-start font-bold">{ar ? "الرمز" : "Code"}</th>
                        <th className="px-3 py-2 text-start font-bold">{ar ? "الاسم" : "Name"}</th>
                        <th className="px-3 py-2 text-end font-bold">{ar ? "الرصيد (الفترة)" : "Balance (period)"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byType(t).map((a) => (
                        <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="px-3 py-2 font-mono">{a.code}</td>
                          <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                            {a.name}
                            {!a.active ? <span className="badge-slate ms-2">{ar ? "غير نشط" : "inactive"}</span> : null}
                          </td>
                          <td className="px-3 py-2 text-end font-mono" style={{ color: "var(--text)" }}>
                            {formatMoney2(balOf(a))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="card card-pad">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {ar ? "قائمة الدخل" : "Profit & Loss"}
              </div>
              <Stat label={ar ? "الإيراد" : "Revenue"} value={revenue} />
              <Stat label={ar ? "(تكلفة المبيعات)" : "(COGS)"} value={-cogs} />
              <Stat label={ar ? "(مصروفات)" : "(Expenses)"} value={-expense} />
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 4 }} />
              <Stat label={ar ? "صافي الدخل" : "Net income"} value={netIncome} strong />
            </div>
            <div className="card card-pad">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {ar ? "الميزانية العمومية" : "Balance Sheet"}
              </div>
              <Stat label={ar ? "الأصول" : "Assets"} value={assets} strong />
              <Stat label={ar ? "الخصوم" : "Liabilities"} value={liabilities} />
              <Stat label={ar ? "حقوق الملكية + صافي الدخل" : "Equity + net income"} value={equity} />
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 4 }} />
              <div className="flex items-center justify-between py-1 text-sm">
                <span style={{ color: "var(--text-muted)" }}>
                  {ar ? "أصول − (خصوم + حقوق)" : "Assets − (Liab + Equity)"}
                </span>
                <span className={balanced ? "badge-emerald" : "badge-red"}>
                  {balanced ? (ar ? "متوازنة ✓" : "Balanced ✓") : formatMoney2(identityDiff)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
