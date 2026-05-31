import Link from "next/link";
import { Wallet, Plus } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import { SectorPill } from "@/components/SectorPill";
import { EmptyState } from "@/components/EmptyState";
import { TransactionTable } from "@/components/finance/TransactionTable";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { hasRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/utils";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [transactions, allCompanies] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { occurredAt: "desc" }, include: { company: true, createdBy: true }, take: 60 }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);

  const tx30 = transactions.filter((t) => new Date(t.occurredAt) >= last30);
  const tx90 = transactions.filter((t) => new Date(t.occurredAt) >= last90);
  const sumKind = (rows: typeof transactions, kind: string) => rows.filter((t) => t.kind === kind).reduce((acc, t) => acc + t.amount, 0);

  const revenue30 = sumKind(tx30, "REVENUE");
  const expense30 = sumKind(tx30, "EXPENSE");
  const transfer30 = sumKind(tx30, "TRANSFER");
  const net30 = revenue30 - expense30;
  const revenue90 = sumKind(tx90, "REVENUE");
  const expense90 = sumKind(tx90, "EXPENSE");

  const perCompany = new Map<string, { revenue: number; expense: number }>();
  for (const c of allCompanies) perCompany.set(c.id, { revenue: 0, expense: 0 });
  for (const t of tx30) {
    const cur = perCompany.get(t.companyId);
    if (!cur) continue;
    if (t.kind === "REVENUE") cur.revenue += t.amount;
    if (t.kind === "EXPENSE") cur.expense += t.amount;
  }

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المالية · المركز المالي" : "Finance Center"}
        title={ar ? "السجل المالي الموحّد" : "Unified Financial Ledger"}
        subtitle={ar ? "رؤية واحدة عبر شركات المجموعة — إيرادات، مصاريف، وتحويلات — آخر ثلاثين يوماً." : "One view across the group — revenue, expenses and transfers — last 30 days."}
        status={ar ? "مباشر · محدّث الآن" : "Live · updated now"}
        actions={
          <>
            <Link href="/finance/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "عملية جديدة" : "New transaction"}</Link>
            <ExportMenu type="finance" locale={lc} />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إيرادات ٣٠ يوم" : "Revenue 30d"} value={formatMoney(revenue30)} hint={`${formatMoney(revenue90)} ${ar ? "في ٩٠ي" : "90d"}`} delta={{ dir: "up", text: ar ? "إيراد" : "rev" }} />
        <DaylightKpi label={ar ? "مصاريف ٣٠ يوم" : "Expenses 30d"} value={formatMoney(expense30)} hint={`${formatMoney(expense90)} ${ar ? "في ٩٠ي" : "90d"}`} delta={{ dir: "down", text: ar ? "مصروف" : "exp" }} />
        <DaylightKpi label={ar ? "صافي الربح ٣٠ي" : "Net 30d"} value={formatMoney(net30)} hint={net30 >= 0 ? (ar ? "ربح إيجابي" : "Positive") : (ar ? "خسارة" : "Loss")} delta={{ dir: net30 >= 0 ? "up" : "down", text: net30 >= 0 ? (ar ? "ربح" : "profit") : (ar ? "خسارة" : "loss") }} />
        <DaylightKpi label={ar ? "تحويلات داخلية" : "Internal transfers"} value={formatMoney(transfer30)} hint={ar ? "آخر ٣٠ يوم" : "last 30 days"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الأداء حسب الشركة" : "Performance by company"} aside={ar ? "آخر ٣٠ يوم" : "Last 30 days"}>
        <div style={{ overflowX: "auto" }}>
          <table className="dl-table">
            <thead>
              <tr>
                <th>{ar ? "الشركة" : "Company"}</th>
                <th>{ar ? "القطاع" : "Sector"}</th>
                <th className="num">{ar ? "إيرادات" : "Revenue"}</th>
                <th className="num">{ar ? "مصاريف" : "Expenses"}</th>
                <th className="num">{ar ? "الصافي" : "Net"}</th>
              </tr>
            </thead>
            <tbody>
              {allCompanies.map((c) => {
                const v = perCompany.get(c.id) ?? { revenue: 0, expense: 0 };
                const net = v.revenue - v.expense;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: "var(--ink)" }}>{c.name}</td>
                    <td><SectorPill sector={c.sector} /></td>
                    <td className="num" style={{ fontFamily: "monospace", color: "var(--emerald)" }}>{formatMoney(v.revenue)}</td>
                    <td className="num" style={{ fontFamily: "monospace", color: "var(--brick)" }}>{formatMoney(v.expense)}</td>
                    <td className="num" style={{ fontFamily: "monospace", fontWeight: 700, color: net >= 0 ? "var(--emerald)" : "var(--brick)" }}>{formatMoney(net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DaylightPanel>

      <DaylightPanel title={ar ? "العمليات الأخيرة" : "Recent transactions"} aside={ar ? `آخر ${formatNumber(transactions.length)} عملية` : `Last ${formatNumber(transactions.length)}`}>
        {transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={ar ? "لا توجد عمليات مالية بعد" : "No transactions yet"}
            action={<Link href="/finance/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "أضف أول عملية" : "Add the first transaction"}</Link>}
          />
        ) : (
          <TransactionTable transactions={transactions} ar={ar} canManage={canManage} />
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
