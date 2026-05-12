import Link from "next/link";
import {
  Wallet, Plus, Trash2, TrendingUp, TrendingDown, ArrowLeftRight,
  Building2, Download, CircleDollarSign, Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { ExportMenu } from "@/components/ExportMenu";
import { SectorPill } from "@/components/SectorPill";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, formatShortDate } from "@/lib/utils";
import { deleteTransaction } from "./actions";

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
        <HeroPanel
          gradient="linear-gradient(135deg, #064e3b 0%, #047857 45%, #10b981 100%)"
          accent="#10b981"
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <div
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl ring-2 ring-white/40"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <Landmark className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <CircleDollarSign className="h-3 w-3" />
                  {ar ? "النمو والاستثمار" : "Growth & Capital"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "المركز المالي" : "Finance Center"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "السجل المالي الموحّد عبر كل شركات الحوراني — صورة واحدة، حقيقة واحدة."
                    : "One unified ledger across every Hourani company — one picture, one truth."}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  <Link
                    href="/finance/new"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{ background: "white", color: "#047857" }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {ar ? "عملية جديدة" : "New transaction"}
                  </Link>
                  <ExportMenu type="finance" locale={lc} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <FinHeroStat label={ar ? "إيراد 30ي" : "Revenue 30d"} value={formatMoney(revenue30)} icon={TrendingUp} />
              <FinHeroStat label={ar ? "مصاريف 30ي" : "Expenses 30d"} value={formatMoney(expense30)} icon={TrendingDown} />
              <FinHeroStat label={ar ? "صافي" : "Net"} value={formatMoney(net30)} icon={Wallet} />
              <FinHeroStat label={ar ? "تحويلات" : "Transfers"} value={formatMoney(transfer30)} icon={ArrowLeftRight} />
            </div>
          </div>
        </HeroPanel>

        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "إيرادات 30 يوم" : "Revenue 30d"}
            value={formatMoney(revenue30)}
            icon={TrendingUp}
            tone="emerald"
            hint={`${formatMoney(revenue90)} ${ar ? "في 90ي" : "90d total"}`}
          />
          <MetricTile
            label={ar ? "مصاريف 30 يوم" : "Expenses 30d"}
            value={formatMoney(expense30)}
            icon={TrendingDown}
            tone="rose"
            hint={`${formatMoney(expense90)} ${ar ? "في 90ي" : "90d total"}`}
          />
          <MetricTile
            label={ar ? "صافي الربح 30ي" : "Net 30d"}
            value={formatMoney(net30)}
            icon={Wallet}
            tone={net30 >= 0 ? "emerald" : "rose"}
            hint={
              net30 >= 0
                ? ar ? "ربح إيجابي" : "Positive"
                : ar ? "خسارة" : "Loss"
            }
          />
          <MetricTile
            label={ar ? "تحويلات داخلية" : "Internal transfers"}
            value={formatMoney(transfer30)}
            icon={ArrowLeftRight}
            tone="blue"
            hint={ar ? "آخر 30 يوم" : "last 30 days"}
          />
        </section>

        {/* Per-company breakdown */}
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">توزيع الأداء على شركات المجموعة (30 يوم)</div>
              <div className="card-sub">إيرادات، مصاريف، وصافي لكل وحدة</div>
            </div>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="table-wrap rounded-none border-0 shadow-none">
            <table className="table">
              <thead>
                <tr>
                  <th>الشركة</th>
                  <th>القطاع</th>
                  <th>إيرادات</th>
                  <th>مصاريف</th>
                  <th>الصافي</th>
                </tr>
              </thead>
              <tbody>
                {allCompanies.map((c) => {
                  const v = perCompany.get(c.id) ?? { revenue: 0, expense: 0 };
                  const net = v.revenue - v.expense;
                  return (
                    <tr key={c.id}>
                      <td className="font-bold text-brand-900">{c.name}</td>
                      <td><SectorPill sector={c.sector} /></td>
                      <td className="font-mono text-emerald-700">{formatMoney(v.revenue)}</td>
                      <td className="font-mono text-red-600">{formatMoney(v.expense)}</td>
                      <td className={`font-mono font-bold ${net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
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
          <div className="section-title">العمليات الأخيرة</div>
          {transactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="لا توجد عمليات مالية بعد"
              action={
                <Link href="/finance/new" className="btn-primary">
                  <Plus className="h-4 w-4" />
                  أضف أول عملية
                </Link>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>المرجع</th>
                    <th>التاريخ</th>
                    <th>الشركة</th>
                    <th>النوع</th>
                    <th>التصنيف</th>
                    <th>المبلغ</th>
                    <th>سُجّلت بواسطة</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs text-slate-500">{t.reference}</td>
                      <td className="text-xs">{formatShortDate(t.occurredAt)}</td>
                      <td className="font-bold text-brand-900">{t.company.name}</td>
                      <td>
                        <span className={KIND_LABEL[t.kind]?.tone ?? "badge-slate"}>
                          {ar ? KIND_LABEL[t.kind]?.ar ?? t.kind : KIND_LABEL[t.kind]?.en ?? t.kind}
                        </span>
                      </td>
                      <td className="text-slate-700">{t.category}</td>
                      <td
                        className={`font-mono font-bold ${
                          t.kind === "REVENUE"
                            ? "text-emerald-700"
                            : t.kind === "EXPENSE"
                              ? "text-red-600"
                              : "text-blue-700"
                        }`}
                      >
                        {formatMoney(t.amount, t.currency)}
                      </td>
                      <td className="text-xs text-slate-500">{t.createdBy?.name ?? "—"}</td>
                      <td>
                        <DeleteButton action={deleteTransaction} payload={{ id: t.id }} label={`حذف العملية ${t.reference}؟`} description="سيتم حذف هذه الحركة المالية من السجل." />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-xs text-slate-400">
            {ar
              ? `عرض آخر ${formatNumber(transactions.length)} عملية`
              : `Showing last ${formatNumber(transactions.length)} transactions`}
          </div>
        </section>
      </PageContainer>
    </>
  );
}

function FinHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-base font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}
