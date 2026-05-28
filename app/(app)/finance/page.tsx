import Link from "next/link";
import { Wallet, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeriKpi } from "@/components/HeriKpi";
import { ExportMenu } from "@/components/ExportMenu";
import { SectorPill } from "@/components/SectorPill";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, formatShortDate } from "@/lib/utils";
import { deleteTransaction } from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, { ar: string; en: string; tone: string }> = {
  REVENUE:  { ar: "إيراد",  en: "Revenue",  tone: "badge-emerald" },
  EXPENSE:  { ar: "مصروف",  en: "Expense",  tone: "badge-red" },
  TRANSFER: { ar: "تحويل",  en: "Transfer", tone: "badge-blue" },
};

export default async function FinancePage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [transactions, allCompanies] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { occurredAt: "desc" },
      include: { company: true, createdBy: true },
      take: 60,
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);

  const tx30 = transactions.filter((t) => new Date(t.occurredAt) >= last30);
  const tx90 = transactions.filter((t) => new Date(t.occurredAt) >= last90);

  const sumKind = (rows: typeof transactions, kind: string) =>
    rows.filter((t) => t.kind === kind).reduce((acc, t) => acc + t.amount, 0);

  const revenue30 = sumKind(tx30, "REVENUE");
  const expense30 = sumKind(tx30, "EXPENSE");
  const transfer30 = sumKind(tx30, "TRANSFER");
  const net30 = revenue30 - expense30;

  const revenue90 = sumKind(tx90, "REVENUE");
  const expense90 = sumKind(tx90, "EXPENSE");

  // Per-company breakdown (last 30 days)
  const perCompany = new Map<string, { revenue: number; expense: number }>();
  for (const c of allCompanies) perCompany.set(c.id, { revenue: 0, expense: 0 });
  for (const t of tx30) {
    const cur = perCompany.get(t.companyId);
    if (!cur) continue;
    if (t.kind === "REVENUE") cur.revenue += t.amount;
    if (t.kind === "EXPENSE") cur.expense += t.amount;
  }

  return (
    <>
      <PageHeader
        eyebrow={ar ? "المركز المالي" : "Finance Center"}
        title={ar ? "السجل المالي الموحّد" : "Unified financial ledger"}
        subtitle={
          ar
            ? "رؤية واحدة عبر شركات المجموعة — إيرادات، مصاريف، وتحويلات."
            : "One view across the group — revenue, expenses, transfers."
        }
      />

      <PageContainer>
        {/* Action rail */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "آخر 30 يوماً" : "Last 30 days"}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/finance/new" className="heri-btn heri-btn-primary" style={{ fontSize: 13 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "عملية جديدة" : "New transaction"}
            </Link>
            <ExportMenu type="finance" locale={lc} />
          </div>
        </div>

        {/* KPI band — Heritage tiles with count-up */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "إيرادات 30 يوم" : "Revenue 30d"}
            raw={revenue30}
            kind="money"
            hint={`${formatMoney(revenue90)} ${ar ? "في 90ي" : "90d"}`}
          />
          <HeriKpi
            label={ar ? "مصاريف 30 يوم" : "Expenses 30d"}
            raw={expense30}
            kind="money"
            accent="var(--heri-terracotta, #b85c38)"
            hint={`${formatMoney(expense90)} ${ar ? "في 90ي" : "90d"}`}
          />
          <HeriKpi
            label={ar ? "صافي الربح 30ي" : "Net 30d"}
            raw={net30}
            kind="money"
            accent={net30 >= 0 ? "var(--heri-teal, #1f4e4a)" : "var(--heri-terracotta, #b85c38)"}
            hint={net30 >= 0 ? (ar ? "ربح إيجابي" : "Positive") : (ar ? "خسارة" : "Loss")}
          />
          <HeriKpi
            label={ar ? "تحويلات داخلية" : "Internal transfers"}
            raw={transfer30}
            kind="money"
            hint={ar ? "آخر 30 يوم" : "last 30 days"}
          />
        </section>

        {/* Per-company breakdown */}
        <section className="heri-card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--heri-rule)" }}>
            <div className="heri-eyebrow heri-eyebrow-ink">
              {ar ? "حسب الشركة" : "By company"}
            </div>
            <div
              style={{
                fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--heri-ink)",
                marginTop: 2,
              }}
            >
              {ar ? "توزيع الأداء (30 يوم)" : "Performance by company (30d)"}
            </div>
          </div>
          <div className="table-wrap rounded-none border-0 shadow-none">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الشركة" : "Company"}</th>
                  <th>{ar ? "القطاع" : "Sector"}</th>
                  <th>{ar ? "إيرادات" : "Revenue"}</th>
                  <th>{ar ? "مصاريف" : "Expenses"}</th>
                  <th>{ar ? "الصافي" : "Net"}</th>
                </tr>
              </thead>
              <tbody>
                {allCompanies.map((c) => {
                  const v = perCompany.get(c.id) ?? { revenue: 0, expense: 0 };
                  const net = v.revenue - v.expense;
                  return (
                    <tr key={c.id}>
                      <td className="font-bold" style={{ color: "var(--heri-ink)" }}>{c.name}</td>
                      <td><SectorPill sector={c.sector} /></td>
                      <td className="font-mono" style={{ color: "var(--heri-teal, #1f4e4a)" }}>{formatMoney(v.revenue)}</td>
                      <td className="font-mono" style={{ color: "var(--heri-terracotta, #b85c38)" }}>{formatMoney(v.expense)}</td>
                      <td
                        className="font-mono font-bold"
                        style={{ color: net >= 0 ? "var(--heri-teal, #1f4e4a)" : "var(--heri-terracotta, #b85c38)" }}
                      >
                        {formatMoney(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Transactions list */}
        <section className="space-y-3">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "العمليات الأخيرة" : "Recent transactions"}
          </div>
          {transactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={ar ? "لا توجد عمليات مالية بعد" : "No transactions yet"}
              action={
                <Link href="/finance/new" className="heri-btn heri-btn-primary">
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  {ar ? "أضف أول عملية" : "Add the first transaction"}
                </Link>
              }
            />
          ) : (
            <div className="heri-card" style={{ padding: 0 }}>
              <div className="table-wrap rounded-none border-0 shadow-none">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{ar ? "المرجع" : "Ref"}</th>
                      <th>{ar ? "التاريخ" : "Date"}</th>
                      <th>{ar ? "الشركة" : "Company"}</th>
                      <th>{ar ? "النوع" : "Type"}</th>
                      <th>{ar ? "التصنيف" : "Category"}</th>
                      <th>{ar ? "المبلغ" : "Amount"}</th>
                      <th>{ar ? "سُجّلت بواسطة" : "Logged by"}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="font-mono text-xs" style={{ color: "var(--heri-ink-3)" }}>{t.reference}</td>
                        <td className="text-xs">{formatShortDate(t.occurredAt)}</td>
                        <td className="font-bold" style={{ color: "var(--heri-ink)" }}>{t.company.name}</td>
                        <td>
                          <span className={KIND_LABEL[t.kind]?.tone ?? "badge-slate"}>
                            {ar ? KIND_LABEL[t.kind]?.ar ?? t.kind : KIND_LABEL[t.kind]?.en ?? t.kind}
                          </span>
                        </td>
                        <td style={{ color: "var(--heri-ink-2)" }}>{t.category}</td>
                        <td
                          className="font-mono font-bold"
                          style={{
                            color:
                              t.kind === "REVENUE"
                                ? "var(--heri-teal, #1f4e4a)"
                                : t.kind === "EXPENSE"
                                  ? "var(--heri-terracotta, #b85c38)"
                                  : "var(--heri-ochre-2, #a87a32)",
                          }}
                        >
                          {formatMoney(t.amount, t.currency)}
                        </td>
                        <td className="text-xs" style={{ color: "var(--heri-ink-3)" }}>{t.createdBy?.name ?? "—"}</td>
                        <td>
                          <DeleteButton action={deleteTransaction} payload={{ id: t.id }} label={`${ar ? "حذف العملية" : "Delete"} ${t.reference}؟`} description={ar ? "سيتم حذف هذه الحركة المالية من السجل." : "This entry will be removed from the ledger."} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--heri-ink-3)" }}>
            {ar
              ? `عرض آخر ${formatNumber(transactions.length)} عملية`
              : `Showing last ${formatNumber(transactions.length)} transactions`}
          </div>
        </section>
      </PageContainer>
    </>
  );
}
