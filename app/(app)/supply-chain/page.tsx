// /supply-chain — predictive supply chain bridge.
// Claude Design "daylight" port: reference HTML structure (sec-head + sk-wrap +
// panel/fc-card), CSS scoped under .dl-page. Prisma queries & server actions
// are unchanged from the previous DaylightShell version.

import Link from "next/link";
import { Sankey, type SankeyNode, type SankeyLink } from "@/components/charts/Sankey";
import { ForecastExplainer } from "@/components/ForecastExplainer";
import { ExportMenu } from "@/components/ExportMenu";
import { DeleteButton } from "@/components/DeleteButton";
import { DaylightShell } from "@/components/orrery/daylight";
import { ForecastCardClient } from "./ForecastCardClient";
import { getCompanyBrand } from "@/lib/utils/companyBrand";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { formatNumber, formatPercent, formatShortDate, localizeUnit } from "@/lib/utils/utils";
import "../daylight.css";
import "./supply.css";
import {
  autoGenerateForecasts, deleteForecast, setForecastStatus,
  approveForecast, rejectForecast,
} from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, { ar: string; en: string }> = {
  DAIRY:    { ar: "ألبان", en: "Dairy" },
  PRODUCE:  { ar: "خضروات", en: "Produce" },
  MEAT:     { ar: "لحوم", en: "Meat" },
  BAKERY:   { ar: "مخبوزات", en: "Bakery" },
  BEVERAGE: { ar: "مشروبات", en: "Beverage" },
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  DRAFT:     { ar: "مسودة", en: "Draft" },
  APPROVED:  { ar: "معتمد", en: "Approved" },
  EXECUTED:  { ar: "منفّذ", en: "Executed" },
  DISMISSED: { ar: "مرفوض", en: "Dismissed" },
};

// Confidence ring — mirrors the ring() helper in supply-ops.js.
function ConfidenceRing({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 18;
  const off = C * (1 - pct / 100);
  return (
    <svg width="46" height="46">
      <circle cx="23" cy="23" r="18" fill="none" stroke="rgba(46,107,87,.15)" strokeWidth="4.5" />
      <circle
        cx="23" cy="23" r="18" fill="none" stroke="#C2A35A" strokeWidth="4.5"
        strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
      />
    </svg>
  );
}

export default async function SupplyChainPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const forecasts = await prisma.supplyForecast.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { periodStart: "asc" }],
    include: {
      source: true,
      target: true,
      generatedBy: true,
      sourcedPO: { select: { id: true, poNumber: true, supplierRef: { select: { name: true } } } },
    },
  });

  const drafts = forecasts.filter((f) => f.status === "DRAFT").length;

  // Sankey data
  const sourceCompanies = new Map<string, { id: string; name: string; nameEn: string; code: string }>();
  const targetCompanies = new Map<string, { id: string; name: string; nameEn: string; code: string }>();
  const categorySet = new Set<string>();
  for (const f of forecasts) {
    sourceCompanies.set(f.sourceCompanyId, {
      id: f.sourceCompanyId, name: f.source.name, nameEn: f.source.nameEn, code: f.source.code,
    });
    targetCompanies.set(f.targetCompanyId, {
      id: f.targetCompanyId, name: f.target.name, nameEn: f.target.nameEn, code: f.target.code,
    });
    categorySet.add(f.category);
  }

  const sankeyNodes: SankeyNode[] = [
    ...[...sourceCompanies.values()].map((c) => ({
      id: `src-${c.id}`,
      label: ar ? c.name : c.nameEn,
      column: 0,
      color: getCompanyBrand(c.code).accent,
    })),
    ...[...categorySet].map((cat) => ({
      id: `cat-${cat}`,
      label: ar ? CATEGORY_LABEL[cat]?.ar ?? cat : CATEGORY_LABEL[cat]?.en ?? cat,
      column: 1,
      color: "var(--gold)",
    })),
    ...[...targetCompanies.values()].map((c) => ({
      id: `tgt-${c.id}`,
      label: ar ? c.name : c.nameEn,
      column: 2,
      color: getCompanyBrand(c.code).accent,
    })),
  ];

  const srcCatFlow = new Map<string, number>();
  const catTgtFlow = new Map<string, number>();
  for (const f of forecasts) {
    const k1 = `src-${f.sourceCompanyId}|cat-${f.category}`;
    const k2 = `cat-${f.category}|tgt-${f.targetCompanyId}`;
    srcCatFlow.set(k1, (srcCatFlow.get(k1) ?? 0) + f.predictedDemand);
    catTgtFlow.set(k2, (catTgtFlow.get(k2) ?? 0) + f.predictedDemand);
  }
  const sankeyLinks: SankeyLink[] = [
    ...[...srcCatFlow.entries()].map(([k, v]) => {
      const [source, target] = k.split("|");
      return { source, target, value: v };
    }),
    ...[...catTgtFlow.entries()].map(([k, v]) => {
      const [source, target] = k.split("|");
      return { source, target, value: v };
    }),
  ];

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      {/* ── header ── */}
      <div className="sec-head reveal">
        <div>
          <div className="sec-eyebrow">
            <span className="tick" />
            {ar ? "القطاعات · اللوجستيات" : "Sectors · Logistics"}
          </div>
          <h1 className="sec-title">
            {ar ? "سلسلة التوريد التنبّؤية" : "Predictive supply chain"}
          </h1>
          <p className="sec-sub">
            {ar
              ? "جسر التوريد بين وحدات المجموعة — يتنبّأ الدماغ بالتدفّقات، وأنت تعتمد أو ترفض."
              : "The supply bridge across group units — the Brain forecasts the flows, and you approve or reject."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status">
            <span className="dot" />
            {ar
              ? `مباشر · ${formatNumber(drafts)} تنبؤات معلّقة`
              : `Live · ${formatNumber(drafts)} pending forecasts`}
          </span>
          <div className="sec-actions">
            <Link href="/supply-chain/new" className="dl-btn dl-btn-secondary" style={{ textDecoration: "none" }}>
              {ar ? "تنبؤ يدوي" : "Manual forecast"}
            </Link>
            <ExportMenu type="supply-chain" locale={lc} />
            <form action={autoGenerateForecasts}>
              <button type="submit" className="dl-btn dl-btn-secondary">
                {ar ? "توليد تلقائي" : "Auto-generate"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── sankey flow ── */}
      {forecasts.length > 0 ? (
        <div className="sk-wrap reveal">
          <div className="panel-head" style={{ marginBottom: 6 }}>
            <span className="panel-title">{ar ? "تدفّق التوريد" : "Supply flow"}</span>
            <span className="panel-aside">
              {ar ? "المصادر ← الفئات ← الوجهات" : "Sources → categories → destinations"}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <Sankey nodes={sankeyNodes} links={sankeyLinks} width={800} height={260} />
          </div>
        </div>
      ) : null}

      {/* ── forecasts ── */}
      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "التنبؤات" : "Forecasts"}</span>
          <span className="panel-aside">
            {ar
              ? "انقر بطاقة لشرح الدماغ · اعتمد أو ارفض"
              : "Click a card for the Brain's explanation · approve or reject"}
          </span>
        </div>

        <div id="forecasts">
          {forecasts.length === 0 ? (
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>
              {ar
                ? "لم يصدر أي تنبؤ بعد. شغّل التوليد التلقائي أو سجّل تنبؤاً يدوياً."
                : "No forecasts yet. Run auto-generate or register a manual forecast."}
            </p>
          ) : (
            forecasts.map((f) => (
              <ForecastCard key={f.id} forecast={f} ar={ar} lc={lc} />
            ))
          )}
        </div>
      </div>
    </DaylightShell>
  );
}

/* ── Forecast card — reference .fc-card structure ───────────────── */

function ForecastCard({ forecast: f, ar, lc }: { forecast: any; ar: boolean; lc: "ar" | "en" }) {
  const sourceBrand = getCompanyBrand(f.source.code);
  const targetBrand = getCompanyBrand(f.target.code);
  const catLabel = CATEGORY_LABEL[f.category]
    ? ar ? CATEGORY_LABEL[f.category].ar : CATEGORY_LABEL[f.category].en
    : f.category;
  const confPct = Math.round(f.confidence * 100);

  const title = ar
    ? `${f.productLabel}: ${f.source.name} ← ${f.target.name}`
    : `${f.productLabelEn || f.productLabel}: ${f.source.nameEn} ← ${f.target.nameEn}`;

  const ring = (
    <>
      <ConfidenceRing pct={confPct} />
      <span className="v">{formatPercent(f.confidence, 0)}</span>
    </>
  );

  const meta = (
    <>
      <span className="tag gold">{catLabel}</span>
      <span>
        {(ar ? "الكمية " : "Qty ") + formatNumber(f.predictedDemand) + " " + localizeUnit(f.unit, ar)}
      </span>
      {f.sourcedPO ? (
        <Link
          href={`/admin/purchase-orders?po=${encodeURIComponent(f.sourcedPO.poNumber)}`}
          style={{ color: "var(--gold)", textDecoration: "none", fontFamily: "'JetBrains Mono',ui-monospace,monospace" }}
        >
          {f.sourcedPO.poNumber} → {f.sourcedPO.supplierRef?.name ?? (ar ? f.target.name : f.target.nameEn)}
        </Link>
      ) : (
        <span style={{ color: "var(--gold)" }}>{ar ? "▾ يوضّح الدماغ" : "▾ Brain explains"}</span>
      )}
    </>
  );

  // Actions: pending (DRAFT) → approve / reject buttons; otherwise a status pill.
  const actions =
    f.status === "DRAFT" ? (
      <div className="fc-actions">
        <form action={approveForecast}>
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="status" value="APPROVED" />
          <button type="submit" className="fc-btn fc-approve">{ar ? "يعتمد" : "Approve"}</button>
        </form>
        <form action={rejectForecast}>
          <input type="hidden" name="id" value={f.id} />
          <input type="hidden" name="status" value="DISMISSED" />
          <button type="submit" className="fc-btn fc-reject">{ar ? "يرفض" : "Reject"}</button>
        </form>
      </div>
    ) : f.status === "DISMISSED" ? (
      <span className="fc-status no">{ar ? STATUS_LABEL.DISMISSED.ar : STATUS_LABEL.DISMISSED.en}</span>
    ) : (
      <span className="fc-status ok">{ar ? STATUS_LABEL[f.status].ar : STATUS_LABEL[f.status].en}</span>
    );

  const accentSource = `color-mix(in srgb, ${sourceBrand.accent} 14%, transparent)`;
  const accentTarget = `color-mix(in srgb, ${targetBrand.accent} 14%, transparent)`;

  const explain = (
    <>
      <div className="eb">{ar ? "لماذا تنبّأ الدماغ بهذا؟" : "Why did the Brain forecast this?"}</div>
      <div
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12 }}
      >
        <span style={{ padding: "3px 10px", borderRadius: 999, background: accentSource, color: sourceBrand.accent, fontWeight: 700 }}>
          {sourceBrand.emblem} {ar ? f.source.name : f.source.nameEn}
        </span>
        <span style={{ color: "var(--ink-muted)" }}>→</span>
        <span style={{ padding: "3px 10px", borderRadius: 999, background: accentTarget, color: targetBrand.accent, fontWeight: 700 }}>
          {targetBrand.emblem} {ar ? f.target.name : f.target.nameEn}
        </span>
        <span style={{ color: "var(--ink-muted)" }}>
          {formatShortDate(f.periodStart)} → {formatShortDate(f.periodEnd)}
        </span>
      </div>
      <p style={{ margin: "0 0 12px" }}>
        <b>{ar ? "إشارة H-Nerve: " : "H-Nerve signal: "}</b>
        {f.signal}
      </p>
      <ForecastExplainer
        signal={f.signal}
        predictedDemand={f.predictedDemand}
        unit={localizeUnit(f.unit, ar)}
        confidence={f.confidence}
        productLabel={ar ? f.productLabel : (f.productLabelEn || f.productLabel)}
        sourceCompany={ar ? f.source.name : f.source.nameEn}
        targetCompany={ar ? f.target.name : f.target.nameEn}
        category={catLabel}
        locale={lc}
      />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(["DRAFT", "APPROVED", "EXECUTED", "DISMISSED"] as const).map((s) => {
            const act =
              s === "APPROVED" && f.status === "DRAFT"
                ? approveForecast
                : s === "DISMISSED"
                  ? rejectForecast
                  : setForecastStatus;
            return s === f.status ? null : (
              <form key={s} action={act}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="status" value={s} />
                <button type="submit" className="dl-btn dl-btn-secondary" style={{ padding: "5px 12px", fontSize: 11.5 }}>
                  {ar ? STATUS_LABEL[s].ar : STATUS_LABEL[s].en}
                </button>
              </form>
            );
          })}
        </div>
        <DeleteButton
          softDelete
          action={deleteForecast}
          payload={{ id: f.id }}
          label={ar ? "حذف التنبؤ" : "Delete forecast"}
        />
      </div>
    </>
  );

  return (
    <ForecastCardClient
      status={f.status}
      ring={ring}
      title={title}
      meta={meta}
      actions={actions}
      explain={explain}
    />
  );
}
