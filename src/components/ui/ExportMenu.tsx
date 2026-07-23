"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, FileSpreadsheet, Globe2, ChevronDown } from "lucide-react";

// Phase V3-NEW-3-RE — second rebuild. Prior attempt failed because
// the dropdown was rendered as a child of the trigger inside the
// /finance hero card, which has overflow-hidden — clipping all but
// the dark header strip. Fix: render the panel via React portal into
// document.body and position it with position:fixed using the
// trigger's bounding rect. Escapes every parent overflow + every
// stacking context. No more clipping. Z-index 9999 to clear the
// sticky PageHeader (z-20) and any modal/banner.

export function ExportMenu({
  type,
  companyCode = "HH",
  locale,
  variant = "sleek",
}: {
  type: string;
  companyCode?: string;
  locale: "ar" | "en";
  variant?: "sleek" | "heritage";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const ar = locale === "ar";

  useEffect(() => { setMounted(true); }, []);

  // Compute position on open + on window resize/scroll.
  useEffect(() => {
    if (!open) return;
    function position() {
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      setPos({ top: b.bottom + 6, left: b.left, right: window.innerWidth - b.right });
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  // Click outside (on portal) closes.
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const baseQs = `company=${companyCode}`;
  const items: Array<{
    icon: any;
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    href: string;
    target?: string;
  }> = [
    {
      icon: FileText,
      labelAr: "تقرير تنفيذي — HTML عربي",
      labelEn: "Executive PDF — Arabic",
      descAr: "KPIs · اتجاهات · تعليق محلل",
      descEn: "KPIs, trend chart, analyst commentary",
      href: `/api/export/html/${type}?${baseQs}&locale=ar`,
      target: "_blank",
    },
    {
      icon: FileText,
      labelAr: "تقرير تنفيذي — HTML إنجليزي",
      labelEn: "Executive PDF — English",
      descAr: "KPIs · اتجاهات · تعليق محلل",
      descEn: "KPIs, trend chart, analyst commentary",
      href: `/api/export/html/${type}?${baseQs}&locale=en`,
      target: "_blank",
    },
    {
      icon: FileSpreadsheet,
      labelAr: "بيانات خام — CSV عربي",
      labelEn: "Raw data CSV — Arabic",
      descAr: "السجل الكامل — Excel-ready",
      descEn: "Full ledger — Excel-ready",
      href: `/api/export/${type}?${baseQs}&locale=ar`,
    },
    {
      icon: FileSpreadsheet,
      labelAr: "بيانات خام — CSV إنجليزي",
      labelEn: "Raw data CSV — English",
      descAr: "السجل الكامل — Excel-ready",
      descEn: "Full ledger — Excel-ready",
      href: `/api/export/${type}?${baseQs}&locale=en`,
    },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          variant === "heritage"
            ? "dl-btn dl-btn-secondary inline-flex items-center gap-1.5 transition"
            : "inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[13px] font-extrabold uppercase tracking-[0.16em] transition"
        }
        style={
          variant === "sleek"
            ? {
                background: open ? "#0f172a" : "#ffffff",
                color: open ? "#ffffff" : "#0f172a",
                border: "1.5px solid #0f172a",
                borderRadius: 0,
                boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
              }
            : undefined
        }
        aria-expanded={open}
      >
        <Download className="h-3.5 w-3.5" />
        {ar ? "تصدير" : "Export"}
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {mounted && open && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                top: pos.top,
                // Anchor to whichever side of the viewport is closer.
                ...(ar ? { left: pos.left } : { right: pos.right }),
                width: 360,
                maxWidth: "calc(100vw - 24px)",
                background: "#ffffff",
                border: "1.5px solid #0f172a",
                borderRadius: 0,
                boxShadow: "0 18px 40px -12px rgba(0,0,0,0.35)",
                zIndex: 9999,
              }}
            >
              {/* Header strip */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  background: "#0f172a",
                  color: "#fff",
                }}
              >
                <Globe2 className="h-4 w-4" style={{ color: "#c69345" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "#c69345",
                    }}
                  >
                    {ar ? "تصدير تنفيذي" : "Executive export"}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.78)",
                      lineHeight: 1.35,
                    }}
                  >
                    {ar ? "اختر الصيغة المطلوبة" : "Choose your format"}
                  </div>
                </div>
              </div>

              {/* Options */}
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {items.map((it, i) => {
                  const Icon = it.icon;
                  return (
                    <li
                      key={i}
                      style={{
                        borderTop: i === 0 ? "0" : "1px solid #e7e0d2",
                      }}
                    >
                      <a
                        href={it.href}
                        target={it.target}
                        rel={it.target ? "noreferrer" : undefined}
                        onClick={() => setOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "14px 16px",
                          minHeight: 56,
                          color: "#0f172a",
                          textDecoration: "none",
                          transition: "background 120ms",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = "#faf3eb";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 32,
                            height: 32,
                            background: "#faf3eb",
                            border: "1px solid #c69345",
                            color: "#0f172a",
                            flexShrink: 0,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {ar ? it.labelAr : it.labelEn}
                          </div>
                          <div style={{ fontSize: 12, color: "#5e5448", marginTop: 1 }}>
                            {ar ? it.descAr : it.descEn}
                          </div>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
