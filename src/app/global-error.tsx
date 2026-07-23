"use client";

// Catastrophic error boundary — wraps the entire app, including the root
// layout. When this fires, even providers/themes might be broken, so it ships
// its own minimal styles inline rather than relying on globals.css. Never
// imported by app code; Next renders it automatically when `app/layout.tsx`
// itself throws.
//
// Required to render its own <html> and <body>.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const greenDeep = "#0a4d3a";
  const greenMid = "#0f7a5a";
  const gold = "#c69345";
  const surface = "#f8f6ef";
  const text = "#0f2e2a";
  const muted = "#5b6f6a";

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: surface,
          color: text,
          fontFamily:
            '"Cairo","Tajawal",Inter,system-ui,-apple-system,Segoe UI,sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e6e2d3",
            overflow: "hidden",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.06), 0 12px 48px -12px rgba(15,122,90,0.35)",
          }}
        >
          <div
            style={{
              padding: "28px 24px",
              color: "#fff",
              background: `linear-gradient(135deg, ${greenDeep} 0%, ${greenMid} 60%, ${gold} 130%)`,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              H-Nerve · System fault
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              النظام العصبي توقف عن الاستجابة
            </div>
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>
              The nervous system has stopped responding.
            </div>
          </div>

          <div style={{ padding: 22 }}>
            <p style={{ margin: 0, fontSize: 13, color: muted, lineHeight: 1.6 }}>
              نعمل على إعادة الاتصال — حاول مرة أخرى. إذا استمرّت المشكلة،
              تواصل مع مسؤول النظام.
              <br />
              <span style={{ opacity: 0.8 }}>
                We're working on reconnecting. Try again, or contact your
                administrator if it persists.
              </span>
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  appearance: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#fff",
                  background: `linear-gradient(135deg, ${greenDeep} 0%, ${greenMid} 100%)`,
                  boxShadow: "0 4px 14px -4px rgba(15,122,90,0.5)",
                }}
              >
                إعادة المحاولة · Retry
              </button>
              <a
                href="/dashboard"
                style={{
                  textDecoration: "none",
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  color: greenDeep,
                  background: "#fff",
                  border: "1px solid #e6e2d3",
                }}
              >
                اللوحة التنفيذية · Dashboard
              </a>
            </div>

            {error?.digest ? (
              <div
                style={{
                  marginTop: 16,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(91,111,106,0.08)",
                  fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                  fontSize: 12,
                  color: muted,
                  wordBreak: "break-all",
                }}
              >
                digest: {error.digest}
              </div>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
