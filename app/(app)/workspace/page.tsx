// /workspace — the Company Command Center (Phase G1).
//
// Where "Enter workspace" lands. A deep, sector-aware ERP for the ACTIVE
// company: identity, financial command, sector operations, team, pipeline,
// drill-downs. Requires an active workspace cookie; redirects out if none.
// Heritage Modern; the Hero is the single chromatic surface.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Hotel, Milk, Sprout, GraduationCap, Briefcase, Users2,
  ArrowLeft, TrendingUp, FlaskConical, Building2, ArrowUpRight,
} from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkspaceHero } from "@/components/workspace/WorkspaceHero";
import { WorkspaceFinancials } from "@/components/workspace/WorkspaceFinancials";
import { prisma, prismaUnscoped } from "@/lib/db";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n.server";
import { formatMoney, formatNumber } from "@/lib/utils";

export default async function WorkspacePage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");

  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";
  const dateLabel = new Intl.DateTimeFormat(
    ar ? "ar-JO-u-nu-latn" : "en-US",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  ).format(new Date());

  // Scoped client auto-filters these to the active workspace. User is not
  // workspace-scoped, so it is filtered explicitly.
  const [txns, hotels, batches, farms, programs, projects, team] =
    await Promise.all([
      prisma.transaction.findMany({
        select: { kind: true, amount: true, occurredAt: true },
        orderBy: { occurredAt: "desc" },
        take: 800,
      }),
      prisma.hotel.findMany({ orderBy: { totalRooms: "desc" } }),
      prisma.dairyBatch.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
      prisma.farm.findMany({ include: { _count: { select: { crops: true } } } }),
      prisma.program.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.futureProject.findMany({ orderBy: { budgetJod: "desc" }, take: 8 }),
      prismaUnscoped.user.findMany({
        where: { companyId: workspaceId },
        select: { name: true, role: true, title: true, rank: true },
        orderBy: { xp: "desc" },
      }),
    ]);

  const sector = company.sector;

  return (
    <PageContainer>
      <div className="space-y-6 pb-10">
        <WorkspaceHero
          ar={ar}
          code={company.code}
          name={company.name}
          nameEn={company.nameEn}
          sector={company.sector}
          status={company.status}
          city={company.city}
          country={company.country}
          foundedYear={company.foundedYear}
          employees={company.employees}
          ticker={company.ticker}
          description={company.description}
          dateLabel={dateLabel}
        />

        <HeritageSection
          eyebrow={
            ar
              ? "نفس حساب لوحة المجموعة والمالية — الأرقام متطابقة"
              : "Same math as the group dashboard & finance"
          }
          title={ar ? "القيادة المالية" : "Financial command"}
        >
          <WorkspaceFinancials ar={ar} txns={txns} />
        </HeritageSection>

        <HeritageSection
          eyebrow={
            ar ? "تفصيل خاص بنشاط هذه الوحدة" : "Specific to this unit's activity"
          }
          title={ar ? "العمليات التشغيلية" : "Operations"}
        >
          <SectorOps
            ar={ar}
            sector={sector}
            hotels={hotels}
            batches={batches}
            farms={farms}
            programs={programs}
          />
        </HeritageSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <HeritageSection
            title={ar ? "خط مشاريع المستقبل" : "Future-projects pipeline"}
          >
            {projects.length === 0 ? (
              <Empty ar={ar} />
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--heri-rule)" }}>
                {projects.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div
                        className="truncate text-sm font-semibold"
                        style={{ color: "var(--heri-ink)" }}
                      >
                        {p.title}
                      </div>
                      <div
                        className="heri-number-mono mt-0.5"
                        style={{ fontSize: 11, color: "var(--heri-ink-3)" }}
                      >
                        {p.startQuarter} → {p.targetQuarter} · {p.priority}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="heri-number-mono"
                        style={{ fontSize: 12, color: "var(--heri-ink)" }}
                      >
                        {formatMoney(p.budgetJod)}
                      </span>
                      <StatusBadge status={p.stage} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </HeritageSection>

          <HeritageSection title={ar ? "فريق الوحدة" : "Unit team"}>
            {team.length === 0 ? (
              <Empty ar={ar} />
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--heri-rule)" }}>
                {team.map((u, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div
                        className="truncate text-sm font-semibold"
                        style={{ color: "var(--heri-ink)" }}
                      >
                        {u.name}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "var(--heri-ink-3)" }}
                      >
                        {u.title ?? u.role}
                      </div>
                    </div>
                    <HeritagePill tone="info">{u.role}</HeritagePill>
                  </li>
                ))}
              </ul>
            )}
          </HeritageSection>
        </div>

        <HeritageSection title={ar ? "التنقل العميق" : "Drill down"}>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/finance", label: ar ? "المالية" : "Finance" },
              { href: "/hotels", label: ar ? "الفنادق" : "Hotels" },
              { href: "/dairy", label: ar ? "الألبان" : "Dairy" },
              { href: "/farms", label: ar ? "المزارع" : "Farms" },
              { href: "/education", label: ar ? "التعليم" : "Education" },
              { href: "/supply-chain", label: ar ? "سلسلة التوريد" : "Supply chain" },
              { href: "/insights", label: ar ? "إشارات الذكاء" : "AI insights" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5"
                style={{
                  background: "var(--heri-cream)",
                  border: "1px solid var(--heri-rule-strong)",
                  color: "var(--heri-ink)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {l.label}
                <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
              </Link>
            ))}
            <Link
              href="/companies"
              className="inline-flex items-center gap-1.5 px-3 py-1.5"
              style={{
                background: "var(--heri-ink)",
                color: "var(--heri-cream)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "كل الشركات" : "All companies"}
            </Link>
          </div>
        </HeritageSection>
      </div>
    </PageContainer>
  );
}

function Empty({ ar }: { ar: boolean }) {
  return (
    <div
      className="py-6 text-center"
      style={{ fontSize: 13, color: "var(--heri-ink-3)" }}
    >
      {ar ? "لا بيانات في هذه الوحدة بعد." : "No records for this unit yet."}
    </div>
  );
}

function StatTile({
  icon, label, value, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="px-4 py-3.5"
      style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)" }}
    >
      <div className="heri-eyebrow flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div
        className="font-display mt-1.5"
        style={{
          fontSize: "clamp(18px,1.6vw,24px)",
          fontWeight: 600,
          color: "var(--heri-ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div className="heri-number-mono mt-1" style={{ fontSize: 10.5, color: "var(--heri-ink-3)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function SectorOps({
  ar, sector, hotels, batches, farms, programs,
}: {
  ar: boolean;
  sector: string;
  hotels: any[];
  batches: any[];
  farms: any[];
  programs: any[];
}) {
  if (sector === "HOSPITALITY") {
    const rooms = hotels.reduce((a, h) => a + (h.totalRooms ?? 0), 0);
    const avgAdr =
      hotels.length > 0
        ? Math.round(
            hotels.reduce((a, h) => a + (h.baselineADR ?? 0), 0) / hotels.length,
          )
        : 0;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile icon={<Hotel className="h-3 w-3" />} label={ar ? "الفنادق" : "Hotels"} value={formatNumber(hotels.length)} />
          <StatTile icon={<Building2 className="h-3 w-3" />} label={ar ? "إجمالي الغرف" : "Total rooms"} value={formatNumber(rooms)} />
          <StatTile icon={<TrendingUp className="h-3 w-3" />} label={ar ? "متوسط السعر" : "Avg ADR"} value={formatMoney(avgAdr)} />
        </div>
        <ul className="divide-y" style={{ borderColor: "var(--heri-rule)" }}>
          {hotels.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
                  {ar ? h.name : h.nameEn}
                </div>
                <div className="heri-number-mono mt-0.5" style={{ fontSize: 11, color: "var(--heri-ink-3)" }}>
                  {h.city} · {formatNumber(h.totalRooms)} {ar ? "غرفة" : "rooms"} · {h.starRating}★
                </div>
              </div>
              <span className="heri-number-mono" style={{ fontSize: 12, color: "var(--heri-ink)" }}>
                {formatMoney(h.baselineADR ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (sector === "DAIRY") {
    const byStatus = batches.reduce((m: Record<string, number>, b) => {
      m[b.status] = (m[b.status] ?? 0) + 1;
      return m;
    }, {});
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile icon={<Milk className="h-3 w-3" />} label={ar ? "دفعات حديثة" : "Recent batches"} value={formatNumber(batches.length)} />
          <StatTile icon={<FlaskConical className="h-3 w-3" />} label={ar ? "حالات" : "Statuses"} value={formatNumber(Object.keys(byStatus).length)} />
          <StatTile icon={<TrendingUp className="h-3 w-3" />} label={ar ? "قيد الإنتاج" : "In production"} value={formatNumber(byStatus["IN_PRODUCTION"] ?? 0)} />
        </div>
        <ul className="divide-y" style={{ borderColor: "var(--heri-rule)" }}>
          {batches.slice(0, 14).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
                  {ar ? (b.productAr ?? b.product) : b.product}
                </div>
                <div className="heri-number-mono mt-0.5" style={{ fontSize: 11, color: "var(--heri-ink-3)" }}>
                  {b.batchNumber}
                </div>
              </div>
              <StatusBadge status={b.status} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (sector === "AGRICULTURE") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile icon={<Sprout className="h-3 w-3" />} label={ar ? "المزارع" : "Farms"} value={formatNumber(farms.length)} />
          <StatTile icon={<Sprout className="h-3 w-3" />} label={ar ? "إجمالي المحاصيل" : "Total crops"} value={formatNumber(farms.reduce((a, f) => a + (f._count?.crops ?? 0), 0))} />
        </div>
        <ul className="divide-y" style={{ borderColor: "var(--heri-rule)" }}>
          {farms.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
                  {f.name}
                </div>
                <div className="heri-number-mono mt-0.5" style={{ fontSize: 11, color: "var(--heri-ink-3)" }}>
                  {f.location} · {f.type}
                </div>
              </div>
              <HeritagePill tone="success">
                {formatNumber(f._count?.crops ?? 0)} {ar ? "محصول" : "crops"}
              </HeritagePill>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (sector === "EDUCATION") {
    return (
      <div className="space-y-4">
        <StatTile icon={<GraduationCap className="h-3 w-3" />} label={ar ? "البرامج" : "Programs"} value={formatNumber(programs.length)} />
        <ul className="divide-y" style={{ borderColor: "var(--heri-rule)" }}>
          {programs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
                  {p.name}
                </div>
                <div className="heri-number-mono mt-0.5" style={{ fontSize: 11, color: "var(--heri-ink-3)" }}>
                  {p.founder} · {p.cohort}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // INVESTMENT / TRADE / other — holding view
  return (
    <div
      className="py-6 text-center"
      style={{ fontSize: 13, color: "var(--heri-ink-3)" }}
    >
      <Briefcase className="mx-auto mb-2 h-5 w-5" strokeWidth={1.5} />
      {ar
        ? "وحدة قابضة — انظر الخط المالي وخط المشاريع أعلاه."
        : "Holding unit — see the financial command and project pipeline above."}
    </div>
  );
}
