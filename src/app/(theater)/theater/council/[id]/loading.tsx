// Instant skeleton for the Decision Theater.
//
// composeFromCouncil() chains the narrator (an LLM call in live mode) + a graph
// load + BFS + several DB reads at SSR. Without this boundary Next froze the
// PREVIOUS page until that whole chain resolved — the "click theater, nothing
// happens for seconds" symptom. This loading.tsx renders the moment the user
// enters, so the curtain visibly rises while the script composes.

const bar = (w: string, h = 14, o = 0.08) => ({
  width: w,
  height: h,
  borderRadius: 6,
  background: `rgba(26,20,16,${o})`,
});

export default function TheaterLoading() {
  return (
    <div
      className="theater-shell min-h-screen"
      style={{ background: "#faf6ee", color: "#1a1410" }}
      aria-busy="true"
    >
      <div
        className="animate-pulse"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "84px 28px 60px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* act rail */}
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          {["I", "II", "III", "IV", "V"].map((r) => (
            <div key={r} style={bar(r === "I" ? 64 + "px" : "44px", 10, 0.12)} />
          ))}
        </div>

        {/* eyebrow + title */}
        <div style={bar("90px", 10, 0.16)} />
        <div style={bar("78%", 38, 0.1)} />

        {/* drop-cap paragraph */}
        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
          <div style={{ ...bar("58px", 72, 0.1), flex: "0 0 58px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
            <div style={bar("100%")} />
            <div style={bar("96%")} />
            <div style={bar("99%")} />
            <div style={bar("64%")} />
          </div>
        </div>

        {/* metric chips */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 150,
                height: 64,
                borderRadius: 12,
                background: "rgba(26,20,16,0.05)",
                border: "1px solid rgba(26,20,16,0.08)",
              }}
            />
          ))}
        </div>

        {/* curtain caption */}
        <div
          style={{
            marginTop: 26,
            textAlign: "center",
            fontSize: 12.5,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "rgba(26,20,16,0.4)",
            fontWeight: 600,
          }}
        >
          يرفع الستار · Raising the curtain
        </div>
      </div>
    </div>
  );
}
