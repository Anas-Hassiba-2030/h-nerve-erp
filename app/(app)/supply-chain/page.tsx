
export const dynamic = "force-dynamic";
// /supply-chain — predictive supply chain bridge. Daylight vocabulary.
// Phase NS-1: every approved forecast drafts a cross-tenant PO.

import Link from "next/link";
import {
  Brain, ArrowLeftRight, Plus, CheckCircle2, XCircle, Sparkles,
  Network, Zap, Activity, ShoppingCart,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { StatusBadge } from "@/components/StatusBadge";
import "../daylight.css";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { Sankey, type SankeyNode, type SankeyLink } from "@/components/charts/Sankey";
import { ForecastExplainer } from "@/components/ForecastExplainer";
import { ExportMenu } from "@/components/ExportMenu";
import { getCompanyBrand } from "@/lib/companyBrand";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import {
  formatNumber, formatPercent, formatShortDate,
} from "@/lib/utils";
import {
  autoGenerateForecasts, deleteForecast, setForecastStatus,
  approveForecast, rejectForecast,
} from "./actions";

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
  const approved = forecasts.filter((f) => f.status === "APPROVED").length;
  const executed = forecasts.filter((f) => f.status === "EXECUTED").length;
  const avgConfidence = forecasts.length > 0
    ? forecasts.reduce((acc, f) => acc + f.confidence, 0) / forecasts.length
    : 0;

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
      <DaylightHeader
        eyebrow={ar ? "الذكاء التشغيلي" : "Operational intelligence"}
        title={ar ? "سلسلة التوريد التنبؤية" : "Predictive supply chain"}
        subtitle={
          ar
            ? "جسر الذكاء بين شركات المجموعة — كل إشارة من فندق تتحول إلى أمر تصنيع أو حصاد."
            : "AI bridge across group companies — every hotel signal becomes a production or harvest order."
        }
      />

      {/* Bridge narrative + actions */}
      <DaylightPanel
        title={ar ? "من حجز فندقي… إلى أمر تصنيع" : "From booking… to production order"}
        aside={ar ? `${formatNumber(forecasts.length)} إشارة` : `${formatNumber(forecasts.length)} signals`}
      >
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: "var(--ink-muted)",
            maxWidth: 640,
            marginBottom: 16,
          }}
        >
          {ar
            ? "المحرك التنبؤي يقرأ كل حجز قادم في فنادق أرينا، يحسب توقعات استهلاك النزلاء، ويولّد إشارات شراء للمها ولوران قبل أن يصبح الطلب أزمة."
            : "The predictive engine reads every incoming booking at Arena hotels, models guest consumption, and pushes purchase signals to Maha and Loran before demand becomes a crisis."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <form action={autoGenerateForecasts}>
            <button type="submit" className="dl-btn dl-btn-primary" style={{ fontSize: 12 }}>
              <Zap className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "تشغيل المحرك" : "Run engine"}
            </button>
          </form>
          <Link href="/supply-chain/new" className="dl-btn dl-btn-secondary" style={{ fontSize: 12, textDecoration: "none" }}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            {ar ? "تنبؤ يدوي" : "Manual forecast"}
          </Link>
          <ExportMenu type="supply-chain" locale={lc} />
        </div>
      </DaylightPanel>

      {/* KPI band */}
      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "مسودات معلّقة" : "Drafts pending"} value={String(drafts)} hint={ar ? "تنتظر القرار" : "awaiting decision"} />
        <DaylightKpi label={ar ? "موافق عليها" : "Approved"} value={String(approved)} hint={ar ? "جاهزة للتنفيذ" : "ready to execute"} />
        <DaylightKpi label={ar ? "منفّذة" : "Executed"} value={String(executed)} hint={ar ? "تمت" : "completed"} />
        <DaylightKpi label={ar ? "متوسط الثقة" : "Avg confidence"} value={`${Math.round(avgConfidence * 100)}%`} hint={ar ? "درجة AI" : "AI score"} />
      </DaylightKpiGrid>

      {/* Sankey */}
      {forecasts.length > 0 ? (
        <DaylightPanel
          title={ar ? "جسر التوريد المرئي" : "Visual supply bridge"}
          aside={ar ? "المصدر ← الفئة ← الهدف (السُّمك ∝ الكمية)" : "Source → category → target (thickness ∝ demand)"}
        >
          <Sankey nodes={sankeyNodes} links={sankeyLinks} width={1040} height={380} />
        </DaylightPanel>
      ) : null}

      {/* Forecast cards */}
      {forecasts.length === 0 ? (
        <DaylightPanel title={ar ? "لم يصدر أي تنبؤ بعد" : "No forecasts yet"}>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 12 }}>
            {ar
              ? "شغّل المحرك ليقرأ بيانات الحجوزات والإنتاج الحالية، أو سجّل تنبؤاً يدوياً."
              : "Run the engine to read current booking & production data, or register a manual forecast."}
          </p>
          <form action={autoGenerateForecasts}>
            <button type="submit" className="dl-btn dl-btn-primary">
              <Brain className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "توليد تلقائي" : "Auto-generate"}
            </button>
          </form>
        </DaylightPanel>
      ) : (
        <DaylightPanel
          title={ar ? "جسر التنبؤات" : "Forecast bridge"}
          aside={ar ? `${formatNumber(forecasts.length)} إشارة AI` : `${formatNumber(forecasts.length)} AI signals`}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 12 }}>
            {forecasts.map((f) => (
              <ForecastCard key={f.id} forecast={f} ar={ar} lc={lc} />
            ))}
          </div>
        </DaylightPanel>
      )}
    </DaylightShell>
  );
}

/* ── Forecast card — Heritage Modern ──────────────────────────── */

const STATUS_ACCENT: Record<string, string> = {
  APPROVED:  "var(--emerald)",
  EXECUTED:  "var(--gold)",
  DISMISSED: "var(--ink-muted)",
  DRAFT:     "var(--gold)",
};

function ForecastCard({ forecast: f, ar, lc }: { forecast: any; ar: boolean; lc: "ar" | "en" }) {
  const sourceBrand = getCompanyBrand(f.source.code);
  const targetBrand = getCompanyBrand(f.target.code);
  const catLabel = CATEGORY_LABEL[f.category]
    ? ar ? CATEGORY_LABEL[f.category].ar : CATEGORY_LABEL[f.category].en
    : f.category;
  const accent = STATUS_ACCENT[f.status] ?? "var(--gold)";

  return (
    <article
      className="relative overflow-hidden"
      style={{
        background: "var(--ivory)",
        border: "1px solid var(--line)",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{ insetInlineStart: 0, width: 3, background: accent }}
      />

      <div className="ms-2 p-4 space-y-3">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".1em", color: "var(--ink-muted)" }}
            >
              {catLabel}
            </span>
            <StatusBadge status={f.status} />
          </div>
          <span
            style={{ fontSize: 10, color: "var(--ink-muted)", letterSpacing: "0.04em", fontFamily: "monospace" }}
          >
            {formatShortDate(f.periodStart)} → {formatShortDate(f.periodEnd)}
          </span>
        </div>

        <h3
          className={ar ? "" : "font-display-latin"}
          style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}
        >
          {f.productLabel}
        </h3>

        {/* Source → Target flow */}
        <div className="flex items-center gap-2" style={{ fontSize: 11.5 }}>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold ring-1"
            style={{
              background: `color-mix(in srgb, ${sourceBrand.accent} 12%, transparent)`,
              color: sourceBrand.accent,
              borderColor: `color-mix(in srgb, ${sourceBrand.accent} 28%, transparent)`,
            }}
          >
            <span style={{ fontSize: 10 }}>{sourceBrand.emblem}</span>
            <span className="line-clamp-1">{ar ? f.source.name : f.source.nameEn}</span>
          </span>
          <ArrowLeftRight className="h-3 w-3 shrink-0" style={{ color: "var(--ink-muted)" }} strokeWidth={1.5} />
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold ring-1"
            style={{
              background: `color-mix(in srgb, ${targetBrand.accent} 12%, transparent)`,
              color: targetBrand.accent,
              borderColor: `color-mix(in srgb, ${targetBrand.accent} 28%, transparent)`,
            }}
          >
            <span style={{ fontSize: 10 }}>{targetBrand.emblem}</span>
            <span className="line-clamp-1">{ar ? f.target.name : f.target.nameEn}</span>
          </span>
        </div>

        {/* Phase NS-1 — linked PO badge */}
        {f.sourcedPO ? (
          <Link
            href={`/admin/purchase-orders?po=${encodeURIComponent(f.sourcedPO.poNumber)}`}
            className="inline-flex items-center gap-1.5 px-2 py-1 ring-1 transition hover:brightness-95"
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              background: "var(--cream)",
              color: "var(--gold)",
              borderColor: "var(--line)",
              textDecoration: "none",
            }}
          >
            <ShoppingCart className="h-3 w-3" strokeWidth={1.5} />
            <span style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace" }}>{f.sourcedPO.poNumber}</span>
            <span>→ {f.sourcedPO.supplierRef?.name ?? (ar ? f.target.name : f.target.nameEn)}</span>
          </Link>
        ) : null}

        {/* 3 stat cells */}
        <div className="grid grid-cols-3 gap-2">
          <ForecastStat label={ar ? "الكمية" : "Qty"} value={formatNumber(f.predictedDemand)} sub={f.unit} />
          <ForecastStat label={ar ? "الثقة" : "Conf"} value={formatPercent(f.confidence, 0)} sub="AI" highlight />
          <ForecastStat
            label={ar ? "أيام" : "Days"}
            value={formatNumber(Math.max(1, Math.round((f.periodEnd.getTime() - f.periodStart.getTime()) / 86400000)))}
            sub={ar ? "نافذة" : "window"}
          />
        </div>

        {/* H-Nerve signal */}
        <div
          className="px-3 py-2.5"
          style={{
            background: "var(--cream)",
            border: "1px solid var(--line)",
            borderInlineStart: `3px solid ${accent}`,
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--ink-muted)",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>
            {ar ? "إشارة H-Nerve: " : "H-Nerve signal: "}
          </span>
          {f.signal}
        </div>

        <ForecastExplainer
          signal={f.signal}
          predictedDemand={f.predictedDemand}
          unit={f.unit}
          confidence={f.confidence}
          productLabel={f.productLabel}
          sourceCompany={ar ? f.source.name : f.source.nameEn}
          targetCompany={ar ? f.target.name : f.target.nameEn}
          category={catLabel}
          locale={lc}
        />
      </div>

      {/* Footer actions */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
        style={{ borderTop: "1px solid var(--line)", background: "var(--cream)" }}
      >
        <div className="flex flex-wrap gap-1">
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
                <button
                  type="submit"
                  className="dl-btn dl-btn-secondary"
                  style={{ padding: "4px 10px", fontSize: 10.5 }}
                >
                  {s === "APPROVED" ? (
                    <CheckCircle2 className="h-3 w-3" style={{ color: "var(--emerald)" }} strokeWidth={1.5} />
                  ) : s === "EXECUTED" ? (
                    <ArrowLeftRight className="h-3 w-3" style={{ color: "var(--gold)" }} strokeWidth={1.5} />
                  ) : s === "DISMISSED" ? (
                    <XCircle className="h-3 w-3" style={{ color: "var(--brick)" }} strokeWidth={1.5} />
                  ) : null}
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
    </article>
  );
}

function ForecastStat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="p-2 text-center"
      style={{
        background: highlight ? "var(--cream)" : "var(--ivory)",
        border: `1px solid ${highlight ? "var(--line)" : "var(--line)"}`,
        borderTop: highlight ? `2px solid var(--gold)` : undefined,
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--ink-muted)" }}>{label}</div>
      <div
        style={{ fontSize: 15, fontWeight: 700, color: highlight ? "var(--gold)" : "var(--ink)", fontFamily: "monospace", marginTop: 2 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink-muted)" }}>{sub}</div>
    </div>
  );
}
