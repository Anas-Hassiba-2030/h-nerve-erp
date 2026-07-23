"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, ChevronDown } from "lucide-react";

// Catches errors thrown by descendant pages within the (app) group. The (app)
// layout still renders, so the user keeps the sidebar + chrome. They get a
// retry button, a way out, and — if they care — the technical details.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ar =
    typeof document !== "undefined" && document.documentElement.dir === "rtl";

  useEffect(() => {
    // Surface for the user; production observability would hook here too.
    console.error("[H-Nerve] page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div
        className="overflow-hidden rounded-2xl anim-rise-glow"
        style={{
          background: "var(--cream)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        {/* Branded gradient header */}
        <div
          className="relative overflow-hidden p-6 text-white"
          style={{
            background:
              "linear-gradient(135deg, #8b1f1f 0%, var(--brand-deep) 60%, var(--gold) 100%)",
          }}
        >
          <div className="absolute inset-0 bg-nerve-grid opacity-20" aria-hidden />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.22em] opacity-80">
                {ar ? "حدث خطأ" : "Something went wrong"}
              </div>
              {/*
                Phase F-Polish — softened from "the nervous system caught
                an unexpected signal" which read too dramatic for trivial
                failures (a slow Neon connection, a stale prop). Keep the
                technical-details accordion below for real debugging.
              */}
              <h1 className="mt-0.5 text-xl font-bold md:text-2xl">
                {ar
                  ? "تعذّر تحميل هذه الصفحة. حاول مرة أخرى."
                  : "Couldn't load this page. Give it another go."}
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            {ar
              ? "لا تقلق — البيانات والإعدادات بأمان. حاول مرة أخرى، أو ارجع إلى اللوحة التنفيذية ثم أعد المحاولة."
              : "Don't worry — your data and settings are safe. Try again, or head back to the dashboard and retry."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="btn-primary"
            >
              <RotateCcw className="h-4 w-4" />
              {ar ? "إعادة المحاولة" : "Retry"}
            </button>
            <Link href="/dashboard" className="btn-secondary">
              <Home className="h-4 w-4" />
              {ar ? "العودة للوحة التنفيذية" : "Back to dashboard"}
            </Link>
          </div>

          {/* Technical details — collapsed by default */}
          <details
            open={open}
            onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
            className="rounded-xl"
            style={{
              background: "color-mix(in srgb, var(--ink-muted) 8%, transparent)",
              border: "1px solid var(--line)",
            }}
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-bold"
              style={{ color: "var(--ink-muted)" }}
            >
              <span>{ar ? "تفاصيل تقنية" : "Technical details"}</span>
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </summary>
            <div
              className="border-t px-3 py-3 font-mono text-[13px] leading-relaxed"
              style={{
                color: "var(--ink)",
                borderColor: "var(--line)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <div>
                <span style={{ color: "var(--ink-muted)" }}>name:</span>{" "}
                {error.name}
              </div>
              <div>
                <span style={{ color: "var(--ink-muted)" }}>message:</span>{" "}
                {error.message}
              </div>
              {error.digest ? (
                <div>
                  <span style={{ color: "var(--ink-muted)" }}>digest:</span>{" "}
                  {error.digest}
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
