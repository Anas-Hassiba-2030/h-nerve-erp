import Link from "next/link";
import { Building2, Plus, Hotel, Milk, Sprout, GraduationCap, ArrowUpRight } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber, loc, SECTORS_AR, SECTORS_EN } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { hasRole } from "@/lib/authz";
import { getCompanyBrand } from "@/lib/companyBrand";
import "../daylight.css";

export const dynamic = "force-dynamic";

const SECTOR_ICON: Record<string, typeof Hotel> = { HOSPITALITY: Hotel, DAIRY: Milk, AGRICULTURE: Sprout, EDUCATION: GraduationCap };

export default async function CompaniesPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";
  const session = await getCurrentUser();
  const canManage = hasRole(session, "MANAGER");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { hotels: true, farms: true, dairyBatches: true, programs: true, transactions: true } } },
  });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const txAgg = await prisma.transaction.groupBy({ by: ["companyId"], where: { kind: "REVENUE", occurredAt: { gte: since } }, _sum: { amount: true } });
  const revByCompany = new Map(txAgg.map((t) => [t.companyId, t._sum.amount ?? 0]));
  const totalRevenue = Array.from(revByCompany.values()).reduce((a, b) => a + b, 0);
  const totalEmployees = companies.reduce((a, c) => a + c.employees, 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "محفظة المجموعة" : "Group portfolio"}
        title={ar ? "شركات المجموعة" : "Group Companies"}
        subtitle={ar ? "نظرة شاملة على شركات مجموعة الحوراني وأداء كل قطاع." : "Overview of Hourani Group companies and each sector's performance."}
        status={ar ? "خمسة قطاعات" : "Five sectors"}
        actions={
          <>
            {canManage ? <Link href="/companies/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "شركة جديدة" : "New company"}</Link> : null}
            <ExportMenu type="companies" locale={lc} />
          </>
        }
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "الشركات" : "Companies"} value={formatNumber(companies.length)} hint={ar ? "خمسة قطاعات" : "five sectors"} />
        <DaylightKpi label={ar ? "إيراد ٣٠ يوم" : "Revenue 30d"} value={formatMoney(totalRevenue)} hint={ar ? "كل الشركات" : "all companies"} delta={{ dir: "up", text: ar ? "٣٠ي" : "30d" }} />
        <DaylightKpi label={ar ? "الموظفون" : "Employees"} value={formatNumber(totalEmployees)} hint={ar ? "عبر المجموعة" : "group-wide"} />
        <DaylightKpi label={ar ? "القطاعات" : "Sectors"} value={formatNumber(5)} hint={ar ? "متنوعة" : "diversified"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الشركات" : "Companies"} aside={ar ? "اضغط لفتح ملف الشركة" : "Click to open a company profile"}>
        <div className="prop-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {companies.map((c) => {
            const Icon = SECTOR_ICON[c.sector] ?? Building2;
            const rev = revByCompany.get(c.id) ?? 0;
            const brand = getCompanyBrand(c.code);
            return (
              <Link key={c.id} href={`/companies/${c.id}`} className="prop-card" style={{ display: "block" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center text-white" style={{ background: brand.gradient, borderRadius: 12 }}><Icon className="h-6 w-6" /></div>
                    <div>
                      <h3 style={{ fontWeight: 700, color: "var(--ink)" }}>{ar ? c.name : c.nameEn}</h3>
                      <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{ar ? c.nameEn : c.name}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="tag gold">{loc(SECTORS_AR, SECTORS_EN, lc, c.sector)}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <CStat label={ar ? "إيراد" : "Revenue"} value={formatMoney(rev)} />
                  <CStat label={ar ? "موظفون" : "Staff"} value={formatNumber(c.employees)} />
                  <CStat label={ar ? "وحدات" : "Units"} value={formatNumber(c._count.hotels + c._count.farms + c._count.dairyBatches + c._count.programs)} />
                </div>
              </Link>
            );
          })}
        </div>
      </DaylightPanel>
    </DaylightShell>
  );
}

function CStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-muted)" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
