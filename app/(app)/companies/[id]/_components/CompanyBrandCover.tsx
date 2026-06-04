import { getLocale } from "@/lib/i18n/i18n.server";
import {
  Users2,
  Calendar,
  MapPin,
} from "lucide-react";
import { SectorPill } from "@/components/ui/SectorPill";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/utils/utils";
import type { CompanyDetail } from "../data";

export function CompanyBrandCover({
  company,
  brand,
  age,
  en,
}: {
  company: CompanyDetail["company"];
  brand: CompanyDetail["brand"];
  age: CompanyDetail["age"];
  en: boolean;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 text-white anim-fade-up"
      style={{ background: brand.gradient, minHeight: "180px" }}
    >
      <div
        className="absolute inset-0 opacity-20 anim-grad"
        style={{
          background: `linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)`,
        }}
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl font-bold anim-pop"
            style={{
              background: "rgba(255,255,255,.15)",
              border: "1px solid rgba(255,255,255,.35)",
              backdropFilter: "blur(6px)",
              textShadow: "0 2px 12px rgba(0,0,0,.25)",
            }}
          >
            {brand.emblemSymbol ?? brand.emblem}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">
                #{company.code}
              </span>
              <SectorPill sector={company.sector} />
              <StatusBadge status={company.status} />
            </div>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl" style={{ letterSpacing: "-0.01em" }}>
              {getLocale() === "en" ? company.nameEn : company.name}
            </h2>
            <p className="text-sm opacity-90" dir="ltr">
              {brand.mottoEn}
            </p>
            <p className="text-sm opacity-90">{brand.motto}</p>
          </div>
        </div>

        {/* Quick facts */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
            style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}
          >
            <MapPin className="h-3 w-3" />
            {company.city ?? "—"} • {company.country}
          </span>
          {company.foundedYear ? (
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
              style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}
            >
              <Calendar className="h-3 w-3" />
              {en ? "Founded" : "تأسست"} {company.foundedYear} {age != null ? `• ${age} ${en ? "yrs" : "سنة"}` : ""}
            </span>
          ) : null}
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
            style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)" }}
          >
            <Users2 className="h-3 w-3" />
            {formatNumber(company.employees)} {en ? "employees" : "موظف"}
          </span>
          {company.ticker ? (
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs"
              style={{ background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)" }}
            >
              $ {company.ticker}
            </span>
          ) : null}
        </div>
      </div>

      {company.description ? (
        <p className="relative mt-4 max-w-3xl text-sm opacity-95">
          {company.description}
        </p>
      ) : null}
    </section>
  );
}
