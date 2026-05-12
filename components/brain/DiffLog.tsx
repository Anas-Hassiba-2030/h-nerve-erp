// DiffLog — Industrial Precision (DESIGN-SKILL §1.B) panel for displaying
// proposed weight changes. Off-black background, mono everything, single
// ochre accent. Each row: target → field — old strikethrough → new (typed).
//
// Phase 10 of docs/PHASES-INTELLIGENCE.md.

export type DiffEntry = {
  target: string;
  field: string;
  from: any;
  to: any;
  rationale: string;
  confidence: number;
};

export function DiffLog({
  entries,
  ar,
  applied = false,
}: {
  entries: DiffEntry[];
  ar: boolean;
  /** When the report has been applied, render with a subtle "committed" style. */
  applied?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div
        className="diff-log diff-log-empty"
        style={{
          background: "#0e0e10",
          color: "rgba(245,239,230,0.55)",
          border: "1px solid rgba(245,239,230,0.12)",
          padding: "20px 22px",
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 12,
          letterSpacing: "0.06em",
          fontStyle: "italic",
        }}
      >
        {ar ? "// لا تعديلات مقترحة." : "// no adjustments proposed."}
      </div>
    );
  }

  return (
    <pre
      className="diff-log"
      style={{
        background: "#0e0e10",
        color: "rgba(245,239,230,0.92)",
        border: "1px solid rgba(245,239,230,0.14)",
        padding: "18px 0",
        fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
        fontSize: 12.5,
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: "pre",
        overflowX: "auto",
        position: "relative",
      }}
    >
      {/* Faint scanlines for engine-room feel */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "0 22px 10px",
          color: "#c69345",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontSize: 10,
          borderBottom: "1px solid rgba(245,239,230,0.1)",
          marginBottom: 12,
        }}
      >
        {applied ? (ar ? "// تم التطبيق" : "// applied") : (ar ? "// تعديلات مُقترحة" : "// proposed adjustments")}{" "}
        ·{" "}
        {entries.length} {ar ? "تغيير" : entries.length === 1 ? "change" : "changes"}
      </div>

      {entries.map((e, i) => (
        <div
          key={i}
          className="diff-log-row"
          style={{
            padding: "8px 22px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            columnGap: 16,
            alignItems: "baseline",
            borderBottom:
              i < entries.length - 1
                ? "1px dashed rgba(245,239,230,0.08)"
                : "none",
            animation: `diff-row-rise 460ms cubic-bezier(0.16,1,0.3,1) ${i * 40}ms both`,
          }}
        >
          {/* Index */}
          <span
            style={{
              color: "rgba(245,239,230,0.45)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>

          {/* Target + diff line */}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#c69345", letterSpacing: "0.04em" }}>
              {e.target}
              <span style={{ color: "rgba(245,239,230,0.4)" }}>{"  "}·{"  "}</span>
              <span style={{ color: "rgba(245,239,230,0.7)" }}>{e.field}</span>
            </div>
            <div
              style={{
                marginTop: 4,
                color: "rgba(245,239,230,0.85)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span
                style={{
                  textDecoration: "line-through",
                  textDecorationColor: "#e89a7c",
                  color: "rgba(245,239,230,0.55)",
                }}
              >
                {String(e.from)}
              </span>
              <span style={{ color: "#c69345", margin: "0 12px" }}>→</span>
              <span
                style={{
                  color: applied ? "#9bd6c4" : "#fafaf7",
                  fontWeight: 600,
                  /* Type-in reveal — purely cosmetic */
                  display: "inline-block",
                  animation: `diff-type ${280 + i * 30}ms cubic-bezier(0.16,1,0.3,1) ${
                    i * 40 + 120
                  }ms both`,
                  clipPath: "inset(0 100% 0 0)",
                }}
              >
                {String(e.to)}
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                color: "rgba(245,239,230,0.5)",
                fontStyle: "italic",
                fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                fontSize: 12,
                lineHeight: 1.5,
                maxWidth: "62ch",
                whiteSpace: "normal",
              }}
            >
              {e.rationale}
            </div>
          </div>

          {/* Confidence */}
          <span
            style={{
              color: "rgba(245,239,230,0.55)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontSize: 10,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {ar ? "ثقة" : "conf"} {(e.confidence * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </pre>
  );
}
