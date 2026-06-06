// CouncilSourcesPanel — the "on what did they decide this?" proof base.
//
// Renders the evidence the council actually reasoned over, persisted with the
// session: the live metrics the agents saw, the documents they could cite, and
// the in-scope entities. Presentational + server-rendered; lives on the dark
// cosmic field (inside a .co-wrap) so it matches the transcript above it.

import { Database, FileText, Network } from "lucide-react";
import type { CouncilSources } from "@/lib/brain/council";

// Bilingual labels + light formatting for the known metric keys.
const METRIC_LABEL: Record<string, { ar: string; en: string }> = {
  companies:                 { ar: "الشركات",            en: "Companies" },
  hotels:                    { ar: "الفنادق",            en: "Hotels" },
  farms_alerting:            { ar: "مزارع في تنبيه",     en: "Farms alerting" },
  dairy_batches_near_expiry: { ar: "دفعات قرب الانتهاء", en: "Batches near expiry" },
  open_insights:             { ar: "رؤى مفتوحة",         en: "Open insights" },
  revenue_90d:               { ar: "الإيراد (٩٠ي)",      en: "Revenue (90d)" },
  expense_90d:               { ar: "المصاريف (٩٠ي)",     en: "Expense (90d)" },
  margin_pct:                { ar: "الهامش",             en: "Margin" },
};

function fmtMetric(key: string, value: string, ar: boolean): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  if (key === "margin_pct") return `${n}%`;
  if (key === "revenue_90d" || key === "expense_90d") {
    return `${ar ? "" : "JOD "}${n.toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-US")}${ar ? " د.أ" : ""}`;
  }
  return n.toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-US");
}

export function CouncilSourcesPanel({ sources, ar }: { sources: CouncilSources; ar: boolean }) {
  const hasMetrics = sources.metrics.length > 0;
  const hasDocs = sources.documents.length > 0;
  const hasEntities = sources.entities.length > 0;
  if (!hasMetrics && !hasDocs && !hasEntities) return null;

  const card: React.CSSProperties = {
    background: "linear-gradient(160deg, rgba(20,46,38,.6), rgba(13,31,26,.55))",
    border: "1px solid rgba(194,163,90,.2)",
    borderRadius: 16,
    padding: "16px 18px",
  };
  const head: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--gold-soft)",
    marginBottom: 12,
  };

  return (
    <div className="co-wrap reveal" style={{ marginTop: 18 }}>
      <div className="co-question" style={{ margin: "0 0 18px" }}>
        <div className="lbl">{ar ? "الأدلة والمصادر" : "Evidence & sources"}</div>
        <h2 style={{ fontSize: "clamp(20px,2.4vw,28px)" }}>
          {ar ? "على ماذا استند المجلس" : "What the council reasoned on"}
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        {/* Live metrics — the numbers the agents saw */}
        {hasMetrics ? (
          <div style={card}>
            <div style={head}>
              <Database className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "الأرقام الحيّة" : "Live metrics"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {sources.metrics.map((m) => {
                const lbl = METRIC_LABEL[m.key];
                return (
                  <div key={m.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                    <span style={{ color: "rgba(246,241,231,.7)" }}>{lbl ? (ar ? lbl.ar : lbl.en) : m.key}</span>
                    <span style={{ fontWeight: 700, color: "#f6f1e7", fontVariantNumeric: "tabular-nums" }}>
                      {fmtMetric(m.key, m.value, ar)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Documents the council could cite */}
        {hasDocs ? (
          <div style={card}>
            <div style={head}>
              <FileText className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "المستندات المرجعية" : "Documents consulted"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {sources.documents.map((d, i) => (
                <div key={i} style={{ fontSize: 13, lineHeight: 1.4 }}>
                  <span style={{ color: "#f6f1e7", fontWeight: 600 }}>{d.title}</span>
                  <span style={{ color: "var(--gold-soft)", fontSize: 10.5, marginInlineStart: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>
                    {d.kind}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* In-scope entities */}
        {hasEntities ? (
          <div style={card}>
            <div style={head}>
              <Network className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "الكيانات ضمن النطاق" : "Entities in scope"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sources.entities.map((e, i) => (
                <span
                  key={i}
                  title={e.kind}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    color: "rgba(246,241,231,.84)",
                    background: "rgba(13,31,26,.5)",
                    border: "1px solid rgba(194,163,90,.22)",
                  }}
                >
                  {e.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "rgba(246,241,231,.5)" }}>
        {sources.engine === "live"
          ? (ar ? "محرّك حيّ · Claude — كل صوت استند إلى هذه الأدلة" : "Live engine · Claude — every voice argued from this evidence")
          : (ar ? "محرّك تحليلي محلي" : "On-device reasoning")}
      </div>
    </div>
  );
}
