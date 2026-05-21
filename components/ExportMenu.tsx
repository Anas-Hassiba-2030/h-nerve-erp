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
        // Phase V3-P11 — was transparent w/ dark text, which disappeared
        // on the /markets blue gradient hero. Solid white BG + dark
        // text + dark border reads against any backdrop.
        style={{
          background: open ? "#0f172a" : "#ffffff",
          color: open ? "#ffffff" : "#0f172a",
          border: "1.5px solid #0f172a",
          borderRadius: 0,
          boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
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
          // Phase V3-NEW-3 — dropdown was clipped by parent hero's
          // overflow-hidden and z-index conflicted with the sticky
          // PageHeader (z-20). Bumped to z-[120], explicit width,
          // simplified header so it doesn't spill.
          className="absolute end-0 mt-2 w-[300px] max-w-[96vw]"
          style={{
            background: "#ffffff",
            border: "1.5px solid #0f172a",
            borderRadius: 0,
            boxShadow: "0 10px 30px -8px rgba(0,0,0,0.25)",
            zIndex: 120,
          }}
        >
          {/* Header — solid dark with single-line caption. */}
          <div
            className="flex items-center gap-2.5 px-4 py-3"
            style={{
              background: "#0f172a",
              color: "#fff",
            }}
          >
            <Globe2 className="h-4 w-4" style={{ color: "#c69345" }} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "#c69345" }}>
                {ar ? "تصدير تنفيذي" : "Executive export"}
              </div>
              <div
                className="mt-0.5 text-[11px]"
                style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.35 }}
              >
                {ar ? "KPIs · اتجاهات · تعليق محلل" : "KPIs · trends · analyst notes"}
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
