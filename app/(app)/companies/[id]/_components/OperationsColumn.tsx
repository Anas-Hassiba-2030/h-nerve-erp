import Link from "next/link";
import {
  Hotel,
  Milk,
  Sprout,
  GraduationCap,
  Building2,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatNumber,
  formatMoney,
  formatShortDate,
  TIERS_AR,
  FARM_TYPES_AR,
  VERTICALS_AR,
  FARM_TYPES_EN,
  VERTICALS_EN,
  TIERS_EN,
  loc,
} from "@/lib/utils/utils";
import type { CompanyDetail } from "../data";

export function OperationsColumn({
  company,
  en,
}: {
  company: CompanyDetail["company"];
  en: boolean;
}) {
  const locale = en ? "en" : "ar";
  return (
    <div className="space-y-6">
      {/* Hotels */}
      {company.hotels.length > 0 ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <Hotel className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Hotels" : "الفنادق"}                  </h3>
            <Link href="/hotels" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
              {en ? "View all →" : "عرض الكل ←"}
            </Link>
          </header>
          <ul className="divide-y divide-[var(--line)]">
            {company.hotels.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                    {en ? (h.nameEn ?? h.name) : h.name}{" "}
                    <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                      {"★".repeat(h.starRating)}
                    </span>
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {h.city} • {loc(TIERS_AR, TIERS_EN, locale, h.tier)} • {formatNumber(h.totalRooms)} غرفة
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-sky">{h._count.bookings} {en ? "bookings" : "حجز"}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Dairy batches */}
      {company.dairyBatches.length > 0 ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <Milk className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Recent dairy batches" : "دفعات الألبان الأخيرة"}                  </h3>
            <Link href="/dairy" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
              {en ? "View all →" : "عرض الكل ←"}
            </Link>
          </header>
          <ul className="divide-y divide-[var(--line)]">
            {company.dairyBatches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                    {en ? (b.product || b.productAr) : (b.productAr || b.product)}
                  </div>
                  <div className="text-[11px] font-mono" style={{ color: "var(--ink-muted)" }}>
                    {b.batchNumber} • {formatShortDate(b.productionDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                    {formatNumber(b.quantityLiters)} {en ? "L" : "لتر"}
                  </span>
                  <span className="badge-sky">{en ? "Grade" : "درجة"} {b.qualityGrade}</span>
                  <StatusBadge status={b.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Farms */}
      {company.farms.length > 0 ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <Sprout className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Farms" : "المزارع"}                  </h3>
            <Link href="/farms" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
              {en ? "View all →" : "عرض الكل ←"}
            </Link>
          </header>
          <ul className="divide-y divide-[var(--line)]">
            {company.farms.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                    {en ? (f.nameEn ?? f.name) : f.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {loc(FARM_TYPES_AR, FARM_TYPES_EN, locale, f.type)} • {f.location} • {formatNumber(f.areaDunum)} {en ? "dunum" : "دونم"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-emerald">{f._count.crops} {en ? "crops" : "محصول"}</span>
                  <StatusBadge status={f.alertLevel} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Programs */}
      {company.programs.length > 0 ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <GraduationCap className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Programs & incubators" : "البرامج والحاضنات"}                  </h3>
            <Link href="/education" className="text-[11px] font-bold" style={{ color: "var(--gold)" }}>
              {en ? "View all →" : "عرض الكل ←"}
            </Link>
          </header>
          <ul className="divide-y divide-[var(--line)]">
            {company.programs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold" style={{ color: "var(--ink)" }}>
                    {en ? (p.nameEn ?? p.name) : p.name}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {loc(VERTICALS_AR, VERTICALS_EN, locale, p.vertical)} • {en ? "Founder:" : "مؤسس:"} {p.founder} • {en ? "Cohort" : "فوج"} {p.cohort}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-indigo">{formatMoney(p.fundingJod)}</span>
                  <StatusBadge status={p.stage} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* If nothing operational, show a single empty state instead of multiple cards. */}
      {company.hotels.length === 0 &&
      company.dairyBatches.length === 0 &&
      company.farms.length === 0 &&
      company.programs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={en ? "No linked operations yet" : "لا توجد عمليات مرتبطة بعد"}
          description={en ? "Hotels, batches, farms, and programs will appear here once linked to this company." : "ستظهر هنا الفنادق، الدفعات، المزارع، والبرامج فور ربطها بهذه الشركة."}
        />
      ) : null}
    </div>
  );
}
