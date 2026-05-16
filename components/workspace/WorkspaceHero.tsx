// WorkspaceHero — the company-identity cover for the Command Center.
// Brand-gradient plinth (company-specific via getCompanyBrand) carrying
// the bilingual identity, sector, status, and a dense quick-facts rail.
// This is the single rich chromatic surface; everything below it reverts
// to Heritage Modern hairline treatment (docs/DESIGN-SKILL.md §1.D).

import { Calendar, MapPin, Users2, Building2, Hash } from "lucide-react";
import { SectorPill } from "@/components/SectorPill";
import { StatusBadge } from "@/components/StatusBadge";
import { getCompanyBrand } from "@/lib/companyBrand";
import { formatNumber } from "@/lib/utils";

export function WorkspaceHero({
  ar,
  code,
  name,
  nameEn,
  sector,
  status,
  city,
  country,
  foundedYear,
  employees,
  ticker,
  description,
  dateLabel,
}: {
  ar: boolean;
  code: string;
  name: string;
  nameEn: string;
  sector: string;
  status: string;
  city: string | null;
  country: string;
  foundedYear: number | null;
  employees: number;
  ticker: string | null;
  description: string | null;
  dateLabel: string;
}) {
  const brand = getCompanyBrand(code);
  const age = foundedYear ? new Date().getFullYear() - foundedYear : null;
  const title = ar ? name : nameEn;
  const sub = ar ? nameEn : name;

  return (
    <section
      className="relative overflow-hidden rounded-2xl p-6 text-white anim-fade-up"
      style={{ background: brand.gradient, minHeight: "200px" }}
    >
      <div
        className="absolute inset-0 opacity-20 anim-grad"
        style={{
          background:
            "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
        }}
        aria-hidden
      />

      {/* Eyebrow row — command-center marker + live date */}
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
          style={{
            background: "rgba(255,255,255,.16)",
            border: "1px solid rgba(255,255,255,.3)",
            backdropFilter: "blur(6px)",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "#fff", boxShadow: "0 0 0 3px rgba(255,255,255,.25)" }}
            aria-hidden
          />
          {ar ? "مركز قيادة الشركة" : "Company Command Center"}
        </span>
        <span
          className="hidden font-mono text-[10px] uppercase tracking-[0.18em] opacity-80 sm:inline"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {dateLabel}
        </span>
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl font-black anim-pop"
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold uppercase tracking-[0.22em] opacity-80">
                <Hash className="h-3 w-3" />
                {code}
              </span>
              <SectorPill sector={sector} />
              <StatusBadge status={status} />
            </div>
            <h2
              className="mt-1.5 text-2xl font-black md:text-3xl"
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
            <p className="text-sm opacity-90" dir={ar ? "ltr" : "rtl"}>
              {sub}
            </p>
            <p className="mt-0.5 text-sm opacity-90">
              {ar ? brand.motto : brand.mottoEn}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <HeroFact icon={<MapPin className="h-3 w-3" />}>
            {(city ?? "—") + " • " + country}
          </HeroFact>
          {foundedYear ? (
            <HeroFact icon={<Calendar className="h-3 w-3" />}>
              {ar
                ? `تأسست ${foundedYear}${age != null ? ` • ${age} سنة` : ""}`
                : `Est. ${foundedYear}${age != null ? ` • ${age} yrs` : ""}`}
            </HeroFact>
          ) : null}
          <HeroFact icon={<Users2 className="h-3 w-3" />}>
            {formatNumber(employees)} {ar ? "موظف" : "staff"}
          </HeroFact>
          <HeroFact icon={<Building2 className="h-3 w-3" />}>
            {ar ? brand.nameEn : brand.name}
          </HeroFact>
          {ticker ? (
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs"
              style={{
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.3)",
              }}
            >
              $ {ticker}
            </span>
          ) : null}
        </div>
      </div>

      {description ? (
        <p className="relative mt-4 max-w-3xl text-sm leading-relaxed opacity-95">
          {description}
        </p>
      ) : null}
    </section>
  );
}

function HeroFact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
      style={{
        background: "rgba(255,255,255,.15)",
        border: "1px solid rgba(255,255,255,.25)",
      }}
    >
      {icon}
      {children}
    </span>
  );
}
