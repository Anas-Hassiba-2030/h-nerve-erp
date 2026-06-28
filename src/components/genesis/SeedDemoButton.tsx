"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type Result = { ok: true; ms: number; counts: Record<string, number> } | { ok: false; error: string };

export function SeedDemoButton({ ar }: { ar: boolean }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (!confirm(ar
      ? "سيتم تعبئة النظام ببيانات تجريبية (شركات، فنادق، حجوزات). آمن لإعادة التشغيل — لا حذف. متابعة؟"
      : "Populates the system with demo data (companies, hotels, bookings). Safe to re-run — nothing deleted. Continue?")) return;
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setResult({ ok: true, ms: json.ms, counts: json.counts });
      } else {
        setResult({ ok: false, error: json.error ?? "Failed" });
      }
    } catch (err: any) {
      setResult({ ok: false, error: err?.message ?? "Network error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.005em",
          padding: "9px 16px",
          borderRadius: 8,
          // Heritage admin: emerald outline on warm white — readable on cream,
          // clearly a button, without shouting (it's an ops action, not a hero).
          background: "var(--admin-bg-2)",
          color: "var(--admin-cyan)",
          border: "1.5px solid var(--admin-cyan)",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending
          ? ar ? "جارٍ التعبئة…" : "Seeding…"
          : ar ? "تعبئة بيانات تجريبية" : "Seed demo data"}
      </button>

      {result && (
        <div
          className="mt-3 inline-flex items-start gap-2"
          style={{
            fontSize: 13,
            padding: "10px 13px",
            borderRadius: 8,
            background: "var(--admin-bg-2)",
            border: `1px solid ${result.ok ? "var(--admin-cyan)" : "var(--admin-rose)"}`,
            color: result.ok ? "var(--admin-text)" : "var(--admin-rose)",
            maxWidth: 640,
          }}
        >
          {result.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
          {result.ok ? (
            <div>
              <div style={{ fontWeight: 500 }}>
                {ar ? `تمّت التعبئة (${result.ms}ms)` : `Seeded in ${result.ms}ms`}
              </div>
              <div style={{ opacity: 0.7, marginTop: 4, fontFamily: "monospace" }}>
                {Object.entries(result.counts).map(([k, v]) => `${k}=${v}`).join(" · ")}
              </div>
              <div style={{ opacity: 0.6, marginTop: 6 }}>
                {ar ? "افتح اللوحة لرؤية البيانات الجديدة." : "Open the dashboard to see the new data."}
              </div>
            </div>
          ) : (
            <div>{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
