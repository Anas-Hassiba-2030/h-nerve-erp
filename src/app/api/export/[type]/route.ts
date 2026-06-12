import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/db";
import { getCurrentUser } from "@/lib/auth/session";
import { COMPANY_BRANDS, PERSONAL_BRANDS } from "@/lib/utils/companyBrand";
import {
  financeAnalytics, hotelsAnalytics, dairyAnalytics, farmsAnalytics,
  supplyAnalytics, sustainabilityAnalytics, projectsAnalytics, marketsAnalytics,
  type ExportAnalytics,
} from "@/lib/export/exportAnalytics";

// Branded CSV exports — header carries Hourani Group + H-Nerve marks.
// Each module uses its own company emblem in the banner, plus an embedded
// "Executive summary" block of KPIs + analyst commentary so anyone opening
// the file in Excel sees the analysis before the raw data.

function csvEscape(v: any): string {
  if (v == null) return "";
  let s = String(v);
  // Neutralize spreadsheet formula injection: a cell starting with = + - @ (or
  // tab/CR) is evaluated as a formula by Excel/Sheets. Prefix such cells with a
  // single quote so they're treated as text — but leave plain numbers alone so
  // negative figures still sum correctly in the exported sheet.
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(s);
  if (!isPlainNumber && /^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function pad(s: string, n: number): string {
  // Account for unicode width — naïve, but good enough for ASCII frames.
  const len = [...s].length;
  if (len >= n) return s;
  return s + " ".repeat(n - len);
}

function bannerLines(brandKey: string, title: string, recordCount: number, locale: string): string[] {
  const brand = COMPANY_BRANDS[brandKey] ?? COMPANY_BRANDS.HH;
  const now = new Date();
  const ar = locale === "ar";
  const reportId = `HN-${brandKey}-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const W = 76;
  const fill = "═".repeat(W - 2);
  return [
    `# ╔${fill}╗`,
    `# ║ ${pad(`H-NERVE ERP  ·  ${brand.nameEn}`, W - 4)} ║`,
    `# ║ ${pad(brand.name, W - 4)} ║`,
    `# ╠${fill}╣`,
    `# ║ ${pad(`Report   : ${title}`, W - 4)} ║`,
    `# ║ ${pad(`Issued   : ${now.toISOString()}`, W - 4)} ║`,
    `# ║ ${pad(`Records  : ${recordCount.toLocaleString("en-US")}`, W - 4)} ║`,
    `# ║ ${pad(`Report-ID: ${reportId}`, W - 4)} ║`,
    `# ║ ${pad(`Brand    : ${brand.emblem} ${brand.emblemSymbol ?? ""}  ${brand.motto.slice(0, 50)}`, W - 4)} ║`,
    `# ╠${fill}╣`,
    `# ║ ${pad("Powered by H-Nerve · Anas MK Hasiba", W - 4)} ║`,
    `# ║ ${pad(`${PERSONAL_BRANDS.ANAS_AI.nameEn} · ${PERSONAL_BRANDS.HASIBA_G.nameEn}`, W - 4)} ║`,
    `# ║ ${pad(ar ? "تقرير سرّي · للقيادة التنفيذية فقط" : "Confidential · For executive leadership only", W - 4)} ║`,
    `# ╚${fill}╝`,
    "",
  ];
}

function analyticsLines(analytics: ExportAnalytics, locale: string): string[] {
  const ar = locale === "ar";
  const W = 76;
  const fill = "─".repeat(W - 2);
  const lines: string[] = [];
  lines.push(`# ┌${fill}┐`);
  lines.push(`# │ ${pad(ar ? "الموجز التنفيذي · KPIs" : "EXECUTIVE SUMMARY · KPIs", W - 4)} │`);
  lines.push(`# ├${fill}┤`);
  // KPIs in pairs to fit the frame
  for (const k of analytics.kpis) {
    const label = ar ? k.label_ar : k.label_en;
    const delta = k.delta
      ? `   (${k.delta.positive ? "+" : "-"}${(Math.abs(k.delta.pct) * 100).toFixed(1)}%)`
      : "";
    lines.push(`# │ ${pad(`▸ ${label}: ${k.value}${delta}`, W - 4)} │`);
  }
  lines.push(`# ├${fill}┤`);
  lines.push(`# │ ${pad(ar ? "ملاحظة المحلل" : "ANALYST NOTE", W - 4)} │`);
  // Wrap commentary across multiple lines
  const commentary = ar ? analytics.commentary_ar : analytics.commentary_en;
  const wrap = (s: string, max: number): string[] => {
    const words = s.split(" ");
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > max) {
        if (cur) out.push(cur.trim());
        cur = w;
      } else {
        cur += " " + w;
      }
    }
    if (cur) out.push(cur.trim());
    return out;
  };
  for (const ln of wrap(commentary, W - 6)) {
    lines.push(`# │ ${pad(ln, W - 4)} │`);
  }

  // Distribution preview
  if (analytics.distribution && analytics.distribution.buckets.length) {
    lines.push(`# ├${fill}┤`);
    lines.push(`# │ ${pad(ar ? analytics.distribution.title_ar : analytics.distribution.title_en, W - 4)} │`);
    const total = analytics.distribution.buckets.reduce((a, b) => a + Math.abs(b.value), 0);
    for (const b of analytics.distribution.buckets.slice(0, 5)) {
      const pct = total > 0 ? (Math.abs(b.value) / total) * 100 : 0;
      const filled = Math.max(0, Math.min(20, Math.round((pct / 100) * 20)));
      const bar = "█".repeat(filled) + "░".repeat(20 - filled);
      lines.push(
        `# │ ${pad(`  ${b.label.padEnd(16, " ").slice(0, 16)}  ${bar}  ${pct.toFixed(1).padStart(5, " ")}%`, W - 4)} │`,
      );
    }
  }
  lines.push(`# └${fill}┘`);
  lines.push("");
  return lines;
}

export async function GET(req: NextRequest, props: { params: Promise<{ type: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") ?? "ar";
  const companyCode = url.searchParams.get("company") ?? "HH";
  const type = params.type;

  let title = "Export";
  let header: string[] = [];
  let rows: string[] = [];
  let analytics: ExportAnalytics | null = null;

  switch (type) {
    case "finance": {
      title = "Finance — Transactions";
      const tx = await prisma.transaction.findMany({
        orderBy: { occurredAt: "desc" },
        include: { company: true, createdBy: true },
        take: 1000,
      });
      analytics = financeAnalytics(tx as any);
      header = ["Reference", "Date", "Company", "Kind", "Category", "Amount", "Currency", "Description", "By"];
      rows = tx.map((t) =>
        [t.reference, t.occurredAt.toISOString().slice(0, 10), t.company.name, t.kind, t.category,
         t.amount, t.currency, t.description ?? "", t.createdBy?.name ?? ""].map(csvEscape).join(",")
      );
      break;
    }
    case "hotels": {
      title = "Hotels & Bookings";
      const bookings = await prisma.booking.findMany({
        orderBy: { checkIn: "desc" },
        include: { hotel: { include: { company: true } } },
        take: 1000,
      });
      analytics = hotelsAnalytics(bookings as any);
      header = ["Reference", "Hotel", "Company", "Guest", "RoomType", "Rooms", "CheckIn", "CheckOut", "Revenue", "Status"];
      rows = bookings.map((b) =>
        [b.reference, b.hotel.name, b.hotel.company.name, b.guestName, b.roomType, b.rooms,
         b.checkIn.toISOString().slice(0, 10), b.checkOut.toISOString().slice(0, 10), b.revenue, b.status].map(csvEscape).join(",")
      );
      break;
    }
    case "dairy": {
      title = "Dairy Production";
      const batches = await prisma.dairyBatch.findMany({
        orderBy: { productionDate: "desc" },
        include: { company: true },
      });
      analytics = dairyAnalytics(batches as any);
      header = ["BatchNumber", "Product", "Quantity_Liters", "Quality", "Fat%", "ProductionDate", "ExpiryDate", "Destination", "Status"];
      rows = batches.map((b) =>
        [b.batchNumber, b.productAr, b.quantityLiters, b.qualityGrade, b.fatContent,
         b.productionDate.toISOString().slice(0, 10), b.expiryDate.toISOString().slice(0, 10),
         b.destination ?? "", b.status].map(csvEscape).join(",")
      );
      break;
    }
    case "farms": {
      title = "Farms & Crops";
      const farms = await prisma.farm.findMany({ include: { company: true, crops: true } });
      analytics = farmsAnalytics(farms as any);
      header = ["Farm", "Company", "Type", "Location", "AreaDunum", "TempC", "Humidity%", "SoilMoisture%", "AlertLevel", "CropCount"];
      rows = farms.map((f) =>
        [f.name, f.company.name, f.type, f.location, f.areaDunum, f.tempC ?? "", f.humidity ?? "", f.soilMoisture ?? "", f.alertLevel, f.crops.length].map(csvEscape).join(",")
      );
      break;
    }
    case "supply-chain": {
      title = "Predictive Supply Chain";
      const fc = await prisma.supplyForecast.findMany({
        where: { deletedAt: null },
        orderBy: { periodStart: "asc" },
        include: { source: true, target: true },
      });
      analytics = supplyAnalytics(fc as any);
      header = ["From", "To", "Category", "Product", "Demand", "Unit", "Confidence", "PeriodStart", "PeriodEnd", "Status", "Signal"];
      rows = fc.map((f) =>
        [f.source.name, f.target.name, f.category, f.productLabel, f.predictedDemand, f.unit, f.confidence,
         f.periodStart.toISOString().slice(0, 10), f.periodEnd.toISOString().slice(0, 10), f.status, f.signal].map(csvEscape).join(",")
      );
      break;
    }
    case "sustainability": {
      title = "Sustainability & ESG";
      const scores = await prisma.sustainabilityScore.findMany({
        orderBy: [{ year: "asc" }, { period: "asc" }],
        include: { company: true },
      });
      analytics = sustainabilityAnalytics(scores as any);
      header = ["Company", "Year", "Period", "Environmental", "Social", "Governance", "Overall", "CarbonTons", "WaterCubicM", "RenewablePct"];
      rows = scores.map((s) =>
        [s.company.name, s.year, s.period, s.environmentalScore, s.socialScore, s.governanceScore,
         s.overall, s.carbonTons, s.waterCubicM, s.renewablePct].map(csvEscape).join(",")
      );
      break;
    }
    case "projects": {
      title = "Future Projects Pipeline";
      const projs = await prisma.futureProject.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        include: { company: true },
      });
      analytics = projectsAnalytics(projs as any);
      header = ["Company", "Title", "Stage", "Priority", "Budget_JOD", "StartQuarter", "TargetQuarter", "Progress%", "Owner"];
      rows = projs.map((p) =>
        [p.company.name, p.title, p.stage, p.priority, p.budgetJod, p.startQuarter ?? "", p.targetQuarter ?? "", p.progressPct, p.ownerName ?? ""].map(csvEscape).join(",")
      );
      break;
    }
    case "markets": {
      title = "Global Markets — Watchlist";
      const stocks = await prisma.marketStock.findMany({ orderBy: { region: "asc" } });
      analytics = marketsAnalytics(stocks as any);
      header = ["Ticker", "Label", "Exchange", "Region", "LastPrice", "Currency", "Change%"];
      rows = stocks.map((s) =>
        [s.ticker, s.label, s.exchange, s.region, s.lastPrice, s.currency, s.changePct].map(csvEscape).join(",")
      );
      break;
    }
    case "activity": {
      title = "Activity Log — Audit Trail";
      const entityFilter = url.searchParams.get("entity") ?? undefined;
      const actionFilter = url.searchParams.get("action") ?? undefined;
      const where: any = {};
      if (entityFilter) where.entity = entityFilter;
      if (actionFilter) where.action = actionFilter;
      const logs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      header = ["Timestamp", "Action", "Entity", "EntityID", "Module", "Actor", "Summary", "SummaryEn"];
      rows = logs.map((l) =>
        [
          l.createdAt.toISOString(),
          l.action,
          l.entity,
          l.entityId ?? "",
          l.module ?? "",
          l.actorName ?? "",
          l.summary,
          l.summaryEn ?? "",
        ].map(csvEscape).join(",")
      );
      break;
    }
    case "all": {
      // Combined activity export — chronological event stream across modules.
      title = "H-Nerve — Group Pulse Combined";
      const [tx, bookings, batches, fc, insights] = await Promise.all([
        prisma.transaction.findMany({
          orderBy: { occurredAt: "desc" },
          include: { company: true },
          take: 500,
        }),
        prisma.booking.findMany({
          orderBy: { checkIn: "desc" },
          include: { hotel: true },
          take: 500,
        }),
        prisma.dairyBatch.findMany({
          orderBy: { productionDate: "desc" },
          take: 500,
        }),
        prisma.supplyForecast.findMany({
          where: { deletedAt: null },
          include: { source: true, target: true },
          take: 500,
        }),
        prisma.aIInsight.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ]);
      header = ["Module", "Date", "Reference", "Entity", "Detail", "Amount", "Status"];
      const lines: Array<[string, string, string, string, string, number | string, string]> = [];
      for (const t of tx) lines.push(["FINANCE", t.occurredAt.toISOString().slice(0, 10), t.reference, t.company.name, t.category, t.amount, t.kind]);
      for (const b of bookings) lines.push(["HOTELS", b.checkIn.toISOString().slice(0, 10), b.reference, b.hotel.name, b.guestName, b.revenue, b.status]);
      for (const ba of batches) lines.push(["DAIRY", ba.productionDate.toISOString().slice(0, 10), ba.batchNumber, ba.product, `${ba.qualityGrade} grade · ${ba.fatContent}% fat`, ba.quantityLiters, ba.status]);
      for (const f of fc) lines.push(["SUPPLY", f.periodStart.toISOString().slice(0, 10), f.id.slice(0, 8), `${f.source.name} → ${f.target.name}`, f.productLabel, f.predictedDemand, f.status]);
      for (const i of insights) lines.push(["INSIGHT", i.createdAt.toISOString().slice(0, 10), i.id.slice(0, 8), i.module, i.title, "", i.severity]);
      lines.sort((a, b) => (a[1] < b[1] ? 1 : -1));
      rows = lines.map((l) => l.map(csvEscape).join(","));
      // No analytics — combined CSV is a flat stream by design.
      break;
    }
    case "companies": {
      title = "Companies — Group Portfolio";
      const companies = await prisma.company.findMany({ orderBy: { code: "asc" } });
      header = ["Code", "Name", "NameEn", "Sector", "City", "Employees", "Status", "Founded"];
      rows = companies.map((c) =>
        [c.code, c.name, c.nameEn, c.sector, c.city ?? "", c.employees, c.status, c.foundedYear ?? ""].map(csvEscape).join(","),
      );
      break;
    }
    case "employees": {
      title = "Team — People Directory";
      const people = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        include: { company: true },
      });
      header = ["Name", "Email", "Role", "Title", "Company", "Active", "Joined"];
      rows = people.map((u) =>
        [u.name, u.email, u.role, u.title ?? "", u.company?.name ?? "", u.active ? "yes" : "no", u.createdAt.toISOString().slice(0, 10)].map(csvEscape).join(","),
      );
      break;
    }
    case "education": {
      title = "Incubator Programs";
      const programs = await prisma.program.findMany({
        orderBy: { createdAt: "desc" },
        include: { company: true },
      });
      header = ["Program", "Company", "Founder", "Vertical", "Stage", "Cohort", "Funding_JOD", "TeamSize"];
      rows = programs.map((p) =>
        [p.name, p.company.name, p.founder, p.vertical, p.stage, p.cohort, p.fundingJod, p.teamSize].map(csvEscape).join(","),
      );
      break;
    }
    default:
      return new NextResponse("Unknown export type", { status: 400 });
  }

  const banner = bannerLines(companyCode, title, rows.length, locale);
  const analyticsBlock = analytics ? analyticsLines(analytics, locale) : [];
  const dataMarker = [
    `# ▼ ${locale === "ar" ? "البيانات التفصيلية تبدأ هنا" : "Detailed records begin here"} (${rows.length.toLocaleString("en-US")})`,
    "",
  ];
  const body = [...banner, ...analyticsBlock, ...dataMarker, header.join(","), ...rows].join("\n");
  // Prepend UTF-8 BOM so Excel opens Arabic correctly without manual encoding.
  const bomBody = "﻿" + body;

  return new NextResponse(bomBody, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="h-nerve-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
