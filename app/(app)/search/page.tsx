export const dynamic = "force-dynamic";
// Global Search — full cross-entity deep search across the entire H-Nerve ERP.
// Searches: Companies, Hotels, Bookings, Dairy batches, Farms, Crops, Programs,
// Forecasts, Insights, Tasks, Projects, Transactions, Markets, Users.
// Returns grouped results with counts, deep-link hrefs, and contextual snippets.
// Ported to the Heritage Luxury "daylight" register — markup mirrors
// docs/design/system/sections/search.html (.sec-head + .srch-box + .srch-pills
// + .br-row result rows). Real data is fed by the Prisma queries below.

import Link from "next/link";
import { prisma } from "@/lib/db";
import "../daylight.css";
import "./search.css";
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
  items: ResultItem[];
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
        style={{ background: "var(--ivory)", color: "var(--gold)" }}
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
        items: forecasts.map((x) => ({
          id: x.id, href: `/supply-chain/${x.id}`,
          title: ar ? x.productLabel : (x.productLabelEn || x.productLabel),
          subtitle: `${x.source.name} → ${x.target.name} · ${(x.confidence * 100).toFixed(0)}%`,
          trailing: `${formatNumber(x.predictedDemand)} ${x.unit}`,
        })),
      });

    if (insights.length)
      groups.push({
        key: "insights",
        labelAr: "الإشارات", labelEn: "Insights",
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
    <div className="dl-page" dir={ar ? "rtl" : "ltr"}>
      <div className="sec-head reveal">
        <div>
          <div className="sec-eyebrow">
            <span className="tick" />
            {ar ? "النظام · البحث" : "System · Search"}
          </div>
          <h1 className="sec-title">{ar ? "البحث الشامل" : "Global search"}</h1>
          <p className="sec-sub">
            {q
              ? ar
                ? `${formatNumber(total)} نتيجة عبر ${formatNumber(groups.length)} فئة`
                : `${formatNumber(total)} results across ${formatNumber(groups.length)} categories`
              : ar
              ? "ابحث عبر الشركات، الفنادق، الغرف، الحجوزات، الدفعات، المزارع، والمحاصيل."
              : "Search across companies, hotels, rooms, bookings, batches, farms, and crops."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "مباشر" : "Live"}</span>
        </div>
      </div>

      {/* Search box */}
      <form action="/search" method="get" className="reveal">
        <div className="srch-box">
          <span className="ic">⌕</span>
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder={
              ar
                ? "اكتب اسم شركة، فندق، رقم حجز، نص إشارة…"
                : "Type a company, hotel, booking #, insight text…"
            }
          />
        </div>
      </form>

      {/* Filter pills */}
      {q && groups.length > 0 ? (
        <div className="srch-pills reveal">
          <Link
            href={`/search?q=${encodeURIComponent(q)}`}
            className={`pill${!groupFilter ? " on" : ""}`}
          >
            {ar ? "الكل" : "All"} {formatNumber(total)}
          </Link>
          {groups.map((g) => (
            <Link
              key={g.key}
              href={`/search?q=${encodeURIComponent(q)}&group=${g.key}`}
              className={`pill${groupFilter === g.key ? " on" : ""}`}
            >
              {ar ? g.labelAr : g.labelEn} {formatNumber(g.items.length)}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Results / empty states */}
      <div id="results">
        {!q ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-muted)", opacity: 0.6 }}>
            {ar ? "اكتب للبحث عبر كل الكيانات" : "Type to search across every entity"}
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-muted)" }}>
            {ar ? `لا نتائج مطابقة لـ "${q}"` : `No results matching "${q}"`}
          </div>
        ) : (
          filtered.map((g) =>
            g.items.map((it) => (
              <Link key={`${g.key}-${it.id}`} href={it.href} className="br-row">
                <span className="ops-tag info">{ar ? g.labelAr : g.labelEn}</span>
                <div className="rt">
                  <div className="tt">{highlight(it.title, q)}</div>
                  {it.subtitle ? (
                    <div className="ts">{highlight(it.subtitle, q)}</div>
                  ) : null}
                </div>
                {it.trailing ? <span className="ts">{it.trailing}</span> : null}
                <span className="go">{ar ? "←" : "→"}</span>
              </Link>
            )),
          )
        )}
      </div>
    </div>
  );
}
