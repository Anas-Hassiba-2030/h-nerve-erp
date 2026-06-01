import Link from "next/link";
import { BrainStatusBadge } from "@/components/BrainStatusBadge";
import { prisma } from "@/lib/db";
import { computeIQ } from "@/lib/brain/meta.reflector";
import { llmConfig } from "@/lib/brain/llm";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber } from "@/lib/utils";
import { CountUp } from "./CountUp";
import "../daylight.css";
import "./brain-section.css";

export const dynamic = "force-dynamic";

// Map a council voice position → the reference advisor card modifier + label.
// position is "support" | "oppose" | "qualify" | "moderate" (CouncilVoice).
function advClass(position: string): "s" | "o" | "q" {
  if (position === "oppose") return "o";
  if (position === "support") return "s";
  return "q"; // qualify + moderate share the gold "qualified" treatment
}
function advPos(position: string, ar: boolean): string {
  switch (position) {
    case "support": return ar ? "يؤيّد" : "Supports";
    case "oppose": return ar ? "يعارض" : "Opposes";
    case "moderate": return ar ? "يُيسّر" : "Moderates";
    default: return ar ? "بتحفّظ" : "Qualifies";
  }
}

export default async function BrainPage() {
  const ar = getLocale() === "ar";
  const cfg = llmConfig();

  const [
    iq,
    totalInsights,
    activeForecasts,
    totalSessions,
    avgConfRaw,
    advisorCount,
    latestSession,
    topEdges,
  ] = await Promise.all([
    computeIQ("default").catch(() => null),
    prisma.aIInsight.count({ where: { deletedAt: null } }),
    prisma.supplyForecast.count().catch(() => 0),
    prisma.councilSession.count({ where: { status: "DONE" } }),
    prisma.councilSession.aggregate({ _avg: { confidence: true }, where: { confidence: { not: null } } }),
    // Distinct specialist voices the brain can convene → "council advisors".
    prisma.councilVoice.findMany({ distinct: ["agentId"], select: { agentId: true } }).then((r) => r.length).catch(() => 0),
    // The brain's current deliberation → fills the council panel.
    prisma.councilSession
      .findFirst({ orderBy: { ranAt: "desc" }, include: { voices: { orderBy: { orderIndex: "asc" }, take: 4 } } })
      .catch(() => null),
    // Strongest hand-authored / learned causal edges → "top causal drivers".
    prisma.brainEdge
      .findMany({
        where: { kind: { in: ["causal", "learned", "manual"] } },
        include: { from: true, to: true },
        take: 24,
      })
      .catch(() => [] as any[]),
  ]);

  const iqScore = iq ? Math.round(iq.score) : 50;
  const avgConfidence = Math.round((avgConfRaw._avg.confidence ?? 0) * 100);

  // Rank drivers by impact magnitude (|weight| × confidence), keep the top 4.
  const drivers = [...topEdges]
    .map((e: any) => ({
      title: `${e.from?.label ?? "—"} ← ${e.to?.label ?? "—"}`,
      sub: ar ? `ثقة ${formatNumber(Math.round((e.confidence ?? 0) * 100))}٪` : `${Math.round((e.confidence ?? 0) * 100)}% confidence`,
      impact: e.weight ?? 0,
      mag: Math.abs(e.weight ?? 0) * (e.confidence ?? 0),
    }))
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 4);

  const voices = latestSession?.voices ?? [];

  return (
    <div className="dl-page" data-section="brain" dir={ar ? "rtl" : "ltr"}>
      {/* ── Section head ─────────────────────────────────────────────── */}
      <div className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "الذكاء التشغيلي · العقل" : "Operational intelligence · The Brain"}</div>
          <h1 className="sec-title">{ar ? "العقل المفكّر" : "The thinking brain"}</h1>
          <p className="sec-sub">
            {ar
              ? "الدماغ السببي الذي يقرأ بيانات المجموعة، يحاور المستشارين، ويروي القرار. يقترح ولا يغيّر الأرقام."
              : "The causal brain that reads the group's data, debates with advisors, and narrates the decision. It proposes — it never changes the numbers."}
          </p>
        </div>
        <div className="sec-head-aside"><BrainStatusBadge /></div>
      </div>

      {/* ── Hero · Brain IQ orb ──────────────────────────────────────── */}
      <div className="brain-hero reveal">
        <div className="brain-orb">
          <span aria-hidden className="brain-orb-ring" />
          <div style={{ textAlign: "center" }}>
            <div className="brain-iq"><CountUp value={iqScore} locale={ar ? "ar" : "en"} /></div>
            <div className="brain-iq-cap">{ar ? "ذكاء الدماغ" : "Brain IQ"}</div>
          </div>
        </div>
        <div className="brain-hero-txt">
          <h2>
            {ar
              ? `الدماغ يحاور ${formatNumber(advisorCount || voices.length)} مستشارين اليوم`
              : `The brain is convening ${formatNumber(advisorCount || voices.length)} advisors today`}
          </h2>
          <p>
            {latestSession
              ? (ar
                  ? `القرار النشط: ${latestSession.topic}`
                  : `Active deliberation: ${latestSession.topic}`)
              : (ar
                  ? "قرأ العقل بيانات المجموعة، حاور المستشارين، وأصدر إشاراته. لا نقاش نشط الآن."
                  : "The brain read the group's data, debated with its advisors, and issued its signals. No active deliberation right now.")}
          </p>
          <div className="brain-stats">
            <div className="brain-stat">
              <div className="v"><CountUp value={totalInsights} locale={ar ? "ar" : "en"} /></div>
              <div className="l">{ar ? "إشارات" : "Insights"}</div>
            </div>
            <div className="brain-stat">
              <div className="v"><CountUp value={activeForecasts} locale={ar ? "ar" : "en"} /></div>
              <div className="l">{ar ? "تنبؤات نشطة" : "Active forecasts"}</div>
            </div>
            <div className="brain-stat">
              <div className="v"><CountUp value={avgConfidence} locale={ar ? "ar" : "en"} suffix={ar ? "٪" : "%"} /></div>
              <div className="l">{ar ? "متوسط الثقة" : "Avg confidence"}</div>
            </div>
            <div className="brain-stat">
              <div className="v"><CountUp value={advisorCount} locale={ar ? "ar" : "en"} /></div>
              <div className="l">{ar ? "مستشارو المجلس" : "Council advisors"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Council · current debate ─────────────────────────────────── */}
      <div className="n-panel reveal">
        <div className="n-panel-title">{ar ? "المجلس · النقاش الحالي" : "Council · current debate"}</div>
        <div className="n-panel-aside">
          {latestSession?.topic ?? (ar ? "لم يُعقد نقاش بعد. اطرح القرار على المجلس." : "No debate convened yet. Pose a decision to the council.")}
        </div>
        {voices.length > 0 ? (
          <div className="council-row reveal-stagger">
            {voices.map((v) => (
              <div key={v.id} className={`adv ${advClass(v.position)}`}>
                <div className="adv-top">
                  <span className="adv-name">{ar ? v.speakerLabelAr : v.speakerLabelEn}</span>
                  <span className="adv-pos">{advPos(v.position, ar)}</span>
                </div>
                <div className="adv-thesis">{v.thesis}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="adv-thesis">
            {ar ? "لا أصوات بعد — ادخل المجلس لتبدأ مداولة جديدة." : "No voices yet — enter the council to start a new deliberation."}
          </div>
        )}
        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="dl-btn dl-btn-primary" href="/brain/council">{ar ? "ادخل مجلس الخبراء" : "Enter the council"}</Link>
          <Link className="dl-btn dl-btn-secondary" href="/brain/scenarios">{ar ? "محاكاة قرار" : "Run a simulation"}</Link>
        </div>
      </div>

      {/* ── Top causal drivers ───────────────────────────────────────── */}
      <div className="n-panel reveal">
        <div className="n-panel-title">{ar ? "أبرز المحرّكات السببية" : "Top causal drivers"}</div>
        <div className="n-panel-aside">{ar ? "مرتبة حسب الأثر على هامش المجموعة" : "Ranked by impact on the group's margin"}</div>
        {drivers.length > 0 ? (
          <div className="reveal-stagger">
            {drivers.map((d, i) => (
              <div className="driver" key={i}>
                <span className="driver-rank">{ar ? formatNumber(i + 1) : i + 1}</span>
                <div className="driver-body">
                  <div className="driver-title">{d.title}</div>
                  <div className="driver-sub">{d.sub}</div>
                </div>
                <span className={`driver-impact ${d.impact >= 0 ? "up" : "down"}`}>
                  {d.impact >= 0 ? "+" : (ar ? "−" : "−")}
                  {ar ? formatNumber(Math.abs(Math.round(d.impact * 100)) / 100) : (Math.abs(Math.round(d.impact * 100)) / 100)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="adv-thesis">
            {ar ? "لم تُرسم روابط سببية بعد. ابنِ الرسم السببي ليكتشف الدماغ المحرّكات." : "No causal edges drawn yet. Build the causal graph so the brain can surface drivers."}
          </div>
        )}
        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="dl-btn dl-btn-secondary" href="/brain/graph">{ar ? "افتح الرسم السببي" : "Open the causal graph"}</Link>
          <Link className="dl-btn dl-btn-secondary" href="/brain/iq">{ar ? "تفاصيل الذكاء" : "IQ details"}</Link>
          <Link className="dl-btn dl-btn-secondary" href="/brain/memory">{ar ? "بحيرة الذاكرة" : "Memory lake"}</Link>
          <Link className="dl-btn dl-btn-secondary" href="/brain/self-tuning">{ar ? "الضبط الذاتي" : "Self-tuning"}</Link>
        </div>
      </div>
    </div>
  );
}
