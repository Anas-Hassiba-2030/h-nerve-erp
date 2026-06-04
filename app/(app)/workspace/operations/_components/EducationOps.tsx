import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { formatNumber, formatMoney } from "@/lib/utils";
import type { EducationOpsData } from "../data";

export function EducationOps({ ar, data }: { ar: boolean; data: EducationOpsData }) {
  const {
    programs,
    totalFunding,
    cohorts,
    byStage,
    fundByCohort,
    fundMax,
  } = data;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات — التعليم" : "Operations — Education"}
        title={ar ? "لوحة المراحل" : "Stage board"}
        subtitle={ar ? "مسار الحاضنة" : "Incubator pipeline"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "البرامج" : "Programs"} value={formatNumber(programs.length)} />
        <DaylightKpi label={ar ? "الكوهورتات" : "Cohorts"} value={formatNumber(cohorts.length)} />
        <DaylightKpi label={ar ? "إجمالي التمويل" : "Total funding"} value={formatMoney(totalFunding)} />
        <DaylightKpi label={ar ? "نشطة" : "Active"} value={formatNumber(programs.filter((p) => p.stage === "ACTIVE").length)} />
      </DaylightKpiGrid>

      {/* Incubator pipeline board */}
      <DaylightPanel title={ar ? "لوحة المراحل" : "Stage board"} aside={ar ? "مسار الحاضنة" : "Incubator pipeline"}>
        <div className="ws-board">
          {byStage.map((col) => (
            <div key={col.stage} className="ws-board-col">
              <header className="ws-board-col-head">
                <span>{ar ? col.label.ar : col.label.en}</span>
                <span className="ws-board-col-count">{col.items.length}</span>
              </header>
              <div className="ws-board-col-body">
                {col.items.slice(0, 12).map((p) => (
                  <div key={p.id} className="ws-board-card">
                    <div className="ws-board-card-title">
                      {ar ? p.name : p.nameEn ?? p.name}
                    </div>
                    <div className="ws-board-card-meta">
                      <span>{p.founder}</span>
                      <span className="ws-board-card-sep">·</span>
                      <span className="ws-mono">{p.cohort}</span>
                    </div>
                    {p.fundingJod > 0 ? (
                      <div className="ws-board-card-expiry">
                        {formatMoney(p.fundingJod)}
                      </div>
                    ) : null}
                  </div>
                ))}
                {col.items.length > 12 ? (
                  <div className="ws-board-more">
                    +{col.items.length - 12} {ar ? "أخرى" : "more"}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </DaylightPanel>

      <DaylightPanel title={ar ? "توزيع التمويل" : "Funding distribution"} aside={ar ? "التمويل لكل كوهورت" : "Funding per cohort"}>
        <ul className="ws-dest">
          {fundByCohort.map((f) => {
            const pct = Math.round((f.total / fundMax) * 100);
            return (
              <li key={f.cohort} className="ws-dest-row">
                <div className="ws-dest-head">
                  <span className="ws-dest-name">
                    {ar ? "كوهورت " : "Cohort "}{f.cohort}
                  </span>
                  <span className="ws-mono ws-dest-pct">
                    {formatMoney(f.total)}
                  </span>
                </div>
                <div className="ws-dest-bar">
                  <span className="ws-dest-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="ws-dest-n ws-mono">
                  {formatNumber(f.n)} {ar ? "برنامج" : "programs"}
                </div>
              </li>
            );
          })}
        </ul>
      </DaylightPanel>
    </DaylightShell>
  );
}
