"use client";

// Populates the ERP front-office operator surfaces (invoices, POS, payments,
// treasuries, assets, payroll, manufacturing, …) on demand. Hits the
// ADMIN-gated /api/admin/seed-erp route, which seeds THROUGH the core finance
// functions, so a green result also proves every create path works. Daylight
// register (The Core hub) — emerald on cream, not the Mission Control cyan.

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type Result =
  | { ok: true; ms: number; created: Record<string, number>; skipped: string[]; tenant: string }
  | { ok: false; error: string };

export function SeedErpButton({ ar }: { ar: boolean }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (
      !confirm(
        ar
          ? "سيتم تعبئة وحدات الباك أوفيس ببيانات تجريبية (عملاء، فواتير، دفعات، خزائن، أصول، رواتب…). آمن لإعادة التشغيل — لا حذف. متابعة؟"
          : "Populates the back-office modules with demo data (customers, invoices, payments, treasuries, assets, payroll…). Safe to re-run — nothing deleted. Continue?",
      )
    )
      return;
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed-erp", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setResult({ ok: true, ms: json.ms, created: json.created ?? {}, skipped: json.skipped ?? [], tenant: json.tenant });
      } else {
        setResult({ ok: false, error: json.error ?? "Failed" });
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error" });
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
        className="btn btn-primary"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending
          ? ar ? "جارٍ التعبئة…" : "Seeding…"
          : ar ? "تعبئة بيانات الباك أوفيس" : "Seed back-office data"}
      </button>

      {result && (
        <div
          className="mt-3 inline-flex items-start gap-2"
          style={{
            fontSize: 13,
            padding: "10px 13px",
            borderRadius: 8,
            background: "var(--paper, #fff)",
            border: `1px solid ${result.ok ? "var(--emerald)" : "var(--danger, #c0392b)"}`,
            color: result.ok ? "var(--ink)" : "var(--danger, #c0392b)",
            maxWidth: 640,
          }}
        >
          {result.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: "var(--emerald)" }} /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
          {result.ok ? (
            <div>
              <div style={{ fontWeight: 700 }}>
                {ar ? `تمّت التعبئة (${result.ms}ms)` : `Seeded in ${result.ms}ms`}
              </div>
              <div style={{ opacity: 0.75, marginTop: 4, fontFamily: "monospace" }}>
                {Object.entries(result.created).length
                  ? Object.entries(result.created).map(([k, v]) => `${k}=${v}`).join(" · ")
                  : ar ? "لا شيء جديد (كل البيانات موجودة)" : "nothing new (already seeded)"}
              </div>
              {result.skipped.length ? (
                <div style={{ opacity: 0.55, marginTop: 4, fontSize: 12 }}>
                  {ar ? "مُتخطّى (موجود): " : "skipped (already present): "}
                  {result.skipped.join(", ")}
                </div>
              ) : null}
            </div>
          ) : (
            <div>{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
