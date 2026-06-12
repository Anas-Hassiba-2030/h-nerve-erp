import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { formatNumber } from "@/lib/utils/utils";
import type { AgricultureOpsData } from "../data";

export function AgricultureOps({ ar, data }: { ar: boolean; data: AgricultureOpsData }) {
  const {
    farms,
    now,
    DAY,
    growing,
    harvested,
    yieldReal,
    nearHarvest,
    byStatus,
  } = data;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات — الزراعة" : "Operations — Agriculture"}
        title={ar ? "لوحة الدورة" : "Crop-cycle board"}
        subtitle={ar ? "دورة المحاصيل لحظياً" : "Live crop cycle"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "المزارع" : "Farms"} value={formatNumber(farms.length)} />
        <DaylightKpi label={ar ? "محاصيل تنمو" : "Growing crops"} value={formatNumber(growing.length)} />
        <DaylightKpi label={ar ? "تحقّق الإنتاجية" : "Yield realization"} value={`${yieldReal}%`} />
        <DaylightKpi label={ar ? "قرب الحصاد" : "Near harvest"} value={formatNumber(nearHarvest.length)} />
      </DaylightKpiGrid>

      {/* Crop-cycle board */}
      <DaylightPanel title={ar ? "لوحة الدورة" : "Crop-cycle board"} aside={ar ? "دورة المحاصيل لحظياً" : "Live crop cycle"}>
        <div className="ws-board">
          {byStatus.map((col) => (
            <div key={col.status} className="ws-board-col">
              <header className="ws-board-col-head">
                <span>{ar ? col.label.ar : col.label.en}</span>
                <span className="ws-board-col-count">{col.items.length}</span>
              </header>
              <div className="ws-board-col-body">
                {col.items.slice(0, 12).map((c) => {
                  const f = farms.find((x) => x.id === c.farmId);
                  const dh = Math.round(
                    (new Date(c.expectedHarvest).getTime() - now) / DAY,
                  );
                  return (
                    <div key={c.id} className="ws-board-card">
                      <div className="ws-board-card-title">
                        {c.name}
                        {c.variety ? ` · ${c.variety}` : ""}
                      </div>
                      <div className="ws-board-card-meta">
                        <span>{ar ? (f?.name ?? "") : (f?.nameEn ?? f?.name ?? "")}</span>
                        <span className="ws-board-card-sep">·</span>
                        <span>
                          {formatNumber(Math.round(c.expectedYieldKg))}
                          {ar ? " كغ متوقّع" : " kg exp"}
                        </span>
                      </div>
                      {c.status === "GROWING" ? (
                        <div
                          className="ws-board-card-expiry"
                          data-urgent={dh >= 0 && dh <= 7 ? "true" : "false"}
                        >
                          {dh < 0
                            ? ar ? "تجاوز الموعد" : "overdue"
                            : ar
                              ? `الحصاد خلال ${dh} يوم`
                              : `harvest in ${dh}d`}
                        </div>
                      ) : c.status === "HARVESTED" && c.actualYieldKg != null ? (
                        <div className="ws-board-card-expiry">
                          {formatNumber(Math.round(c.actualYieldKg))}
                          {ar ? " كغ فعلي" : " kg actual"}
                        </div>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DaylightPanel title={ar ? "مراقبة الحصاد" : "Harvest watch"} aside={ar ? "أقرب ١٤ يوماً" : "Next 14 days"}>
          {nearHarvest.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
              {ar ? "لا حصاد وشيك. كل المحاصيل ضمن دورتها." : "No imminent harvest. All crops mid-cycle."}
            </p>
          ) : (
            <ul className="ws-list">
              {nearHarvest.slice(0, 12).map((c) => {
                const f = farms.find((x) => x.id === c.farmId);
                const dh = Math.round(
                  (new Date(c.expectedHarvest).getTime() - now) / DAY,
                );
                return (
                  <li key={c.id} className="ws-list-row">
                    <div className="ws-list-main">
                      <div className="ws-list-title">
                        {c.name}{c.variety ? ` · ${c.variety}` : ""}
                      </div>
                      <div className="ws-list-sub ws-mono">
                        {ar ? (f?.name ?? "") : (f?.nameEn ?? f?.name ?? "")} ·{" "}
                        {formatNumber(Math.round(c.expectedYieldKg))}
                        {ar ? " كغ" : " kg"}
                      </div>
                    </div>
                    <span className={`tag ${dh <= 5 ? "gold" : "ok"}`}>
                      {dh === 0 ? (ar ? "اليوم" : "today") : ar ? `${dh} يوم` : `${dh}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </DaylightPanel>

        <DaylightPanel title={ar ? "تحقّق الإنتاجية" : "Yield realization"} aside={ar ? "فعلي مقابل متوقّع" : "Actual vs forecast"}>
          {harvested.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-muted)", padding: "12px 0" }}>
              {ar ? "لا محاصيل محصودة بعد." : "No harvested crops yet."}
            </p>
          ) : (
            <ul className="ws-dest">
              {harvested.slice(0, 8).map((c) => {
                const exp = c.expectedYieldKg || 1;
                const pct = Math.round(((c.actualYieldKg ?? 0) / exp) * 100);
                return (
                  <li key={c.id} className="ws-dest-row">
                    <div className="ws-dest-head">
                      <span className="ws-dest-name">
                        {c.name}{c.variety ? ` · ${c.variety}` : ""}
                      </span>
                      <span className="ws-mono ws-dest-pct">{pct}%</span>
                    </div>
                    <div className="ws-dest-bar">
                      <span
                        className="ws-dest-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background:
                            pct >= 95
                              ? "var(--emerald)"
                              : pct >= 80
                                ? "var(--gold)"
                                : "var(--brick)",
                        }}
                      />
                    </div>
                    <div className="ws-dest-n ws-mono">
                      {formatNumber(Math.round(c.actualYieldKg ?? 0))} /{" "}
                      {formatNumber(Math.round(c.expectedYieldKg))}{" "}
                      {ar ? "كغ" : "kg"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DaylightPanel>
      </div>
    </DaylightShell>
  );
}
