import {
  Hotel,
  Milk,
  Sprout,
  GraduationCap,
  Users2,
  Wallet,
  Brain,
  FlaskConical,
  Leaf,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { formatNumber, formatMoney } from "@/lib/utils";
import type { CompanyDetail } from "../data";

export function CompanyKpis({
  company,
  incomeTotal,
  expenseTotal,
  netTotal,
  totalRooms,
  recentLiters,
  totalDunum,
  latestEsg,
  en,
}: {
  company: CompanyDetail["company"];
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  totalRooms: number;
  recentLiters: number;
  totalDunum: number;
  latestEsg: CompanyDetail["latestEsg"];
  en: boolean;
}) {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* KPI strip                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={en ? "Revenue" : "إيرادات"}
          value={formatMoney(incomeTotal)}
          icon={TrendingUp}
          tone="emerald"
          hint={`${formatNumber(company._count.transactions)} ${en ? "transactions" : "حركة مالية"}`}
        />
        <KpiCard
          label={en ? "Expenses" : "مصروفات"}
          value={formatMoney(expenseTotal)}
          icon={TrendingDown}
          tone="red"
        />
        <KpiCard
          label={en ? "Net" : "صافي"}
          value={formatMoney(netTotal)}
          icon={Wallet}
          tone={netTotal >= 0 ? "emerald" : "red"}
          delta={
            incomeTotal > 0
              ? {
                  up: netTotal >= 0,
                  value: `${Math.round((Math.abs(netTotal) / incomeTotal) * 100)}${en ? "%" : "٪"}`,
                }
              : undefined
          }
        />
        <KpiCard
          label={en ? "Team" : "فريق العمل"}
          value={`${formatNumber(company.employees)}`}
          icon={Users2}
          tone="indigo"
          hint={`${company._count.users} ${en ? "active accounts" : "حساب نشط"}`}
        />
      </section>

      {/* Operational rollup based on sector */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {company._count.hotels > 0 ? (
          <KpiCard
            label={en ? "Hotels" : "فنادق"}
            value={formatNumber(company._count.hotels)}
            icon={Hotel}
            tone="amber"
            hint={`${formatNumber(totalRooms)} ${en ? "total rooms" : "غرفة إجمالية"}`}
          />
        ) : null}
        {company._count.dairyBatches > 0 ? (
          <KpiCard
            label={en ? "Recent dairy batches" : "دفعات ألبان أخيرة"}
            value={formatNumber(company._count.dairyBatches)}
            icon={Milk}
            tone="sky"
            hint={`${formatNumber(recentLiters)} ${en ? "litres (recent)" : "لتر آخر دفعات"}`}
          />
        ) : null}
        {company._count.farms > 0 ? (
          <KpiCard
            label={en ? "Farms" : "مزارع"}
            value={formatNumber(company._count.farms)}
            icon={Sprout}
            tone="emerald"
            hint={`${formatNumber(totalDunum)} ${en ? "dunum" : "دونم"}`}
          />
        ) : null}
        {company._count.programs > 0 ? (
          <KpiCard
            label={en ? "Programs & incubators" : "برامج وحاضنات"}
            value={formatNumber(company._count.programs)}
            icon={GraduationCap}
            tone="indigo"
          />
        ) : null}
        {(company._count.forecastsOut > 0 || company._count.forecastsIn > 0) ? (
          <KpiCard
            label={en ? "Supply-chain signals" : "إشارات سلسلة التوريد"}
            value={formatNumber(company._count.forecastsOut + company._count.forecastsIn)}
            icon={Brain}
            tone="violet"
            hint={en ? `out ${company._count.forecastsOut} • in ${company._count.forecastsIn}` : `صادرة ${company._count.forecastsOut} • واردة ${company._count.forecastsIn}`}
          />
        ) : null}
        {company._count.futureProjects > 0 ? (
          <KpiCard
            label={en ? "Future projects" : "مشاريع مستقبلية"}
            value={formatNumber(company._count.futureProjects)}
            icon={FlaskConical}
            tone="blue"
          />
        ) : null}
        {latestEsg ? (
          <KpiCard
            label={en ? "ESG score" : "مؤشر ESG"}
            value={`${Math.round(latestEsg.overall)}/100`}
            icon={Leaf}
            tone="emerald"
            hint={`${latestEsg.period} ${latestEsg.year}`}
          />
        ) : null}
      </section>
    </>
  );
}
