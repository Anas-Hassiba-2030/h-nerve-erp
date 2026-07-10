// /brain/narrate — Phase 4 (Narrator) output gallery.
//
// Surfaces recent Narrative rows from the cache — what the brain actually
// wrote, each entry tagged with its trust badge (Phase 22 VerifiedBadge).
// Read-only. The narrate action lives in ./actions.ts and is called from
// individual dashboard pages via hover tooltip; this page shows the audit log.
//
// Aesthetic: brain night register (reuses trust.css).
// See docs/governance/PHASES-INTELLIGENCE.md § Phase 4.

import "../../daylight.css";
import "../trust/trust.css";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { VerifiedBadge } from "@/components/brain/VerifiedBadge";
import type { ConfidenceScore } from "@/lib/brain/confidence";
import type { VerificationReport } from "@/lib/brain/verifier";

export const dynamic = "force-dynamic";

const REGISTER_LABEL: Record<string, { ar: string; en: string }> = {
  headline:  { ar: "عنوان",  en: "Headline" },
  editorial: { ar: "تحريري", en: "Editorial" },
  executive: { ar: "تنفيذي", en: "Executive" },
};

export default async function NarratePage() {
  const locale = await getLocale();
  const ar = locale === "ar";

  const narratives = await prisma.narrative.findMany({
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  const fmtDate = new Intl.DateTimeFormat(ar ? "ar-JO" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="br-wrap">
        {/* ── Ribbon ─────────────────────────────────────────────────────── */}
        <div className="br-ribbon">
          <div className="br-title-box">
            <span className="eb">
              <span className="tick" />
              {ar ? "الدماغ السردي" : "Narrative brain"}
            </span>
            <h1>{ar ? "المخرجات" : "Narrate"}</h1>
          </div>
          <div className="br-intro">
            {ar
              ? "ما كتبه الدماغ مؤخراً — كل عبارة تحمل شارة الثقة التي تعكس نسبة تطابق الأرقام مع قاعدة البيانات."
              : "What the brain wrote recently — each line carries a trust badge showing how well its numbers were verified against the database."}
          </div>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        {narratives.length > 0 && (
          <div className="br-kpis">
            <div className="br-kpi">
              <div className="v">{narratives.length}</div>
              <div className="k">{ar ? "مخرجات مخزّنة" : "Cached outputs"}</div>
            </div>
            <div className="br-kpi">
              <div className="v">{narratives.filter((n) => !n.isStub).length}</div>
              <div className="k">{ar ? "مكالمات API حيّة" : "Live API calls"}</div>
            </div>
            <div className="br-kpi">
              <div className="v">
                {narratives.filter((n) => (n.trustLabel as string) === "high").length}
              </div>
              <div className="k">{ar ? "ثقة عالية" : "High trust"}</div>
            </div>
            <div className="br-kpi">
              <div className="v">
                {[...new Set(narratives.map((n) => n.topic))].length}
              </div>
              <div className="k">{ar ? "موضوعات مختلفة" : "Distinct topics"}</div>
            </div>
          </div>
        )}

        {/* ── Narrative list ─────────────────────────────────────────────── */}
        <div className="br-panel">
          <h2>{ar ? "المخرجات الأخيرة" : "Recent outputs"}</h2>
          <div className="sub">
            {ar
              ? "مرتّبة من الأحدث — يُخزَّن كل مخرج مع بيانات التحقق الخاصة به."
              : "Most recent first — every output is stored with its verification telemetry."}
          </div>

          {narratives.length === 0 ? (
            <div className="tr-explain">
              {ar
                ? "لم يكتب الدماغ أي مخرجات بعد. سيظهر كل مخرج هنا فور تفعيل الراوي من أي صفحة."
                : "The brain hasn't written anything yet. Every output will appear here as soon as the narrator is triggered from any page."}
            </div>
          ) : (
            narratives.map((n) => {
              const verFactor =
                n.claimsTotal > 0 ? n.claimsMatched / n.claimsTotal : 0.5;

              const confidence: ConfidenceScore = {
                score: n.trustScore,
                label: (n.trustLabel as "high" | "medium" | "low") ?? "medium",
                factors: {
                  verification: verFactor,
                  freshness: 0.5,
                  density: 0.5,
                  graph: 0.5,
                },
              };

              const verification: VerificationReport = {
                total: n.claimsTotal,
                verified: n.claimsMatched,
                unverified: n.claimsTotal - n.claimsMatched,
                coverage: verFactor,
                claims: [],
                trustLevel:
                  (n.trustLabel as "high" | "medium" | "low") ?? "medium",
              };

              const registerLabel =
                REGISTER_LABEL[n.register]?.[ar ? "ar" : "en"] ?? n.register;

              return (
                <div key={n.id} className="tr-row">
                  <div className="tr-main">
                    <div
                      className="tr-text"
                      style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                    >
                      <VerifiedBadge
                        confidence={confidence}
                        verification={verification}
                        locale={ar ? "ar" : "en"}
                      />
                      <span>
                        {n.text.length > 320
                          ? n.text.slice(0, 320) + "…"
                          : n.text}
                      </span>
                    </div>
                    <div className="tr-meta">
                      <span>{n.topic}</span>
                      <span>{registerLabel}</span>
                      <span>
                        {n.isStub
                          ? ar ? "نموذج محلي" : "stub"
                          : ar ? "API حيّ" : "live"}
                      </span>
                      <span dir="ltr">{fmtDate.format(new Date(n.createdAt))}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
