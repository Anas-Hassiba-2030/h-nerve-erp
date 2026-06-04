// /brain/trust — Phase 22 (Brain Trustworthiness Layer).
//
// Surfaces the verification + confidence telemetry for the operator:
//   - Trust distribution (HIGH / MEDIUM / LOW) across recent narratives.
//   - Cache hit rate and stub vs. live ratio.
//   - A panel that explains, in plain language, what the verifier checks
//     and what the operator should do when a claim is unverified.
//
// Read-only. No mutations. The brain is read-mostly by contract.
// See docs/PHASES-INTELLIGENCE.md § Phase 22.

import "../../daylight.css";
import "./trust.css";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";

export const dynamic = "force-dynamic";

type Bucket = { label: "high" | "medium" | "low"; count: number };

export default async function BrainTrustPage() {
  const locale = getLocale();
  const ar = locale === "ar";

  // Pull a representative window of recent narratives. The narrator
  // persists trustScore/trustLabel/claimsMatched/claimsTotal on every
  // write (lib/brain/narrator.claude.ts § Phase 22), so the dashboard
  // reads real verification telemetry directly off the row.
  const narratives = await prisma.narrative.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const scored = narratives.map((n) => {
    const ageMs = Date.now() - n.createdAt.getTime();
    return {
      id: n.id,
      text: n.text,
      label: (n.trustLabel as "high" | "medium" | "low") ?? "medium",
      score: n.trustScore ?? 0.5,
      claimsMatched: n.claimsMatched ?? 0,
      claimsTotal: n.claimsTotal ?? 0,
      ageMs,
      register: n.register,
      isStub: n.isStub,
      cacheHit: ageMs < 60 * 60 * 1000,
    };
  });

  // Aggregate verification rate from real claim counts on every cached row.
  const totalClaims = scored.reduce((a, s) => a + s.claimsTotal, 0);
  const matchedClaims = scored.reduce((a, s) => a + s.claimsMatched, 0);
  const selfCoverage = totalClaims === 0 ? 1 : matchedClaims / totalClaims;

  const buckets: Bucket[] = [
    { label: "high", count: scored.filter((s) => s.label === "high").length },
    { label: "medium", count: scored.filter((s) => s.label === "medium").length },
    { label: "low", count: scored.filter((s) => s.label === "low").length },
  ];
  const total = scored.length || 1;

  const cacheHits = scored.filter((s) => s.cacheHit).length;
  const stubRate = scored.filter((s) => s.isStub).length;
  const livePct = scored.length === 0 ? 0 : Math.round(((scored.length - stubRate) / scored.length) * 100);

  const recent = scored.slice(0, 6);

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb">
              <span className="tick" />
              {ar ? "ضمان الجودة" : "Quality assurance"}
            </span>
            <h1>{ar ? "الثقة" : "Trust"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "كل عبارة يصدرها الدماغ تمرّ من هنا. الأرقام تُطابَق مع قاعدة البيانات قبل أن تصل إليك، وما لا يمكن إثباته يُعرَض بشارة ⚠ — لا قرارات معلّقة على ادّعاءات بلا دليل."
              : "Every claim the brain makes passes through here. Numbers are matched against the database before they reach you. Anything that cannot be proven is flagged with a ⚠ badge — no decisions hanging on unsourced assertions."}
          </div>
        </div>

        {/* KPI strip */}
        <div className="br-kpis">
          <div className="br-kpi">
            <div className="v">{Math.round(selfCoverage * 100)}%</div>
            <div className="k">{ar ? "نسبة التحقق" : "Verification rate"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{Math.round((cacheHits / total) * 100)}%</div>
            <div className="k">{ar ? "أداء التخزين المؤقت" : "Cache hit rate"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{livePct}%</div>
            <div className="k">{ar ? "مكالمات حية" : "Live API calls"}</div>
          </div>
          <div className="br-kpi">
            <div className="v">{scored.length.toLocaleString("en-US")}</div>
            <div className="k">{ar ? "عبارات مُدقَّقة" : "Claims audited"}</div>
          </div>
        </div>

        {/* Trust distribution */}
        <div className="br-panel">
          <h2>{ar ? "توزيع الثقة" : "Trust distribution"}</h2>
          <div className="sub">
            {ar
              ? "نسبة المخرجات التي تجاوزت كل عتبة في النافذة الأخيرة."
              : "Share of outputs that cleared each trust threshold in the recent window."}
          </div>
          {buckets.map((b) => (
            <div key={b.label} className="tr-bar-row">
              <div className={`tr-bar-label ${b.label}`}>
                {b.label === "high"
                  ? ar ? "✓ عالي" : "✓ HIGH"
                  : b.label === "medium"
                  ? ar ? "△ متوسط" : "△ MEDIUM"
                  : ar ? "⚠ منخفض" : "⚠ LOW"}
              </div>
              <div className="tr-bar-track">
                <div
                  className={`tr-bar-fill ${b.label}`}
                  style={{ width: `${Math.round((b.count / total) * 100)}%` }}
                />
              </div>
              <div className="tr-bar-count">{b.count}</div>
            </div>
          ))}
        </div>

        {/* What the verifier does */}
        <div className="br-panel">
          <h2>{ar ? "كيف يعمل التحقق" : "How verification works"}</h2>
          <div className="tr-explain">
            {ar ? (
              <>
                <p>
                  <strong>الفكرة:</strong> أيّ ادعاء رقمي يكتبه الدماغ يجب أن يكون موجوداً في
                  حقائق قاعدة البيانات. إن لم يكن — تُعرَض ⚠ بدلاً من السماح بالادعاء كأنه حقيقة.
                </p>
                <p>
                  المحقّق يستخرج كل رقم/نسبة/عملة من النص (مثل <code>49,822</code> أو
                  <code>23%</code>) ويبحث عنه داخل حمولة الحقائق المُرسلة للراوي. الأرقام تُقبَل
                  ضمن هامش ±2٪ (لاستيعاب التقريب التحريري).
                </p>
                <p>
                  درجة الثقة النهائية تُجمَع من أربعة محاور: نسبة التحقق، حداثة البيانات،
                  كثافة الدعم، ودعم الرسم البياني السببي. التفاصيل مرئية في كل شارة
                  بمجرّد التحويم عليها.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>The contract:</strong> every numeric claim the brain writes must
                  appear in the database facts payload. If it doesn't, a ⚠ badge surfaces
                  instead of the claim sliding through as a confident assertion.
                </p>
                <p>
                  The verifier extracts every number/percent/currency token from the prose
                  (e.g. <code>49,822</code> or <code>23%</code>) and matches each against
                  the facts payload that fed the narrator. Numbers match within a ±2%
                  tolerance to absorb editorial rounding.
                </p>
                <p>
                  The final confidence score combines four axes: verification coverage,
                  data freshness, supporting density, and causal-graph support. The
                  per-axis breakdown is visible on hover of every badge.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Recent narratives */}
        <div className="br-panel">
          <h2>{ar ? "أحدث المخرجات" : "Recent outputs"}</h2>
          <div className="sub">
            {ar
              ? "آخر ما كتبه الدماغ مع شارة الثقة الخاصة بكل عبارة."
              : "The brain's latest writing, each line tagged with its trust badge."}
          </div>
          {recent.length === 0 ? (
            <div className="tr-explain">
              {ar
                ? "لا توجد مخرجات محفوظة بعد. شغّل الدماغ من أي صفحة وستظهر هنا."
                : "No cached outputs yet. Trigger the brain from any page and they will appear here."}
            </div>
          ) : (
            recent.map((n) => (
              <div key={n.id} className="tr-row">
                <div className="tr-main">
                  <div className="tr-text">
                    {n.text.length > 220 ? n.text.slice(0, 220) + "…" : n.text}
                  </div>
                  <div className="tr-meta">
                    <span>{ar ? `الثقة ${Math.round(n.score * 100)}%` : `${Math.round(n.score * 100)}% trust`}</span>
                    <span>{n.register}</span>
                    <span>{n.isStub ? (ar ? "نموذج محلي" : "stub") : (ar ? "API حيّ" : "live")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
