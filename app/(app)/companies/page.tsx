// /companies — Heritage Modern showcase. Cream plinth hero + hairline tiles
// for each business unit. Single accent rail per company (drawn from the
// Heritage palette), display-serif headings, mono uppercase eyebrows. No
// gradient ribbons, no rainbow stat chips.
//
// See docs/DESIGN-SKILL.md §1.D and §5.

import Link from "next/link";
import {
  Building2, Pencil, Plus, Users2, MapPin, Download,
  Hotel, Milk, Sprout, GraduationCap, Briefcase, ArrowRight, Eye, Globe2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { SectorPill } from "@/components/SectorPill";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { HeritagePill } from "@/components/heritage";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber } from "@/lib/utils";
import { deleteCompany } from "./actions";

const SECTOR_LABEL: Record<string, { ar: string; en: string }> = {
  HOSPITALITY: { ar: "ضيافة", en: "Hospitality" },
  DAIRY:       { ar: "ألبان", en: "Dairy" },
  AGRICULTURE: { ar: "زراعة", en: "Agriculture" },
  EDUCATION:   { ar: "تعليم", en: "Education" },
  INVESTMENT:  { ar: "استثمار", en: "Investment" },
  TRADE:       { ar: "تجارة", en: "Trade" },
};

// Per-company accent — single chromatic touch from the Heritage palette.
const RAIL: Record<string, string> = {
  HH:    "var(--heri-terracotta)",
  ARENA: "var(--heri-ochre)",
  MAHA:  "var(--heri-copper)",
  LORAN: "var(--heri-teal)",
  AAU:   "var(--heri-ink)",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: { sector?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          hotels: true,
          dairyBatches: true,
          farms: true,
          programs: true,
        },
      },
    },
  });

  const totalEmployees = companies.reduce((a, c) => a + c.employees, 0);
  const countries = new Set(companies.map((c) => c.country));
  const sectors = new Set(companies.map((c) => c.sector));
  const activeSector = searchParams.sector;
  const visible = activeSector
    ? companies.filter((c) => c.sector === activeSector)
    : companies;

  // Sector counts for the filter pill bar
  const sectorCounts: Record<string, number> = {};
  for (const c of companies) {
    sectorCounts[c.sector] = (sectorCounts[c.sector] ?? 0) + 1;
  }

  return (
    <>
      <PageHeader
        eyebrow={ar ? "السجل القابض" : "Holdings registry"}
        title={ar ? "شركات مجموعة الحوراني" : "Hourani Group companies"}
        subtitle={
          ar
            ? "كل وحدة أعمال نشطة تحت مظلة المجموعة — منذ التأسيس عام 1979."
            : "Every active business unit under the group umbrella — since 1979."
        }
      />

      <PageContainer>
        {/* === Heritage hero plinth ============================================ */}
        <section className="heri-hero">
          <div
            className="px-6 py-8 md:px-9 md:py-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end"
            style={{ borderBottom: "1px solid var(--heri-rule-strong)" }}
          >
            <div className="min-w-0">
              <div className="heri-eyebrow">
                {ar ? "مجموعة الحوراني · القابضة" : "HOURANI GROUP · HOLDING"}
              </div>
              <h2
                className={ar ? "mt-3" : "font-display-latin mt-3"}
                style={{
                  fontSize: "clamp(28px, 3.4vw, 46px)",
                  lineHeight: 1.05,
                  letterSpacing: ar ? "-0.005em" : "-0.022em",
                  fontWeight: ar ? 600 : 500,
                  color: "var(--heri-ink)",
                  textWrap: "balance" as any,
                }}
              >
                {ar
                  ? "خمس وحدات. شبكة عصبية واحدة."
                  : "Five units. One nervous system."}
              </h2>
              <p
                className="measure mt-3"
                style={{
                  fontSize: "clamp(13px, 1vw, 14.5px)",
                  lineHeight: 1.55,
                  color: "var(--heri-ink-2)",
                }}
              >
                {ar
                  ? "كل وحدة أعمال نشطة تحت مظلة المجموعة — منذ التأسيس عام 1979."
                  : "Every active business unit under the group umbrella — operating in concert since 1979."}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/companies/new" className="heri-btn heri-btn-primary">
                  <Plus className="h-3.5 w-3.5" />
                  {ar ? "إضافة شركة" : "Add company"}
                </Link>
                <a
                  href={`/api/export/html/all?locale=${locale}`}
                  target="_blank"
                  rel="noreferrer"
                  className="heri-btn heri-btn-secondary"
                >
                  <Download className="h-3.5 w-3.5" />
                  {ar ? "تقرير المجموعة" : "Group report"}
                </a>
              </div>
            </div>
          </div>

          {/* Hero KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4">
            <HeroStat
              label={ar ? "وحدات" : "Units"}
              value={formatNumber(companies.length)}
              icon={Briefcase}
            />
            <HeroStat
              label={ar ? "موظفون" : "Employees"}
              value={formatNumber(totalEmployees)}
              icon={Users2}
              divider
            />
            <HeroStat
              label={ar ? "قطاعات" : "Sectors"}
              value={formatNumber(sectors.size)}
              icon={Building2}
              divider
            />
            <HeroStat
              label={ar ? "بلدان" : "Countries"}
              value={formatNumber(countries.size)}
              icon={Globe2}
              divider
            />
          </div>
        </section>

        {/* === Sector filter — hairline pill rail ================================ */}
        {companies.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1.5 px-1 py-3"
            style={{
              borderTop: "1px solid var(--heri-rule)",
              borderBottom: "1px solid var(--heri-rule)",
            }}
          >
            <span className="heri-eyebrow me-2">{ar ? "تصفية" : "Filter"}</span>
            <SectorChip
              href="/companies"
              active={!activeSector}
              label={ar ? "الكل" : "All"}
              count={companies.length}
            />
            {Object.entries(sectorCounts).map(([sector, count]) => {
              const meta = SECTOR_LABEL[sector] ?? { ar: sector, en: sector };
              return (
                <SectorChip
                  key={sector}
                  href={`/companies?sector=${sector}`}
                  active={activeSector === sector}
                  label={ar ? meta.ar : meta.en}
                  count={count}
                />
              );
            })}
          </div>
        ) : null}

        {/* === Company grid ===================================================== */}
        {visible.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={
              activeSector
                ? ar
                  ? "لا شركات في هذا القطاع"
                  : "No companies in this sector"
                : ar
                ? "لا توجد شركات بعد"
                : "No companies yet"
            }
            description={
              activeSector
                ? ar
                  ? "جرب فلتر آخر أو أضف شركة جديدة."
                  : "Try a different filter or add a new company."
                : ar
                ? "ابدأ بتسجيل أول شركة في المجموعة لتظهر في النظام العصبي."
                : "Register your first company to bring it into the nervous system."
            }
            action={
              <Link href="/companies/new" className="heri-btn heri-btn-primary">
                <Plus className="h-4 w-4" />
                {ar ? "إضافة شركة" : "Add company"}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 heri-stagger md:grid-cols-2 2xl:grid-cols-3">
            {visible.map((c) => (
              <CompanyTile key={c.id} company={c} ar={ar} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function HeroStat({
  label,
  value,
  icon: Icon,
  divider = false,
}: {
  label: string;
  value: string;
  icon: any;
  divider?: boolean;
}) {
  return (
    <div
      className="px-6 py-6 md:px-8 md:py-7"
      style={{
        borderInlineStart: divider ? "1px solid var(--heri-rule)" : undefined,
      }}
    >
      <div className="flex items-center gap-2 heri-eyebrow">
        <Icon className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </div>
      <div
        className="heri-number mt-3"
        style={{ fontSize: "clamp(22px, 2.4vw, 32px)", fontWeight: 500, color: "var(--heri-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function SectorChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="heri-focusable inline-flex items-center gap-2 px-3 py-1.5 transition"
      style={{
        background: active ? "var(--heri-ink)" : "var(--heri-cream)",
        border: active ? "1px solid var(--heri-ink)" : "1px solid var(--heri-rule-strong)",
        color: active ? "var(--heri-cream)" : "var(--heri-ink)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        textDecoration: "none",
      }}
    >
      {label}
      <span
        style={{
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
          opacity: 0.7,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatNumber(count)}
      </span>
    </Link>
  );
}

function CompanyTile({
  company: c,
  ar,
}: {
  company: any;
  ar: boolean;
}) {
  const accent = RAIL[c.code] ?? "var(--heri-rule-strong)";
  return (
    <article
      className="group relative flex flex-col"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        overflow: "hidden",
      }}
    >
      {/* Inline-start rail — single accent */}
      <span
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{ insetInlineStart: 0, width: 3, background: accent }}
      />

      {/* HEADER — logo + name + status */}
      <header
        className="ms-2 px-5 pt-5 pb-4"
        style={{ borderBottom: "1px solid var(--heri-rule)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                background: "var(--heri-cream-2)",
                border: "1px solid var(--heri-rule)",
                flexShrink: 0,
              }}
            >
              <CompanyLogo code={c.code} size={32} />
            </span>
            <div className="min-w-0">
              <div
                className="heri-eyebrow heri-eyebrow-ink"
                style={{ fontSize: 9.5, letterSpacing: "0.16em" }}
              >
                {c.code}
              </div>
              <h3
                className={ar ? "mt-1.5" : "font-display-latin mt-1.5"}
                style={{
                  fontSize: 18,
                  lineHeight: 1.15,
                  letterSpacing: ar ? 0 : "-0.012em",
                  fontWeight: ar ? 600 : 500,
                  color: "var(--heri-ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={ar ? c.name : c.nameEn}
              >
                {ar ? c.name : c.nameEn}
              </h3>
              <div
                className="mt-1 line-clamp-1"
                style={{ fontSize: 11, color: "var(--heri-ink-3)" }}
              >
                {ar ? c.nameEn : c.name}
              </div>
            </div>
          </div>
          <StatusBadge status={c.status} />
        </div>
      </header>

      {/* BODY */}
      <div className="ms-2 flex-1 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectorPill sector={c.sector} />
          {c.foundedYear ? (
            <span
              style={{
                fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
                fontSize: 10.5,
                letterSpacing: "0.08em",
                color: "var(--heri-ink-3)",
                fontVariantNumeric: "tabular-nums",
                textTransform: "uppercase",
              }}
            >
              {ar ? "تأسست" : "Est."} {c.foundedYear}
            </span>
          ) : null}
        </div>

        {c.description ? (
          <p
            className="line-clamp-2"
            style={{
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--heri-ink-2)",
            }}
          >
            {c.description}
          </p>
        ) : null}

        <div
          className="grid grid-cols-2 gap-3 pt-2"
          style={{ borderTop: "1px solid var(--heri-rule)" }}
        >
          <div className="pt-3">
            <div className="heri-eyebrow heri-eyebrow-ink mb-1" style={{ fontSize: 9.5 }}>
              {ar ? "الموقع" : "Location"}
            </div>
            <div
              className="flex items-center gap-1.5 truncate"
              style={{ fontSize: 12, color: "var(--heri-ink)" }}
            >
              <MapPin className="h-3 w-3 shrink-0" style={{ color: "var(--heri-ink-3)" }} strokeWidth={1.5} />
              <span className="truncate">{c.city ?? "—"} · {c.country}</span>
            </div>
          </div>
          <div className="pt-3">
            <div className="heri-eyebrow heri-eyebrow-ink mb-1" style={{ fontSize: 9.5 }}>
              {ar ? "الموظفون" : "Headcount"}
            </div>
            <div
              className="flex items-center gap-1.5"
              style={{ fontSize: 12, color: "var(--heri-ink)" }}
            >
              <Users2 className="h-3 w-3 shrink-0" style={{ color: "var(--heri-ink-3)" }} strokeWidth={1.5} />
              <span
                className="heri-number-mono"
                style={{ fontSize: 12.5, fontWeight: 600 }}
              >
                {formatNumber(c.employees)}
              </span>
              <span style={{ color: "var(--heri-ink-3)" }}>{ar ? "موظف" : "staff"}</span>
            </div>
          </div>
        </div>

        {/* Stat chips — Heritage pills only */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {c._count.hotels > 0 ? (
            <StatChip icon={Hotel} count={c._count.hotels} label={ar ? "فندق" : "hotels"} tone="info" />
          ) : null}
          {c._count.dairyBatches > 0 ? (
            <StatChip icon={Milk} count={c._count.dairyBatches} label={ar ? "دفعة" : "batches"} tone="info" />
          ) : null}
          {c._count.farms > 0 ? (
            <StatChip icon={Sprout} count={c._count.farms} label={ar ? "مزرعة" : "farms"} tone="success" />
          ) : null}
          {c._count.programs > 0 ? (
            <StatChip icon={GraduationCap} count={c._count.programs} label={ar ? "برنامج" : "programs"} tone="neutral" />
          ) : null}
          {c._count.users > 0 ? (
            <StatChip icon={Users2} count={c._count.users} label={ar ? "مستخدم" : "users"} tone="neutral" />
          ) : null}
        </div>
      </div>

      {/* FOOTER */}
      <footer
        className="ms-2 flex items-center justify-between gap-2 px-5 py-3"
        style={{
          borderTop: "1px solid var(--heri-rule)",
          background: "var(--heri-cream-2)",
        }}
      >
        <Link
          href={`/companies/${c.id}`}
          className="heri-btn heri-btn-primary"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          <Eye className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "عرض الملف" : "Open profile"}
          <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" strokeWidth={1.5} />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href={`/companies/${c.id}/edit`}
            className="heri-focusable inline-flex h-7 w-7 items-center justify-center transition"
            style={{
              border: "1px solid var(--heri-rule)",
              color: "var(--heri-ink-2)",
            }}
            title={ar ? "تعديل" : "Edit"}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
          <DeleteButton
            action={deleteCompany}
            payload={{ id: c.id }}
            label={
              ar
                ? `حذف ${c.name}؟`
                : `Delete ${c.nameEn}?`
            }
            description={
              ar
                ? "سيتم حذف الشركة وكل سجلاتها المرتبطة. هذا الإجراء لا رجعة فيه."
                : "The company and all related records will be permanently removed."
            }
          />
        </div>
      </footer>
    </article>
  );
}

function StatChip({
  icon: Icon,
  count,
  label,
  tone,
}: {
  icon: any;
  count: number;
  label: string;
  tone: "success" | "warn" | "critical" | "info" | "neutral";
}) {
  return (
    <HeritagePill tone={tone}>
      <Icon className="h-2.5 w-2.5" strokeWidth={1.5} />
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
        {formatNumber(count)}
      </span>
      <span style={{ opacity: 0.85 }}>{label}</span>
    </HeritagePill>
  );
}
