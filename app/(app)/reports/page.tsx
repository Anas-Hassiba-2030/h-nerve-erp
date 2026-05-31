export const dynamic = "force-dynamic";
// Executive Reports — index of per-company one-pagers (print-friendly).

import Link from "next/link";
import { FileText, Printer, ArrowRight } from "lucide-react";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber, formatMoney } from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";
import "../daylight.css";

export default async function ReportsIndexPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const [companies, transactions, esg] = await Promise.all([
    prisma.company.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { occurredAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } }),
    prisma.sustainabilityScore.findMany(),
  ]);

  const revenueByCompany = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "REVENUE") continue;
    revenueByCompany.set(t.companyId, (revenueByCompany.get(t.companyId) ?? 0) + t.amount);
  }
  const esgByCompany = new Map<string, number>();
  for (const s of esg) esgByCompany.set(s.companyId, s.overall);
  const total12mo = Array.from(revenueByCompany.values()).reduce((a, b) => a + b, 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المالية · التقارير التنفيذية" : "Finance · Executive Reports"}
        title={ar ? "التقارير الرسمية" : "Official Reports"}
        subtitle={ar ? `${formatNumber(companies.length)} تقرير شركة جاهز للطباعة كـ PDF.` : `${formatNumber(companies.length)} per-company reports — print-ready as PDF.`}
        status={ar ? "جاهزة للطباعة" : "Print-ready"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "شركات" : "Companies"} value={formatNumber(companies.length)} hint={ar ? "تقارير جاهزة" : "reports ready"} />
        <DaylightKpi label={ar ? "إيراد ١٢ شهر" : "12-mo revenue"} value={formatMoney(total12mo)} hint={ar ? "عبر المجموعة" : "across the group"} />
        <DaylightKpi label={ar ? "تقارير ESG" : "ESG reports"} value={formatNumber(esgByCompany.size)} hint={ar ? "استدامة" : "sustainability"} />
        <DaylightKpi label={ar ? "صيغة" : "Format"} value="PDF" hint={ar ? "اطبع كـ PDF" : "Ctrl+P → PDF"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "تقارير الشركات" : "Company reports"} aside={ar ? "اختر شركة لفتح تقريرها الرسمي" : "Pick a company to open its formal report"}>
        <div className="prop-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {companies.map((c) => {
            const brand = getCompanyBrand(c.code);
            const rev = revenueByCompany.get(c.id) ?? 0;
            const esgScore = esgByCompany.get(c.id);
            return (
              <Link key={c.id} href={`/reports/${c.id}`} className="prop-card group" style={{ padding: 0, overflow: "hidden", display: "block" }}>
                <div className="relative px-4 py-3" style={{ height: 80, background: brand.gradient }}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center text-lg font-bold text-white" style={{ borderRadius: 10, background: "rgba(255,255,255,0.18)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.3)" }}>{brand.emblem}</span>
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-semibold text-white">{ar ? c.name : c.nameEn}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">{c.code} · {c.sector}</div>
                    </div>
                    <FileText className="ms-auto h-4 w-4 text-white/80" />
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
                    <span style={{ color: "var(--ink-muted)" }}>{ar ? "إيراد ١٢ شهر" : "12-mo revenue"}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{formatMoney(rev)}</span>
                  </div>
                  {esgScore !== undefined ? (
                    <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
                      <span style={{ color: "var(--ink-muted)" }}>ESG</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{esgScore.toFixed(1)}/100</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between" style={{ borderRadius: 10, padding: "6px 8px", fontSize: 11, fontWeight: 700, background: "var(--ivory)", color: "var(--gold-soft, #8a6a1f)" }}>
                    <span className="flex items-center gap-1.5" style={{ color: "var(--emerald)" }}><Printer className="h-3 w-3" />{ar ? "افتح التقرير الرسمي" : "Open formal report"}</span>
                    <ArrowRight className="h-3 w-3 rtl:rotate-180" style={{ color: "var(--emerald)" }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </DaylightPanel>
    </DaylightShell>
  );
}
