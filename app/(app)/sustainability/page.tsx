import { Leaf } from "lucide-react";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { EmptyState } from "@/components/EmptyState";
import { prisma } from "@/lib/db/db";
import { formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function SustainabilityPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  const scores = await prisma.sustainabilityScore.findMany({
    orderBy: [{ year: "desc" }, { period: "desc" }],
    include: { company: true },
    take: 40,
  });

  const latest = scores.slice(0, 5);
  const avg = (sel: (s: typeof scores[number]) => number) =>
    latest.length ? Math.round(latest.reduce((a, s) => a + sel(s), 0) / latest.length) : 0;
  const avgScore = avg((s) => s.overall);
  const avgCarbon = avg((s) => s.carbonTons);
  const avgWater = avg((s) => s.waterCubicM);
  const avgWaste = avg((s) => s.renewablePct);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المالية · الاستدامة" : "Finance · Sustainability"}
        title={ar ? "الاستدامة وESG" : "Sustainability & ESG"}
        subtitle={ar ? "مؤشرات الأثر البيئي والحوكمة عبر شركات المجموعة." : "Environmental impact and governance metrics across the group."}
        status={`${ar ? "متوسط" : "Avg"} ESG ${avgScore}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "متوسط ESG" : "Avg ESG"} value={formatNumber(avgScore)} hint={ar ? "من ١٠٠" : "out of 100"} delta={{ dir: avgScore >= 60 ? "up" : "down", text: `${avgScore}` }} />
        <DaylightKpi label={ar ? "الكربون" : "Carbon"} value={formatNumber(avgCarbon)} hint={ar ? "انبعاثات" : "emissions"} />
        <DaylightKpi label={ar ? "المياه" : "Water"} value={formatNumber(avgWater)} hint={ar ? "كفاءة" : "efficiency"} />
        <DaylightKpi label={ar ? "النفايات" : "Waste"} value={formatNumber(avgWaste)} hint={ar ? "إعادة تدوير" : "recycling"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "نقاط الاستدامة حسب الشركة" : "ESG scores by company"} aside={ar ? "أحدث التقييمات" : "Latest assessments"}>
        {scores.length === 0 ? (
          <EmptyState icon={Leaf} title={ar ? "لا توجد بيانات استدامة بعد." : "No sustainability data yet."} />
        ) : (
          <div className="space-y-3">
            {scores.map((score) => (
              <div key={score.id} className="prop-card">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{ar ? score.company.name : score.company.nameEn}</h3>
                    <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{score.period} {score.year}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <ScoreChip label={ar ? "كربون" : "Carbon"} value={score.carbonTons} />
                    <ScoreChip label={ar ? "مياه" : "Water"} value={score.waterCubicM} />
                    <ScoreChip label={ar ? "نفايات" : "Waste"} value={score.renewablePct} />
                    <div className="text-center">
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--emerald)" }}>{score.overall}</div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted)" }}>ESG</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--ink-muted)" }}>{label}</div>
    </div>
  );
}
