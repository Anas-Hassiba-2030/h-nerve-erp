import { Activity, Shield } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";

// Premium minimalist footer.
//
// Three balanced columns on desktop, single column on mobile:
//   1. Identity   — logo + system name + version + copyright
//   2. Partnership — Hourani Group × H-Nerve as elegant micro-marks
//   3. Status      — system pill + secure indicator
//
// No heavy gradients, no bloat — just Bloomberg-grade quiet confidence.
export async function Footer() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-16 border-t"
      style={{
        background: "var(--footer-bg, linear-gradient(0deg,#EFE8D5 0%,#F8F3E8 100%))",
        borderColor: "var(--footer-border, rgba(194,163,90,.28))",
      }}
    >
      {/* Hairline gradient on top of footer for visual continuity */}
      <div
        className="h-px w-full opacity-60"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #C2A35A 50%, transparent 100%)",
        }}
      />

      <div className="grid items-center gap-6 px-8 py-6 md:grid-cols-[1.2fr_2fr_1fr]">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-black text-white"
            style={{
              background: "linear-gradient(135deg, #1F4D3F 0%, #0f7a5a 60%, #C2A35A 110%)",
              boxShadow: "0 4px 12px -4px rgba(15,122,90,.40)",
            }}
          >
            H
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: "var(--footer-text, #3d3530)" }}>
              H‑Nerve <span style={{ color: "#C2A35A" }}>·</span> ERP
              <span
                className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold"
                style={{
                  background: "rgba(31,77,63,.10)",
                  color: "#1F4D3F",
                }}
              >
                v1.2
              </span>
            </div>
            <div className="text-[11px]" style={{ color: "var(--footer-muted, #7a6e65)" }}>
              © {year} {ar ? "مجموعة الحوراني" : "Hourani Group"} — {ar ? "جميع الحقوق محفوظة" : "All rights reserved"}
            </div>
          </div>
        </div>

        {/* Partnership marks */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-center">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "var(--footer-muted, #7a6e65)" }}
          >
            {ar ? "بتعاون استراتيجي" : "Strategic partnership"}
          </span>
          <div className="flex items-center gap-2">
            <PartnerMark
              emblem="ح"
              symbol="♛"
              name={ar ? "مجموعة الحوراني" : "Hourani Group"}
              gradient="linear-gradient(135deg, #1a2940 0%, #c69345 110%)"
            />
            <Cross />
            <PartnerMark
              emblem="HN"
              name={ar ? "إتش-نيرف" : "H-Nerve"}
              gradient="linear-gradient(135deg, var(--brand-deep) 0%, var(--accent) 110%)"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-end gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1"
            style={{
              background: "color-mix(in srgb, #10b981 12%, transparent)",
              color: "#0a8e54",
              borderColor: "color-mix(in srgb, #10b981 30%, transparent)",
              ['--tw-ring-color' as any]: "color-mix(in srgb, #10b981 22%, transparent)",
            }}
          >
            <span className="nerve-dot" style={{ width: 6, height: 6 }} />
            {ar ? "النظام نشط" : "System live"}
          </span>
          <span
            className="hidden items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold ring-1 md:inline-flex"
            style={{
              background: "rgba(31,77,63,.10)",
              color: "#1F4D3F",
              ['--tw-ring-color' as any]: "rgba(31,77,63,.22)",
            }}
            title={ar ? "جلسات مشفرة Iron-Session" : "Iron-Session encrypted"}
          >
            <Shield className="h-3 w-3" />
            {ar ? "مشفّر" : "Secure"}
          </span>
        </div>
      </div>
    </footer>
  );
}

function PartnerMark({
  emblem,
  symbol,
  name,
  gradient,
}: {
  emblem: string;
  symbol?: string;
  name: string;
  gradient: string;
}) {
  return (
    <span
      className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition hover:scale-[1.04]"
      title={name}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-black text-white shadow-sm ring-1 ring-white/10"
        style={{ background: gradient }}
      >
        {emblem}
      </span>
      <span
        className="hidden text-[10px] font-bold tracking-wide md:inline"
        style={{ color: "var(--footer-text, #3d3530)" }}
      >
        {name}
      </span>
      {symbol ? (
        <span className="hidden text-[10px] opacity-50 md:inline" style={{ color: "#C2A35A" }}>
          {symbol}
        </span>
      ) : null}
    </span>
  );
}

function Cross() {
  return (
    <span
      className="inline-block h-3 w-px opacity-40"
      style={{ background: "var(--footer-muted, #7a6e65)" }}
    />
  );
}
