"use client";

// CouncilBrief — the redesigned "brief the council" experience.
//
// Replaces the old two-input form (a company dropdown + a topic box, with no
// explanation of how they related). The new model is a single brief you
// assemble:
//   ① THE DECISION  — the question, the hero input, with a worked example.
//   ② FOCUS         — one picker of chips. Tap companies and/or aspects to add
//                     them. Nothing selected = the whole group, full picture.
//   ③ a plain-language echo sentence spells out exactly what will be debated,
//      so the user never wonders "what does this even do".
//
// The selection is serialized into hidden inputs (companyIds, lenses) and the
// decision into `topic`, then submitted to the `convene` server action — which
// fences the sub-agents to the briefed units + lens (see council.live.ts).

import { useMemo, useState } from "react";
import { Users2, MessagesSquare, Building2, Sparkles, X } from "lucide-react";

type Company = { id: string; name: string; nameEn: string | null };

type LensDef = { key: string; ar: string; en: string };
const LENSES: LensDef[] = [
  { key: "finance",        ar: "المالية",      en: "Finance" },
  { key: "operations",     ar: "العمليات",     en: "Operations" },
  { key: "supply",         ar: "سلسلة التوريد", en: "Supply chain" },
  { key: "sustainability", ar: "الاستدامة",    en: "Sustainability" },
  { key: "people",         ar: "الموظفون",     en: "People" },
  { key: "analytics",      ar: "التحليلات",    en: "Analytics" },
];

const GOLD = "#dcc38a";
const GOLD_DEEP = "#c2a35a";

export function CouncilBrief({
  convene,
  companies,
  ar,
  llmEnabled,
  runningCount,
  suggestions,
}: {
  convene: (formData: FormData) => void | Promise<void>;
  companies: Company[];
  ar: boolean;
  llmEnabled: boolean;
  runningCount: number;
  suggestions: string[];
}) {
  const [decision, setDecision] = useState("");
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [lenses, setLenses] = useState<string[]>([]);

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const coName = (c: Company) => (ar ? c.name : c.nameEn || c.name);
  const lensName = (l: LensDef) => (ar ? l.ar : l.en);

  // ③ The plain-language echo — the single line that kills the "what does this
  // do?" gap. Reads naturally in both languages from the current selection.
  const echo = useMemo(() => {
    const units = companyIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => coName(c as Company));
    const facets = lenses.map((k) => lensName(LENSES.find((l) => l.key === k)!));
    const unitText = units.length
      ? units.join(ar ? "، " : ", ")
      : ar ? "المجموعة كاملة" : "the whole group";
    const facetText = facets.join(ar ? "، " : ", ");
    if (ar) {
      return facets.length
        ? `سيناقش المجلس ${facetText} لـ${unitText}.`
        : `سيناقش المجلس ${unitText}.`;
    }
    return facets.length
      ? `The council will debate ${unitText}'s ${facetText}.`
      : `The council will debate ${unitText}.`;
    // coName/lensName depend only on `ar`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyIds, lenses, companies, ar]);

  const canSubmit = decision.trim().length >= 6;

  // ── shared chip styles ──────────────────────────────────────────────────
  const chip = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 13px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .15s",
    fontFamily: "'Inter Tight','Inter','IBM Plex Sans Arabic',system-ui,sans-serif",
    color: active ? "#0d1f1a" : "rgba(246,241,231,.86)",
    background: active ? `linear-gradient(135deg,${GOLD},${GOLD_DEEP})` : "rgba(20,46,38,.5)",
    border: `1px solid ${active ? GOLD_DEEP : "rgba(194,163,90,.28)"}`,
  });

  const groupLabel: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "var(--gold-soft)",
    margin: "0 0 9px",
  };

  return (
    <form action={convene} style={{ maxWidth: 780, margin: "0 auto" }}>
      {/* hidden carriers — kept in sync with the chip state */}
      <input type="hidden" name="companyIds" value={companyIds.join(",")} />
      <input type="hidden" name="lenses" value={lenses.join(",")} />

      {/* ① THE DECISION — the hero input */}
      <label htmlFor="topic" style={groupLabel}>
        <span style={{ color: GOLD }}>①</span>
        {ar ? "القرار — ما الذي نقرّره؟" : "The decision — what are we deciding?"}
      </label>
      <textarea
        id="topic"
        name="topic"
        rows={3}
        required
        minLength={6}
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
        placeholder={
          ar
            ? "مثال: دفعتا لبنة على بُعد 3 أيام من الانتهاء — نؤجّل، نخصم، أم نحوّل الوجهة؟"
            : "e.g. Two labneh batches are 3 days from expiry — hold, discount, or redirect?"
        }
        style={{
          width: "100%",
          background: "rgba(13,31,26,.5)",
          border: "1px solid rgba(194,163,90,.34)",
          borderRadius: 16,
          padding: "15px 18px",
          fontFamily: "'Inter Tight','Inter','IBM Plex Sans Arabic',system-ui,sans-serif",
          fontSize: 16,
          lineHeight: 1.55,
          color: "rgba(246,241,231,.96)",
          resize: "vertical",
          outline: "none",
        }}
      />

      {/* ② FOCUS — one unified picker (units + aspects), both optional */}
      <div
        style={{
          marginTop: 18,
          padding: "16px 18px",
          borderRadius: 16,
          background: "rgba(13,31,26,.32)",
          border: "1px solid rgba(194,163,90,.18)",
        }}
      >
        <div style={groupLabel}>
          <span style={{ color: GOLD }}>②</span>
          {ar ? "ركّز المجلس (اختياري)" : "Focus the council (optional)"}
        </div>

        {/* Units */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(246,241,231,.5)" }}>
          <Building2 className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "الوحدات" : "Units"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
          {companies.map((c) => {
            const active = companyIds.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggle(companyIds, setCompanyIds, c.id)} style={chip(active)}>
                {active ? <X className="h-3 w-3" strokeWidth={2.5} /> : null}
                {coName(c)}
              </button>
            );
          })}
        </div>

        {/* Aspects (lenses) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(246,241,231,.5)" }}>
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "الجوانب" : "Aspects"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {LENSES.map((l) => {
            const active = lenses.includes(l.key);
            return (
              <button key={l.key} type="button" onClick={() => toggle(lenses, setLenses, l.key)} style={chip(active)}>
                {active ? <X className="h-3 w-3" strokeWidth={2.5} /> : null}
                {lensName(l)}
              </button>
            );
          })}
        </div>

        {/* ③ plain-language echo */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 13,
            borderTop: "1px solid rgba(194,163,90,.16)",
            fontFamily: "var(--dl-display)",
            fontSize: 16,
            fontStyle: "italic",
            color: GOLD,
            lineHeight: 1.4,
          }}
        >
          {echo}
        </div>
      </div>

      {/* convene */}
      <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.5,
            color: "#0d1f1a",
            background: `linear-gradient(135deg,${GOLD},${GOLD_DEEP})`,
            border: `1px solid ${GOLD_DEEP}`,
            fontFamily: "'Inter Tight','Inter','IBM Plex Sans Arabic',system-ui,sans-serif",
          }}
        >
          <Users2 className="h-4 w-4" strokeWidth={1.5} />
          {ar ? "اعقد المجلس" : "Convene the council"}
        </button>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "rgba(246,241,231,.6)",
          }}
        >
          <MessagesSquare className="h-3 w-3" strokeWidth={1.5} />
          {llmEnabled
            ? (ar ? "المحرك: حيّ · Claude" : "Engine: live · Claude")
            : (ar ? "المحرك: تحليلي محلي" : "Engine: on-device reasoning")}
        </span>
        {runningCount > 0 ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".06em",
              padding: "3px 11px",
              borderRadius: 999,
              color: "var(--gold-soft)",
              background: "rgba(194,163,90,.18)",
              border: "1px solid rgba(194,163,90,.3)",
            }}
          >
            {runningCount} {ar ? "قيد التشغيل" : "running"}
          </span>
        ) : null}
      </div>

      {/* suggestions — one tap prefills the decision field */}
      {suggestions.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <div style={{ ...groupLabel, marginBottom: 11 }}>{ar ? "اقتراحات" : "Suggestions"}</div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDecision(s)}
                style={{
                  display: "flex",
                  width: "100%",
                  textAlign: "start",
                  gap: 8,
                  alignItems: "flex-start",
                  background: "rgba(20,46,38,.42)",
                  border: "1px solid rgba(194,163,90,.18)",
                  borderRadius: 12,
                  padding: "11px 14px",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "rgba(246,241,231,.82)",
                  cursor: "pointer",
                  fontFamily: "'Inter Tight','Inter','IBM Plex Sans Arabic',system-ui,sans-serif",
                }}
              >
                <span style={{ color: GOLD, fontWeight: 700 }}>+</span>
                <span style={{ fontStyle: ar ? "normal" : "italic" }}>{s}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
