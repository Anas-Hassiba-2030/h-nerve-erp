"use client";

import { useState, useEffect, useRef } from "react";
import { Download, FileText, FileSpreadsheet, Globe2, ChevronDown } from "lucide-react";

// Reusable export dropdown — surfaces both formats (HTML + CSV) with both
// locales, plus a quick-print option that opens HTML and triggers print.
// Mounts on every list page through the PageHeader actions slot.

export function ExportMenu({
  type,
  companyCode = "HH",
  locale,
}: {
  type: string;
  companyCode?: string;
  locale: "ar" | "en";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ar = locale === "ar";

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const baseQs = `company=${companyCode}`;
  const items = [
    {
      icon: FileText,
      tone: "emerald",
      labelAr: "HTML — العربية",
      labelEn: "HTML — Arabic",
      href: `/api/export/html/${type}?${baseQs}&locale=ar`,
      target: "_blank",
    },
    {
      icon: FileText,
      tone: "blue",
      labelAr: "HTML — الإنجليزية",
      labelEn: "HTML — English",
      href: `/api/export/html/${type}?${baseQs}&locale=en`,
      target: "_blank",
    },
    {
      icon: FileSpreadsheet,
      tone: "emerald",
      labelAr: "CSV — العربية (Excel)",
      labelEn: "CSV — Arabic (Excel)",
      href: `/api/export/${type}?${baseQs}&locale=ar`,
    },
    {
      icon: FileSpreadsheet,
      tone: "blue",
      labelAr: "CSV — الإنجليزية",
      labelEn: "CSV — English",
      href: `/api/export/${type}?${baseQs}&locale=en`,
    },
  ];

  const TONE: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] transition"
        style={{
          background: open ? "var(--text)" : "transparent",
          color: open ? "var(--surface-elevated)" : "var(--text)",
          border: "1.5px solid var(--text)",
          borderRadius: 0,
        }}
        aria-expanded={open}
      >
        <Download className="h-3.5 w-3.5" />
        {ar ? "تصدير" : "Export"}
        <ChevronDown
          className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="hn-anim-rise absolute end-0 z-50 mt-2 w-[min(96vw,360px)] overflow-hidden"
          style={{
            background: "var(--surface-elevated)",
            border: "1.5px solid var(--text)",
            borderRadius: 0,
            boxShadow: "6px 6px 0 0 var(--text)",
          }}
        >
          {/* Header — gold rail + black bg */}
          <div
            className="relative flex items-center gap-2.5 px-4 py-3"
            style={{
              background: "#0b0d0e",
              color: "#f5f1e8",
              boxShadow: "inset 0 2px 0 0 #c69345",
            }}
          >
            <Globe2 className="h-4 w-4" style={{ color: "#c69345" }} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "#c69345" }}>
                {ar ? "تصدير تنفيذي" : "Executive export"}
              </div>
              <div
                className="mt-0.5 text-[11.5px] font-bold"
                style={{ color: "rgba(245,241,232,0.7)" }}
              >
                {ar
                  ? "KPIs + اتجاهات + تعليق محلل"
                  : "KPIs · Trends · Analyst commentary"}
              </div>
            </div>
          </div>

          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <li key={i}>
                  <a
                    href={it.href}
                    target={it.target}
                    rel={it.target ? "noreferrer" : undefined}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--brand-soft)]"
                    style={{ color: "var(--text)" }}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center ring-1 ${TONE[it.tone] ?? TONE.emerald}`}
                      style={{ borderRadius: 0 }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-extrabold">
                        {ar ? it.labelAr : it.labelEn}
                      </div>
                    </div>
                    <span
                      className="font-mono text-[9px] font-extrabold uppercase tracking-wider opacity-0 transition group-hover:opacity-100"
                      style={{ color: "var(--brand)" }}
                    >
                      ↗
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <div
            className="px-4 py-2.5"
            style={{
              background: "var(--brand-soft)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <p
              className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] leading-tight"
              style={{ color: "var(--text-muted)" }}
            >
              {ar
                ? "Hero + KPIs + رسم + جدول كامل"
                : "Hero · KPIs · Chart · Full table"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
