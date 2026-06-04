import Link from "next/link";
import { Brain } from "lucide-react";
import { DaylightPanel } from "@/components/orrery/daylight";
import { BrainStatusBadge } from "@/components/BrainStatusBadge";
import { formatNumber, localizeUnit } from "@/lib/utils";
import type { DashboardData } from "@/app/(app)/dashboard/data";

export function IntelligenceLayerPanel({
  ar,
  brainIQ,
  forecasts,
}: {
  ar: boolean;
  brainIQ: DashboardData["brainIQ"];
  forecasts: DashboardData["forecasts"];
}) {
  return (
    <DaylightPanel
      title={ar ? "طبقة الذكاء" : "Intelligence layer"}
      aside={
        brainIQ
          ? (ar ? `IQ ${Math.round(brainIQ.score)} · ${brainIQ.trend === "rising" ? "↑" : brainIQ.trend === "falling" ? "↓" : "→"}` : `IQ ${Math.round(brainIQ.score)} · ${brainIQ.trend}`)
          : (ar ? "توقعات سلسلة التوريد" : "Supply chain forecasts")
      }
    >
      {/* Brain IQ strip */}
      {brainIQ ? (
        <Link
          href="/brain/iq"
          className="mb-2 flex items-center justify-between px-3 py-2.5 transition"
          style={{
            background: "var(--cream)",
            border: "1px solid var(--line)",
            borderInlineStart: "3px solid var(--gold)",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} strokeWidth={1.5} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
              {ar ? "ذكاء الدماغ" : "Brain IQ"}
            </span>
            <BrainStatusBadge />
          </div>
          <span
            style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
          >
            {Math.round(brainIQ.score)}
          </span>
        </Link>
      ) : null}
      {forecasts.length === 0 ? (
        <div
          className="py-4 text-center"
          style={{ color: "var(--ink-muted)", fontSize: 12.5, fontStyle: "italic" }}
        >
          {ar ? "لا توقعات نشطة" : "No active forecasts"}
        </div>
      ) : (
        <ul className="space-y-2">
          {forecasts.slice(0, 2).map((f) => (
            <li
              key={f.id}
              className="px-3 py-2.5"
              style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8 }}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="line-clamp-1"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}
                >
                  {ar ? f.productLabel : (f.productLabelEn || f.productLabel)}
                </div>
                <span
                  style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}
                >
                  {formatNumber(f.predictedDemand)} {localizeUnit(f.unit, ar)}
                </span>
              </div>
              <div
                className="mt-1 flex items-center gap-1.5"
                style={{ fontSize: 10.5, color: "var(--ink-muted)" }}
              >
                <span className="truncate">{ar ? f.source.name : (f.source.nameEn || f.source.name)}</span>
                <span style={{ color: "var(--line)" }}>→</span>
                <span className="truncate">{ar ? f.target.name : (f.target.nameEn || f.target.name)}</span>
                <span style={{ color: "var(--line)" }}>·</span>
                <span>{(f.confidence * 100).toFixed(0)}%</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DaylightPanel>
  );
}
