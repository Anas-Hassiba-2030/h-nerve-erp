
export const dynamic = "force-dynamic";
// Executive Reports — index page listing per-company one-pagers.
// Each report is print-friendly (ctrl+P → PDF) with the Hourani brand banner.

import Link from "next/link";
import { FileText, Printer, ArrowRight, Building2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber, formatMoney } from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

export default async function ReportsIndexPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const [companies, transactions, esg] = await Promise.all([
    prisma.company.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: {
        occurredAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.sustainabilityScore.findMany(),
  ]);

  const revenueByCompany = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "REVENUE") continue;
    revenueByCompany.set(
      t.companyId,
      (revenueByCompany.get(t.companyId) ?? 0) + t.amount,
    );
  }
  const esgByCompany = new Map<string, number>();
  for (const s of esg) esgByCompany.set(s.companyId, s.overall);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "التقارير التنفيذية" : "Executive reports"}
        title={ar ? "التقارير الرسمية" : "Official reports"}
        subtitle={
          ar
            ? `${formatNumber(companies.length)} تقرير شركة جاهز للطباعة كـ PDF`
            : `${formatNumber(companies.length)} per-company reports — print-ready as PDF`
        }
        metrics={[
          { label: ar ? "شركات" : "Companies", value: formatNumber(companies.length), tone: "emerald" },
          {
            label: ar ? "إيراد سنوي" : "12-mo revenue",
            value: formatMoney(
              Array.from(revenueByCompany.values()).reduce((a, b) => a + b, 0),
            ),
            tone: "blue",
          },
        ]}
      />
      <PageContainer>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const brand = getCompanyBrand(c.code);
            const rev = revenueByCompany.get(c.id) ?? 0;
            const esgScore = esgByCompany.get(c.id);
            return (
              <Link
                key={c.id}
                href={`/reports/${c.id}`}
                className="card card-hover group relative overflow-hidden p-0"
              >
                {/* gradient banner */}
                <div
                  className="relative h-20 px-4 py-3"
                  style={{ background: brand.gradient }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-white ring-1 ring-white/30"
                      style={{ background: "rgba(255,255,255,0.18)" }}
                    >
                      {brand.emblem}
                    </span>
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-semibold text-white">
                        {ar ? c.name : c.nameEn}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                        {c.code} · {c.sector}
                      </div>
                    </div>
                    <FileText className="ms-auto h-4 w-4 text-white/80" />
                  </div>
                </div>

                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: "var(--heri-ink-3)" }}>
                      {ar ? "إيراد ١٢ شهر" : "12-mo revenue"}
                    </span>
                    <span
                      className="font-mono text-[12px] font-semibold tabular-nums"
                      style={{ color: "var(--heri-ink)" }}
                    >
                      {formatMoney(rev)}
                    </span>
                  </div>
                  {esgScore !== undefined ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: "var(--heri-ink-3)" }}>ESG</span>
                      <span
                        className="font-mono text-[12px] font-semibold tabular-nums"
                        style={{ color: "var(--heri-ochre)" }}
                      >
                        {esgScore.toFixed(1)}/100
                      </span>
                    </div>
                  ) : null}
                  <div
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-bold transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                    style={{
                      background: "var(--heri-cream-2)",
                      color: "var(--heri-ochre)",
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Printer className="h-3 w-3" />
                      {ar ? "افتح التقرير الرسمي" : "Open formal report"}
                    </span>
                    <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </PageContainer>
    </>
  );
}
