import { AlertTriangle, ShieldCheck } from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { advanceBatchStatus } from "../../actions";
import { formatNumber } from "@/lib/utils/utils";
import type { DairyOpsData } from "../data";
import { Empty } from "./Empty";

export function DairyOps({
  ar,
  canMutate,
  data,
}: {
  ar: boolean;
  canMutate: boolean;
  data: DairyOpsData;
}) {
  const {
    batches,
    now,
    DAY,
    totalLiters,
    gradeA,
    qcRate,
    byStatus,
    expiring,
    throughput,
    tpMax,
    destinations,
    destTotal,
  } = data;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات" : "Operations"}
        title={ar ? "لوحة الإنتاج" : "Production board"}
        subtitle={ar ? "خط الإنتاج لحظياً" : "Live production line"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الدفعات" : "Total batches"} value={formatNumber(batches.length)} />
        <DaylightKpi label={ar ? "إجمالي اللترات" : "Total liters"} value={formatNumber(Math.round(totalLiters))} />
        <DaylightKpi label={ar ? "نسبة اجتياز الجودة" : "QC pass rate"} value={`${qcRate}%`} />
        <DaylightKpi label={ar ? "قرب الانتهاء" : "Near expiry"} value={formatNumber(expiring.length)} />
      </DaylightKpiGrid>

      {/* Production board */}
      <DaylightPanel
        title={ar ? "لوحة الإنتاج" : "Production board"}
        aside={ar ? "خط الإنتاج لحظياً" : "Live production line"}
      >
        <div className="ws-board">
          {byStatus.map((col) => (
            <div key={col.status} className="ws-board-col">
              <header className="ws-board-col-head">
                <span>{ar ? col.label.ar : col.label.en}</span>
                <span className="ws-board-col-count">{col.items.length}</span>
              </header>
              <div className="ws-board-col-body">
                {col.items.slice(0, 12).map((b) => {
                  const dleft = Math.round(
                    (new Date(b.expiryDate).getTime() - now) / DAY,
                  );
                  return (
                    <div key={b.id} className="ws-board-card">
                      <div className="ws-board-card-title">
                        {ar ? (b.productAr ?? b.product) : b.product}
                      </div>
                      <div className="ws-board-card-meta">
                        <span className="ws-mono">{b.batchNumber}</span>
                        <span className="ws-board-card-sep">·</span>
                        <span>{formatNumber(Math.round(b.quantityLiters))}{ar ? " ل" : " L"}</span>
                        <span className="ws-board-card-sep">·</span>
                        <span>{ar ? "درجة" : "Grade"} {b.qualityGrade}</span>
                      </div>
                      {b.status !== "EXPIRED" && b.status !== "RETAIL" ? (
                        <div
                          className="ws-board-card-expiry"
                          data-urgent={dleft <= 3 ? "true" : "false"}
                        >
                          {dleft < 0
                            ? ar ? "منتهٍ" : "expired"
                            : ar
                              ? `ينتهي خلال ${dleft} يوم`
                              : `expires in ${dleft}d`}
                        </div>
                      ) : null}
                      {canMutate &&
                      ["IN_PRODUCTION", "READY", "SHIPPED"].includes(
                        b.status,
                      ) ? (
                        <form action={advanceBatchStatus} className="ws-act-form">
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className="ws-act">
                            {ar ? "تقديم" : "Advance"}
                            <span aria-hidden>{ar ? " ←" : " →"}</span>
                          </button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
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

      {/* Throughput + routing */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DaylightPanel title={ar ? "الإنتاجية" : "Throughput"} aside={ar ? "اللترات شهرياً — ٦ أشهر" : "Liters per month — 6 mo"}>
          <div className="ws-trend">
            {throughput.map((t) => (
              <div key={t.label} className="ws-trend-col">
                <div className="ws-trend-bar-wrap">
                  <span
                    className="ws-trend-bar"
                    style={{ height: `${Math.max(4, (t.liters / tpMax) * 100)}%` }}
                  />
                </div>
                <div className="ws-trend-val ws-mono">
                  {t.liters >= 1000
                    ? `${(t.liters / 1000).toFixed(1)}k`
                    : formatNumber(t.liters)}
                </div>
                <div className="ws-trend-label ws-mono">{t.label}</div>
              </div>
            ))}
          </div>
        </DaylightPanel>

        <DaylightPanel title={ar ? "توزيع الوجهات" : "Destination split"} aside={ar ? "أين تذهب الدفعات" : "Where batches route"}>
          <ul className="ws-dest">
            {destinations.map((d) => {
              const pct = Math.round((d.n / destTotal) * 100);
              return (
                <li key={d.name} className="ws-dest-row">
                  <div className="ws-dest-head">
                    <span className="ws-dest-name">{d.name}</span>
                    <span className="ws-mono ws-dest-pct">{pct}%</span>
                  </div>
                  <div className="ws-dest-bar">
                    <span
                      className="ws-dest-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="ws-dest-n ws-mono">
                    {formatNumber(d.n)} {ar ? "دفعة" : "batches"}
                  </div>
                </li>
              );
            })}
          </ul>
        </DaylightPanel>
      </div>

      {/* Expiry watch + QC */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DaylightPanel title={ar ? "مراقبة الصلاحية" : "Expiry watch"} aside={ar ? "أولوية قصوى" : "Top priority"}>
          {expiring.length === 0 ? (
            <Empty ar={ar} ok />
          ) : (
            <ul className="ws-list">
              {expiring.slice(0, 14).map((b) => {
                const dleft = Math.round(
                  (new Date(b.expiryDate).getTime() - now) / DAY,
                );
                return (
                  <li key={b.id} className="ws-list-row">
                    <span className="ws-list-icon" data-urgent={dleft <= 3 ? "true" : "false"}>
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </span>
                    <div className="ws-list-main">
                      <div className="ws-list-title">
                        {ar ? (b.productAr ?? b.product) : b.product}
                      </div>
                      <div className="ws-list-sub ws-mono">{b.batchNumber}</div>
                    </div>
                    <span className={`tag ${dleft <= 3 ? "gold" : "ok"}`}>
                      {dleft <= 0
                        ? ar ? "اليوم" : "today"
                        : ar
                          ? `${dleft} يوم`
                          : `${dleft}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </DaylightPanel>

        <DaylightPanel title={ar ? "توزيع الدرجات" : "Grade distribution"} aside={ar ? "ضبط الجودة" : "Quality control"}>
          <div className="ws-grade-grid">
            {["A", "B", "C", "D"].map((g) => {
              const n = batches.filter((b) => b.qualityGrade === g).length;
              const pct = batches.length
                ? Math.round((n / batches.length) * 100)
                : 0;
              return (
                <div key={g} className="ws-grade">
                  <div className="ws-grade-head">
                    <span className="ws-grade-letter">{ar ? "درجة " : "Grade "}{g}</span>
                    <span className="ws-grade-pct">{pct}%</span>
                  </div>
                  <div className="ws-grade-bar">
                    <span
                      className="ws-grade-fill"
                      data-grade={g}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="ws-grade-n">{formatNumber(n)} {ar ? "دفعة" : "batches"}</div>
                </div>
              );
            })}
          </div>
          <div className="ws-qc-summary">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.6} />
            <span>
              {ar
                ? `${gradeA} دفعة درجة A — ${qcRate}% ضمن مواصفة JS 1112`
                : `${gradeA} grade-A batches — ${qcRate}% within JS 1112 spec`}
            </span>
          </div>
        </DaylightPanel>
      </div>
    </DaylightShell>
  );
}
