
export const dynamic = "force-dynamic";
// Global Search — full cross-entity deep search across the entire H-Nerve ERP.
// Searches: Companies, Hotels, Bookings, Dairy batches, Farms, Crops, Programs,
// Forecasts, Insights, Tasks, Projects, Transactions, Markets, Users.
// Returns grouped results with counts, deep-link hrefs, and contextual snippets.

import Link from "next/link";
import {
  Search as SearchIcon, Building2, Hotel, Milk, Sprout, GraduationCap,
  Brain, Sparkles, ListChecks, FlaskConical, Wallet, TrendingUp, Users,
  ArrowRight, FileSearch, Wheat, BookOpen,
} from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import "../daylight.css";
import { getLocale } from "@/lib/i18n.server";
import { formatMoney, formatNumber, formatDate } from "@/lib/utils";

type ResultItem = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  trailing?: string;
};
type ResultGroup = {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: any;
  tone: string;
  items: ResultItem[];
};

const TONE: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

function highlight(text: string, q: string): React.ReactNode {
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const idx = lower.indexOf(ql);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        className="rounded-[3px] px-0.5"
        style={{ background: "var(--cream)", color: "var(--gold)" }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; group?: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";
  const q = (searchParams.q ?? "").trim();
  const groupFilter = searchParams.group;

  const groups: ResultGroup[] = [];
  let total = 0;

  if (q.length >= 1) {
    // Use SQLite-friendly contains (case-insensitive on most setups).
    const c = { contains: q };

    // Run all queries in parallel for speed.
    const [
      companies, hotels, bookings, batches, farms, crops, programs,
      forecasts, insights, tasks, projects, transactions, markets, users,
    ] = await Promise.all([
      prisma.company.findMany({
        where: {
          OR: [{ name: c }, { nameEn: c }, { code: c }, { description: c }],
        },
        take: 8,
      }),
      prisma.hotel.findMany({
        where: {
          OR: [{ name: c }, { nameEn: c }, { city: c }, { description: c }],
        },
        include: { company: true },
        take: 8,
      }),
      prisma.booking.findMany({
        where: {
          OR: [{ reference: c }, { guestName: c }, { notes: c }],
        },
        include: { hotel: true },
        take: 8,
      }),
      prisma.dairyBatch.findMany({
        where: {
          OR: [
            { batchNumber: c }, { product: c }, { productAr: c },
            { destination: c }, { notes: c },
          ],
        },
        take: 8,
      }),
      prisma.farm.findMany({
        where: {
          OR: [{ name: c }, { nameEn: c }, { location: c }, { description: c }],
        },
        take: 8,
      }),
      prisma.crop.findMany({
        where: { OR: [{ name: c }, { variety: c }, { notes: c }] },
        include: { farm: true },
        take: 8,
      }),
      prisma.program.findMany({
        where: {
          OR: [{ name: c }, { nameEn: c }, { founder: c }, { description: c }],
        },
        take: 8,
      }),
      prisma.supplyForecast.findMany({
        where: {
          deletedAt: null,
          OR: [{ productLabel: c }, { signal: c }, { category: c }],
        },
        include: { source: true, target: true },
        take: 8,
      }),
      prisma.aIInsight.findMany({
        where: {
          deletedAt: null,
          OR: [{ title: c }, { body: c }, { module: c }],
        },
        take: 8,
      }),
      prisma.task.findMany({
        where: {
          deletedAt: null,
          OR: [{ title: c }, { description: c }, { module: c }],
        },
        take: 8,
      }),
      prisma.futureProject.findMany({
        where: {
          deletedAt: null,
          OR: [{ title: c }, { description: c }, { ownerName: c }, { kpis: c }],
        },
        include: { company: true },
        take: 8,
      }),
      prisma.transaction.findMany({
        where: {
          OR: [{ reference: c }, { category: c }, { description: c }],
        },
        include: { company: true },
        take: 8,
      }),
      prisma.marketStock.findMany({
        where: {
          OR: [{ ticker: c }, { label: c }, { labelAr: c }, { exchange: c }],
        },
        take: 8,
      }),
      prisma.user.findMany({
        where: { OR: [{ name: c }, { email: c }, { title: c }] },
        take: 8,
      }),
    ]);

    if (companies.length)
      groups.push({
        key: "companies",
        labelAr: "الشركات", labelEn: "Companies",
        icon: Building2, tone: "emerald",
        items: companies.map((x) => ({
          id: x.id, href: `/companies/${x.id}`,
          title: ar ? x.name : x.nameEn || x.name,
          subtitle: `${x.code} · ${x.sector}`,
          trailing: x.country,
        })),
      });

    if (hotels.length)
      groups.push({
        key: "hotels",
        labelAr: "الفنادق", labelEn: "Hotels",
        icon: Hotel, tone: "amber",
        items: hotels.map((x) => ({
          id: x.id, href: `/hotels/${x.id}`,
          title: ar ? x.name : x.nameEn || x.name,
          subtitle: `${x.city} · ${x.tier} · ${formatNumber(x.totalRooms)} ${ar ? "غرفة" : "rooms"}`,
          trailing: x.company?.name,
        })),
      });

    if (bookings.length)
      groups.push({
        key: "bookings",
        labelAr: "الحجوزات", labelEn: "Bookings",
        icon: Hotel, tone: "amber",
        items: bookings.map((x) => ({
          id: x.id, href: `/hotels/bookings/${x.id}`,
          title: x.guestName,
          subtitle: `${x.reference} · ${x.hotel.name} · ${formatDate(x.checkIn)}`,
          trailing: formatMoney(x.revenue),
        })),
      });

    if (batches.length)
      groups.push({
        key: "dairy",
        labelAr: "دفعات الألبان", labelEn: "Dairy batches",
        icon: Milk, tone: "sky",
        items: batches.map((x) => ({
          id: x.id, href: `/dairy/${x.id}`,
          title: ar ? x.productAr : x.product,
          subtitle: `${x.batchNumber} · ${x.qualityGrade} · ${x.fatContent}% fat`,
          trailing: `${formatNumber(x.quantityLiters)} L`,
        })),
      });

    if (farms.length)
      groups.push({
        key: "farms",
        labelAr: "المزارع", labelEn: "Farms",
        icon: Sprout, tone: "emerald",
        items: farms.map((x) => ({
          id: x.id, href: `/farms/${x.id}`,
          title: ar ? x.name : x.nameEn || x.name,
          subtitle: `${x.location} · ${x.type}`,
          trailing: `${formatNumber(x.areaDunum)} ${ar ? "د" : "du"}`,
        })),
      });

    if (crops.length)
      groups.push({
        key: "crops",
        labelAr: "المحاصيل", labelEn: "Crops",
        icon: Wheat, tone: "emerald",
        items: crops.map((x) => ({
          id: x.id, href: `/farms/crops/${x.id}`,
          title: x.variety ? `${x.name} (${x.variety})` : x.name,
          subtitle: `${x.farm.name} · ${x.status}`,
          trailing: formatDate(x.expectedHarvest),
        })),
      });

    if (programs.length)
      groups.push({
        key: "programs",
        labelAr: "برامج Tank", labelEn: "Tank programs",
        icon: GraduationCap, tone: "indigo",
        items: programs.map((x) => ({
          id: x.id, href: `/education/${x.id}`,
          title: ar ? x.name : x.nameEn || x.name,
          subtitle: `${x.founder} · ${x.vertical} · ${x.stage}`,
          trailing: formatMoney(x.fundingJod),
        })),
      });

    if (forecasts.length)
      groups.push({
        key: "forecasts",
        labelAr: "التنبؤات", labelEn: "Forecasts",
        icon: Brain, tone: "violet",
        items: forecasts.map((x) => ({
          id: x.id, href: `/supply-chain/${x.id}`,
          title: x.productLabel,
          subtitle: `${x.source.name} → ${x.target.name} · ${(x.confidence * 100).toFixed(0)}%`,
          trailing: `${formatNumber(x.predictedDemand)} ${x.unit}`,
        })),
      });

    if (insights.length)
      groups.push({
        key: "insights",
        labelAr: "الإشارات", labelEn: "Insights",
        icon: Sparkles, tone: "amber",
        items: insights.map((x) => ({
          id: x.id, href: `/insights/${x.id}`,
          title: x.title,
          subtitle: x.body.slice(0, 80) + (x.body.length > 80 ? "…" : ""),
          trailing: x.severity,
        })),
      });

    if (tasks.length)
      groups.push({
        key: "tasks",
        labelAr: "المهام", labelEn: "Tasks",
        icon: ListChecks, tone: "blue",
        items: tasks.map((x) => ({
          id: x.id, href: "/tasks",
          title: x.title,
          subtitle: `${x.module} · ${x.priority} · ${x.status}`,
          trailing: x.points ? `${x.points} XP` : undefined,
        })),
      });

    if (projects.length)
      groups.push({
        key: "projects",
        labelAr: "المشاريع", labelEn: "Projects",
        icon: FlaskConical, tone: "violet",
        items: projects.map((x) => ({
          id: x.id, href: "/projects",
          title: x.title,
          subtitle: `${x.company?.name ?? ""} · ${x.stage} · ${x.targetQuarter ?? ""}`,
          trailing: formatMoney(x.budgetJod),
        })),
      });

    if (transactions.length)
      groups.push({
        key: "transactions",
        labelAr: "المعاملات المالية", labelEn: "Transactions",
        icon: Wallet, tone: "emerald",
        items: transactions.map((x) => ({
          id: x.id, href: `/finance/${x.id}`,
          title: x.description || x.category,
          subtitle: `${x.reference} · ${x.company.name} · ${formatDate(x.occurredAt)}`,
          trailing: `${x.kind === "EXPENSE" ? "−" : ""}${formatMoney(x.amount, x.currency)}`,
        })),
      });

    if (markets.length)
      groups.push({
        key: "markets",
        labelAr: "الأسواق", labelEn: "Markets",
        icon: TrendingUp, tone: "blue",
        items: markets.map((x) => ({
          id: x.id, href: `/markets/${x.id}`,
          title: ar && x.labelAr ? x.labelAr : x.label,
          subtitle: `${x.ticker} · ${x.exchange} · ${x.region}`,
          trailing: `${x.changePct >= 0 ? "+" : ""}${x.changePct.toFixed(2)}%`,
        })),
      });

    if (users.length)
      groups.push({
        key: "users",
        labelAr: "الفريق", labelEn: "Team",
        icon: Users, tone: "rose",
        items: users.map((x) => ({
          id: x.id, href: `/users/${x.id}`,
          title: x.name,
          subtitle: `${x.email} · ${x.role}`,
          trailing: x.title ?? undefined,
        })),
      });

    total = groups.reduce((a, g) => a + g.items.length, 0);
  }

  const filtered = groupFilter
    ? groups.filter((g) => g.key === groupFilter)
    : groups;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "البحث العميق" : "Deep search"}
        title={ar ? "البحث الشامل" : "Global search"}
        subtitle={
          q
            ? ar
              ? `${formatNumber(total)} نتيجة عبر ${formatNumber(groups.length)} فئة`
              : `${formatNumber(total)} results across ${formatNumber(groups.length)} categories`
            : ar
            ? "ابحث في الشركات والحجوزات والإنتاج والإشارات والمعاملات…"
            : "Search across companies, bookings, production, insights, transactions…"
        }
      />
        {/* Search input */}
        <form action="/search" method="get" className="card card-pad">
          <div className="flex flex-wrap items-stretch gap-2">
            <div
              className="relative flex flex-1 items-center gap-2 rounded-xl px-3"
              style={{
                border: "1px solid var(--line)",
                background: "var(--cream)",
              }}
            >
              <SearchIcon
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--ink-muted)" }}
              />
              <input
                name="q"
                defaultValue={q}
                autoFocus
                placeholder={
                  ar
                    ? "اكتب اسم شركة، فندق، رقم حجز، نص إشارة…"
                    : "Type a company, hotel, booking #, insight text…"
                }
                className="w-full bg-transparent py-3 text-sm font-bold outline-none"
                style={{ color: "var(--ink)" }}
              />
              {q ? (
                <Link
                  href="/search"
                  className="rounded-md px-2 py-1 text-[11px] font-bold"
                  style={{
                    color: "var(--ink-muted)",
                    background: "color-mix(in srgb, var(--ink-muted) 12%, transparent)",
                  }}
                >
                  {ar ? "مسح" : "Clear"}
                </Link>
              ) : null}
            </div>
            <button type="submit" className="btn-primary">
              <SearchIcon className="h-4 w-4" />
              {ar ? "بحث" : "Search"}
            </button>
          </div>

          {/* Suggestion chips when empty */}
          {!q ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: "var(--ink-muted)" }}
              >
                {ar ? "اقتراحات:" : "Try:"}
              </span>
              {(ar
                ? ["أرينا", "حليب", "غسالة", "ESG", "Tank", "حجز", "تنبؤ"]
                : ["arena", "milk", "esg", "tank", "booking", "forecast"]
              ).map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="rounded-full px-3 py-1 text-[11px] font-bold ring-1 transition hover:scale-105"
                  style={{
                    background: "var(--cream)",
                    color: "var(--gold)",
                    borderColor: "var(--gold)",
                  }}
                >
                  {s}
                </Link>
              ))}
            </div>
          ) : null}
        </form>

        {/* Group filter pills */}
        {q && groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/search?q=${encodeURIComponent(q)}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 transition ${
                !groupFilter
                  ? "bg-emerald-600 text-white ring-emerald-700"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {ar ? "الكل" : "All"}
              <span className="font-mono opacity-80">{formatNumber(total)}</span>
            </Link>
            {groups.map((g) => {
              const Icon = g.icon;
              const active = groupFilter === g.key;
              return (
                <Link
                  key={g.key}
                  href={`/search?q=${encodeURIComponent(q)}&group=${g.key}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 transition ${
                    active
                      ? "bg-emerald-600 text-white ring-emerald-700"
                      : `${TONE[g.tone]} hover:opacity-80`
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {ar ? g.labelAr : g.labelEn}
                  <span className="font-mono opacity-80">
                    {formatNumber(g.items.length)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}

        {/* Empty / no results states */}
        {!q ? (
          <div className="card card-pad py-12 text-center">
            <FileSearch
              className="mx-auto mb-3 h-12 w-12"
              style={{ color: "var(--ink-muted)" }}
            />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {ar ? "ابحث في كل شيء" : "Search everything"}
            </h3>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--ink-muted)" }}
            >
              {ar
                ? "محرك بحث موحّد عبر 14 جدول بيانات في النظام."
                : "Unified search across 14 data tables in the system."}
            </p>
            <div className="mx-auto mt-4 grid max-w-xl grid-cols-3 gap-2 sm:grid-cols-7">
              {[
                Building2, Hotel, Milk, Sprout, Brain, Sparkles, Wallet,
              ].map((Icon, i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-xl ring-1"
                  style={{
                    background: "var(--cream)",
                    borderColor: "var(--line)",
                  }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: "var(--gold)" }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="card card-pad py-12 text-center">
            <FileSearch
              className="mx-auto mb-3 h-12 w-12"
              style={{ color: "var(--ink-muted)" }}
            />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {ar ? `لا نتائج لـ "${q}"` : `No results for "${q}"`}
            </h3>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--ink-muted)" }}
            >
              {ar
                ? "جرّب كلمات مفتاحية أخرى أو رقم مرجعي أو اسم ضيف."
                : "Try different keywords, a reference number, or a guest name."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((g) => {
              const Icon = g.icon;
              return (
                <section key={g.key} className="card card-pad">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${TONE[g.tone]}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--ink)" }}
                        >
                          {ar ? g.labelAr : g.labelEn}
                        </h3>
                        <p
                          className="text-[10.5px]"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          {ar
                            ? `${formatNumber(g.items.length)} نتيجة`
                            : `${formatNumber(g.items.length)} match${g.items.length === 1 ? "" : "es"}`}
                        </p>
                      </div>
                    </div>
                    {!groupFilter ? (
                      <Link
                        href={`/search?q=${encodeURIComponent(q)}&group=${g.key}`}
                        className="btn-ghost btn-sm"
                      >
                        {ar ? "تصفية" : "Focus"}
                        <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                      </Link>
                    ) : null}
                  </div>
                  <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {g.items.map((it) => (
                      <li key={it.id}>
                        <Link
                          href={it.href}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-[var(--cream)]"
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className="line-clamp-1 text-[13px] font-bold"
                              style={{ color: "var(--ink)" }}
                            >
                              {highlight(it.title, q)}
                            </div>
                            {it.subtitle ? (
                              <div
                                className="line-clamp-1 text-[11px]"
                                style={{ color: "var(--ink-muted)" }}
                              >
                                {highlight(it.subtitle, q)}
                              </div>
                            ) : null}
                          </div>
                          {it.trailing ? (
                            <span
                              className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold tabular-nums"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--ink-muted) 12%, transparent)",
                                color: "var(--ink)",
                              }}
                            >
                              {it.trailing}
                            </span>
                          ) : null}
                          <ArrowRight
                            className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5 rtl:rotate-180"
                            style={{ color: "var(--ink-muted)" }}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {q ? (
          <p
            className="text-center text-[10.5px]"
            style={{ color: "var(--ink-muted)" }}
          >
            {ar
              ? "كل فئة تعرض حتى 8 نتائج. ضيّق الكلمة المفتاحية لنتائج أدق."
              : "Each category shows up to 8 results. Narrow your query for finer matches."}
          </p>
        ) : null}
    </DaylightShell>
  );
}
