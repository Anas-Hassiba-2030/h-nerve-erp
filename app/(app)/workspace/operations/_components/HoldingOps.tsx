import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { enterWorkspace } from "@/app/actions/workspace";
import { formatNumber, formatMoney } from "@/lib/utils";
import type { HoldingOpsData } from "../data";

export function HoldingOps({ ar, data }: { ar: boolean; data: HoldingOpsData }) {
  const {
    companies,
    rows,
    groupRev,
    groupNet,
    groupStaff,
    revMax,
    SECTOR_LABEL,
  } = data;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العمليات — القابضة" : "Operations — Holding"}
        title={ar ? "محفظة المجموعة" : "Portfolio roll-up"}
        subtitle={ar ? "مساهمة كل وحدة بالإيراد — ٣٠ يوماً" : "Revenue contribution per unit — 30d"}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "الوحدات" : "Units"} value={formatNumber(companies.length)} />
        <DaylightKpi label={ar ? "إيراد المجموعة ٣٠ي" : "Group rev 30d"} value={formatMoney(groupRev)} />
        <DaylightKpi label={ar ? "صافي المجموعة" : "Group net"} value={formatMoney(groupNet)} />
        <DaylightKpi label={ar ? "إجمالي الموظفين" : "Total staff"} value={formatNumber(groupStaff)} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "محفظة المجموعة" : "Portfolio roll-up"} aside={ar ? "مساهمة كل وحدة بالإيراد — ٣٠ يوماً" : "Revenue contribution per unit — 30d"}>
        <ul className="ws-dest">
          {rows.map((x) => {
            const pct = Math.round((x.rev / revMax) * 100);
            const sec = SECTOR_LABEL[x.c.sector] ?? { ar: x.c.sector, en: x.c.sector };
            return (
              <li key={x.c.id} className="ws-dest-row">
                <form action={enterWorkspace} className="ws-dest-jump-form">
                  <input type="hidden" name="companyId" value={x.c.id} />
                  <button
                    type="submit"
                    className="ws-dest-jump"
                    aria-label={
                      ar
                        ? `ادخل مساحة عمل ${x.c.name}`
                        : `Enter ${x.c.nameEn ?? x.c.name} workspace`
                    }
                  >
                    <div className="ws-dest-head">
                      <span className="ws-dest-name">
                        {ar ? x.c.name : x.c.nameEn ?? x.c.name}
                        <span className="ws-mono" style={{ color: "var(--ink-muted)", fontWeight: 400 }}>
                          {"  "}· {ar ? sec.ar : sec.en} · {formatNumber(x.headcount)} {ar ? "فرد" : "ppl"}
                        </span>
                      </span>
                      <span className="ws-dest-jump-cta ws-mono" aria-hidden>
                        {ar ? "ادخل ←" : "Enter →"}
                      </span>
                      <span className="ws-mono ws-dest-pct">{formatMoney(x.rev)}</span>
                    </div>
                    <div className="ws-dest-bar">
                      <span
                        className="ws-dest-fill"
                        style={{
                          width: `${pct}%`,
                          background:
                            x.margin >= 25
                              ? "var(--emerald)"
                              : x.margin >= 0
                                ? "var(--gold)"
                                : "var(--brick)",
                        }}
                      />
                    </div>
                    <div className="ws-dest-n ws-mono">
                      {ar ? "صافي" : "net"} {formatMoney(x.net)} · {ar ? "هامش" : "margin"} {x.margin}%
                    </div>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </DaylightPanel>
    </DaylightShell>
  );
}
