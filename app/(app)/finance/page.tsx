import Link from "next/link";
import { Wallet, Plus } from "lucide-react";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionTable } from "@/components/finance/TransactionTable";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/authz";
import { prisma } from "@/lib/db/db";
import { formatMoney, formatNumber, formatPercent, loc, SECTORS_AR, SECTORS_EN } from "@/lib/utils/utils";
import "../daylight.css";
import "./finance.css";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  // Bar chart spans the trailing 6 months of real movements.
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [transactions, monthTx, allCompanies] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { occurredAt: "desc" }, include: { company: true, createdBy: true }, take: 60 }),
    prisma.transaction.findMany({ where: { occurredAt: { gte: sixMonthsAgo } }, select: { kind: true, amount: true, occurredAt: true } }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);

  const inRange = (d: Date, from: Date, to?: Date) => d >= from && (to ? d < to : true);
  const tx30 = transactions.filter((t) => inRange(new Date(t.occurredAt), last30));
  const txPrev30 = transactions.filter((t) => inRange(new Date(t.occurredAt), prev30, last30));
  const tx90 = transactions.filter((t) => inRange(new Date(t.occurredAt), last90));
  const sumKind = (rows: { kind: string; amount: number }[], kind: string) =>
    rows.filter((t) => t.kind === kind).reduce((acc, t) => acc + t.amount, 0);

  const revenue30 = sumKind(tx30, "REVENUE");
  const expense30 = sumKind(tx30, "EXPENSE");
  const net30 = revenue30 - expense30;
  const margin30 = revenue30 > 0 ? net30 / revenue30 : 0;
  const cashFlow30 = revenue30 > 0 ? (revenue30 - expense30) / revenue30 : 0;

  const revenuePrev30 = sumKind(txPrev30, "REVENUE");
  const expensePrev30 = sumKind(txPrev30, "EXPENSE");
  const netPrev30 = revenuePrev30 - expensePrev30;
  const revenue90 = sumKind(tx90, "REVENUE");

  const pctChange = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0);
  const revDelta = pctChange(revenue30, revenuePrev30);
  const netDelta = pctChange(net30, netPrev30);
  const expDelta = pctChange(expense30, expensePrev30);

  // ── trailing 6-month revenue vs expense (real data) ──
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), date: d, revenue: 0, expense: 0 };
  });
  for (const t of monthTx) {
    const d = new Date(t.occurredAt);
    const b = monthBuckets.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (!b) continue;
    if (t.kind === "REVENUE") b.revenue += t.amount;
    if (t.kind === "EXPENSE") b.expense += t.amount;
  }
  const barMax = Math.max(1, ...monthBuckets.flatMap((m) => [m.revenue, m.expense]));
  const monthLabel = (d: Date) => new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", { month: "short" }).format(d);

  // ── revenue by unit (real companies) ──
  const perCompany = new Map<string, { revenue: number; expense: number; prevRevenue: number }>();
  for (const c of allCompanies) perCompany.set(c.id, { revenue: 0, expense: 0, prevRevenue: 0 });
  for (const t of tx30) {
    const cur = perCompany.get(t.companyId);
    if (!cur) continue;
    if (t.kind === "REVENUE") cur.revenue += t.amount;
    if (t.kind === "EXPENSE") cur.expense += t.amount;
  }
  for (const t of txPrev30) {
    const cur = perCompany.get(t.companyId);
    if (!cur) continue;
    if (t.kind === "REVENUE") cur.prevRevenue += t.amount;
  }

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      {/* ── section header ── */}
      <header className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "النمو ورأس المال · المالية" : "Growth & Capital · Finance"}</div>
          <h1 className="sec-title">{ar ? "المالية" : "Finance"}</h1>
          <p className="sec-sub">
            {ar
              ? "الصورة المالية الموحّدة لمجموعة الحوراني — الإيراد، التدفق النقدي، والهامش عبر الوحدات."
              : "The unified financial picture of the Hourani Group — revenue, cash flow, and margin across units."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر · مُدقّق" : "Live · audited"}</span>
          <div className="sec-actions">
            <Link href="/finance/new" className="dl-btn dl-btn-secondary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "عملية جديدة" : "New transaction"}</Link>
            <ExportMenu type="finance" locale={lc} />
          </div>
        </div>
      </header>

      {/* ── KPI band ── */}
      <section className="kpi-grid reveal">
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "إيراد المجموعة ٣٠ي" : "Group revenue 30d"}</div>
          <div className="kpi-val">{formatMoney(revenue30)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? `سابقاً ${formatMoney(revenuePrev30)}` : `Prev ${formatMoney(revenuePrev30)}`}</span>
            <span className={`delta ${revDelta >= 0 ? "up" : "down"}`}>{revDelta >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(revDelta), 1)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "صافي الربح" : "Net profit"}</div>
          <div className="kpi-val">{formatMoney(net30)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? `هامش ${formatPercent(margin30, 0)}` : `Margin ${formatPercent(margin30, 0)}`}</span>
            <span className={`delta ${netDelta >= 0 ? "up" : "down"}`}>{netDelta >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(netDelta), 1)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "التدفق النقدي" : "Cash flow"}</div>
          <div className="kpi-val">{formatPercent(cashFlow30, 1)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? "من الإيراد" : "of revenue"}</span>
            <span className={`delta ${cashFlow30 >= 0 ? "up" : "down"}`}>{cashFlow30 >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(cashFlow30), 1)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "المصاريف" : "Expenses"}</div>
          <div className="kpi-val">{formatMoney(expense30)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? `سابقاً ${formatMoney(expensePrev30)}` : `Prev ${formatMoney(expensePrev30)}`}</span>
            <span className={`delta ${expDelta <= 0 ? "up" : "down"}`}>{expDelta <= 0 ? "▼" : "▲"} {formatPercent(Math.abs(expDelta), 1)}</span>
          </div>
        </div>
      </section>

      {/* ── revenue vs expense bars ── */}
      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "الإيراد مقابل المصاريف" : "Revenue vs Expenses"}</span>
          <span className="panel-aside">{ar ? "آخر ٦ أشهر" : "Last 6 months"}</span>
        </div>
        <div className="bars">
          {monthBuckets.map((m, i) => (
            <div className="bar-col" key={i}>
              <div className="bar-stack">
                <div className="bar rev" style={{ height: `${Math.max(2, (m.revenue / barMax) * 100)}%` }} title={`${monthLabel(m.date)} · ${formatMoney(m.revenue)}`} />
                <div className="bar exp" style={{ height: `${Math.max(2, (m.expense / barMax) * 100)}%` }} title={`${monthLabel(m.date)} · ${formatMoney(m.expense)}`} />
              </div>
              <span className="bar-x">{monthLabel(m.date)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── revenue by unit ── */}
      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "الإيراد حسب الوحدة" : "Revenue by unit"}</span>
          <span className="panel-aside">{ar ? `${formatNumber(allCompanies.length)} شركات · آخر ٣٠ يوماً` : `${formatNumber(allCompanies.length)} companies · last 30 days`}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{ar ? "الوحدة" : "Unit"}</th>
              <th>{ar ? "القطاع" : "Sector"}</th>
              <th className="num">{ar ? "إيراد ٣٠ي" : "Revenue 30d"}</th>
              <th className="num">{ar ? "الهامش" : "Margin"}</th>
              <th className="num">{ar ? "التغيّر" : "Change"}</th>
              <th>{ar ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {allCompanies.map((c) => {
              const v = perCompany.get(c.id) ?? { revenue: 0, expense: 0, prevRevenue: 0 };
              const net = v.revenue - v.expense;
              const margin = v.revenue > 0 ? net / v.revenue : 0;
              const change = pctChange(v.revenue, v.prevRevenue);
              const hasActivity = v.revenue > 0 || v.expense > 0;
              const tag = !hasActivity
                ? { cls: "ok", ar: "مستقر", en: "Stable" }
                : change >= 0.1
                  ? { cls: "ok", ar: "نمو", en: "Growth" }
                  : change <= -0.2
                    ? { cls: "crit", ar: "حرج", en: "Critical" }
                    : { cls: "warn", ar: "مراقبة", en: "Watch" };
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, color: "var(--ink)" }}>{ar ? c.name : (c.nameEn ?? c.name)}</td>
                  <td>{loc(SECTORS_AR, SECTORS_EN, lc, c.sector)}</td>
                  <td className="num">{v.revenue > 0 ? formatMoney(v.revenue) : "—"}</td>
                  <td className="num">{hasActivity ? formatPercent(margin, 0) : "—"}</td>
                  <td className="num">{v.prevRevenue > 0 ? `${change >= 0 ? "+" : "−"}${formatPercent(Math.abs(change), 0)}` : "—"}</td>
                  <td><span className={`tag ${tag.cls}`}>{ar ? tag.ar : tag.en}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── recent transactions (live ledger) ── */}
      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "العمليات الأخيرة" : "Recent transactions"}</span>
          <span className="panel-aside">{ar ? `آخر ${formatNumber(transactions.length)} عملية` : `Last ${formatNumber(transactions.length)}`}</span>
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={ar ? "لا توجد عمليات مالية بعد" : "No transactions yet"}
            action={<Link href="/finance/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "أضف أول عملية" : "Add the first transaction"}</Link>}
          />
        ) : (
          <TransactionTable transactions={transactions} ar={ar} canManage={canManage} />
        )}
      </div>
    </div>
  );
}
