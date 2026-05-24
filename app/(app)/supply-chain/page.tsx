// /supply-chain — premium AI bridge view. Hero with breathing nerve graphic,
// strategic narrative, KPI strip, Sankey diagram, and forecast cards.
// Fully bilingual (ar/en). All animations from hn-anim-* library.

import Link from "next/link";
import {
  Brain, ArrowLeftRight, Plus, CheckCircle2, XCircle, Sparkles,
  Network, Zap, Activity, ShoppingCart,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { SectionBlock } from "@/components/exec/SectionBlock";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton } from "@/components/DeleteButton";
import { Sankey, type SankeyNode, type SankeyLink } from "@/components/charts/Sankey";
import { ForecastExplainer } from "@/components/ForecastExplainer";
import { ExportMenu } from "@/components/ExportMenu";
import { getCompanyBrand } from "@/lib/companyBrand";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import {
  ar as arAr, CATEGORIES_AR, formatNumber, formatPercent, formatShortDate,
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
      // Phase NS-1 — the bridge PO drafted when this forecast was approved.
      sourcedPO: { select: { id: true, poNumber: true, supplierRef: { select: { name: true } } } },
    },
  });

  const drafts = forecasts.filter((f) => f.status === "DRAFT").length;
  const approved = forecasts.filter((f) => f.status === "APPROVED").length;
  const executed = forecasts.filter((f) => f.status === "EXECUTED").length;
  const avgConfidence = forecasts.length > 0
    ? forecasts.reduce((acc, f) => acc + f.confidence, 0) / forecasts.length
    : 0;
  const totalDemand = forecasts.reduce((a, f) => a + f.predictedDemand, 0);

  // Sankey
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
      color: "var(--brand)",
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

  // AI Bridge gradient — distinctive purple/violet for "intelligence"
  const aiBridgeGradient =
    "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 35%, #7c3aed 70%, #a78bfa 110%)";

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الذكاء التشغيلي" : "Operational intelligence"}
        title={ar ? "سلسلة التوريد التنبؤية" : "Predictive supply chain"}
        subtitle={
          ar
            ? "جسر الذكاء بين شركات المجموعة — كل إشارة من فندق تتحول إلى أمر تصنيع أو حصاد."
            : "AI bridge across group companies — every hotel signal becomes a production or harvest order."
        }
      />

      <PageContainer>
        {/* ── AI Bridge Hero ────────────────────────────────────────── */}
        <HeroPanel gradient={aiBridgeGradient} accent="#a78bfa" height={280}>
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            {/* Narrative */}
            <div className="hn-anim-rise">
              <div
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  backdropFilter: "blur(6px)",
                  color: "white",
                }}
              >
                <Brain className="h-3 w-3 hn-anim-pulse-soft" />
                {ar ? "جسر الذكاء" : "AI bridge"}
              </div>
              <h2
                className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                style={{ animationDelay: "0.08s" }}
              >
                {ar ? "من حجز فندقي … إلى أمر تصنيع." : "From booking … to production."}
              </h2>
              <p
                className="mt-2 max-w-xl text-[12.5px] font-bold leading-relaxed opacity-90 hn-anim-rise"
                style={{ animationDelay: "0.16s" }}
              >
                {ar
                  ? "المحرك التنبؤي يقرأ كل حجز قادم في فنادق أرينا، يحسب توقعات استهلاك النزلاء، ويولّد إشارات شراء للمها ولوران قبل أن يصبح الطلب أزمة."
                  : "The predictive engine reads every incoming booking at Arena hotels, models guest consumption, and pushes purchase signals to Maha and Loran before demand becomes a crisis."}
              </p>
              <div
                className="mt-4 flex flex-wrap gap-2 hn-anim-fall"
                style={{ animationDelay: "0.26s" }}
              >
                <form action={autoGenerateForecasts}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                    style={{ background: "white", color: "#4c1d95" }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {ar ? "تشغيل المحرك" : "Run engine"}
                  </button>
                </form>
                <Link
                  href="/supply-chain/new"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-extrabold transition hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.32)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {ar ? "تنبؤ يدوي" : "Manual forecast"}
                </Link>
                <ExportMenu type="supply-chain" locale={lc} />
              </div>
            </div>

            {/* Bridge mini-stats */}
            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <BridgeStat
                label={ar ? "تنبؤات نشطة" : "Active signals"}
                value={formatNumber(forecasts.length)}
                icon={Sparkles}
              />
              <BridgeStat
                label={ar ? "متوسط الثقة" : "Avg confidence"}
                value={formatPercent(avgConfidence, 0)}
                icon={Activity}
              />
              <BridgeStat
                label={ar ? "إجمالي الطلب" : "Total demand"}
                value={formatNumber(totalDemand)}
                icon={Network}
              />
              <BridgeStat
                label={ar ? "تم تنفيذها" : "Executed"}
                value={formatNumber(executed)}
                icon={CheckCircle2}
              />
            </div>
          </div>
        </HeroPanel>

        {/* ── KPI strip ─────────────────────────────────────────────── */}
        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "مسودات معلّقة" : "Drafts pending"}
            value={formatNumber(drafts)}
            icon={Sparkles}
            tone="amber"
            hint={ar ? "تنتظر القرار" : "awaiting decision"}
          />
          <MetricTile
            label={ar ? "موافق عليها" : "Approved"}
            value={formatNumber(approved)}
            icon={CheckCircle2}
            tone="emerald"
            hint={ar ? "جاهزة للتنفيذ" : "ready to execute"}
          />
          <MetricTile
            label={ar ? "منفّذة" : "Executed"}
            value={formatNumber(executed)}
            icon={ArrowLeftRight}
            tone="blue"
            hint={ar ? "تمت" : "completed"}
          />
          <MetricTile
            label={ar ? "متوسط الثقة" : "Avg confidence"}
            value={formatPercent(avgConfidence, 0)}
            icon={Brain}
            tone="violet"
            hint={ar ? "AI score" : "AI score"}
          />
        </section>

        {/* ── Sankey ────────────────────────────────────────────────── */}
        {forecasts.length > 0 ? (
          <SectionBlock
            eyebrow={ar ? "تدفق الذكاء" : "Intelligence flow"}
            title={ar ? "جسر التوريد المرئي" : "Visual supply bridge"}
            description={
              ar
                ? "من شركة المصدر ← فئة المنتج ← الشركة المستهدفة (سُمك التدفق ∝ الكمية المتوقعة)"
                : "Source company → product category → target company (flow thickness ∝ predicted demand)"
            }
            tone="violet"
          >
            <Sankey nodes={sankeyNodes} links={sankeyLinks} width={1040} height={380} />
          </SectionBlock>
        ) : null}

        {/* ── Forecast cards or empty ───────────────────────────────── */}
        {forecasts.length === 0 ? (
          <EmptyState
            icon={Brain}
            title={ar ? "لم يصدر أي تنبؤ بعد" : "No forecasts yet"}
            description={
              ar
                ? "شغّل المحرك ليقرأ بيانات الحجوزات والإنتاج الحالية، أو سجّل تنبؤاً يدوياً."
                : "Run the engine to read current booking & production data, or register a manual forecast."
            }
            action={
              <form action={autoGenerateForecasts}>
                <button type="submit" className="btn-primary hn-hover-shine">
                  <Brain className="h-4 w-4" />
                  {ar ? "توليد تلقائي" : "Auto-generate"}
                </button>
              </form>
            }
          />
        ) : (
          <SectionBlock
            eyebrow={ar ? "كل الإشارات" : "All signals"}
            title={ar ? "جسر التنبؤات" : "Forecast bridge"}
            description={
              ar
                ? `${formatNumber(forecasts.length)} إشارة AI ينقلها الجسر بين الوحدات`
                : `${formatNumber(forecasts.length)} AI signals carried across the bridge`
            }
            tone="violet"
          >
            <div className="grid gap-3 hn-stagger md:grid-cols-2">
              {forecasts.map((f) => (
                <ForecastCard
                  key={f.id}
                  forecast={f}
                  ar={ar}
                  lc={lc}
                />
              ))}
            </div>
          </SectionBlock>
        )}
      </PageContainer>
    </>
  );
}

/* ───────────────────────────────────────────── */

function BridgeStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-xl font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}

function ForecastCard({
  forecast: f,
  ar,
  lc,
}: {
  forecast: any;
  ar: boolean;
  lc: "ar" | "en";
}) {
  const sourceBrand = getCompanyBrand(f.source.code);
  const targetBrand = getCompanyBrand(f.target.code);
  const catLabel = CATEGORY_LABEL[f.category]
    ? ar
      ? CATEGORY_LABEL[f.category].ar
      : CATEGORY_LABEL[f.category].en
    : f.category;

  return (
    <article
      className="exec-card hn-anim-rise group flex flex-col overflow-hidden"
      data-tone="violet"
    >
      {/* Header row with companies */}
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em]"
              style={{
                background: "color-mix(in srgb, #8b5cf6 14%, transparent)",
                color: "#6d28d9",
              }}
            >
              {catLabel}
            </span>
            <StatusBadge status={f.status} />
          </div>
          <span
            className="exec-num text-[10.5px] font-extrabold"
            style={{ color: "var(--text-muted)" }}
          >
            {formatShortDate(f.periodStart)} → {formatShortDate(f.periodEnd)}
          </span>
        </div>

        <h3
          className="line-clamp-1 text-[15px] font-black leading-tight"
          style={{ color: "var(--text)" }}
        >
          {f.productLabel}
        </h3>

        {/* Source → Target with company colors */}
        <div className="flex items-center gap-2 text-[11.5px]">
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-extrabold ring-1"
            style={{
              background: `color-mix(in srgb, ${sourceBrand.accent} 14%, transparent)`,
              color: sourceBrand.accent,
              borderColor: `color-mix(in srgb, ${sourceBrand.accent} 28%, transparent)`,
            }}
          >
            <span className="text-[10px]">{sourceBrand.emblem}</span>
            <span className="line-clamp-1">{ar ? f.source.name : f.source.nameEn}</span>
          </span>
          <ArrowLeftRight
            className="h-3 w-3 shrink-0"
            style={{ color: "var(--text-muted)" }}
          />
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-extrabold ring-1"
            style={{
              background: `color-mix(in srgb, ${targetBrand.accent} 14%, transparent)`,
              color: targetBrand.accent,
              borderColor: `color-mix(in srgb, ${targetBrand.accent} 28%, transparent)`,
            }}
          >
            <span className="text-[10px]">{targetBrand.emblem}</span>
            <span className="line-clamp-1">{ar ? f.target.name : f.target.nameEn}</span>
          </span>
        </div>

        {/* Phase NS-1 — linked purchase-order badge. Appears once an
            approved forecast has drafted a cross-tenant PO. */}
        {f.sourcedPO ? (
          <Link
            href={`/admin/purchase-orders?po=${encodeURIComponent(f.sourcedPO.poNumber)}`}
            className="inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[10.5px] font-extrabold ring-1 transition hover:brightness-95"
            style={{
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
              color: "var(--brand)",
              borderColor: "color-mix(in srgb, var(--brand) 28%, transparent)",
            }}
          >
            <ShoppingCart className="h-3 w-3" />
            <span className="font-mono">{f.sourcedPO.poNumber}</span>
            <span>→ {f.sourcedPO.supplierRef?.name ?? (ar ? f.target.name : f.target.nameEn)}</span>
          </Link>
        ) : null}

        {/* 3 stat cells */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <ForecastStat
            label={ar ? "الكمية" : "Quantity"}
            value={formatNumber(f.predictedDemand)}
            sub={f.unit}
          />
          <ForecastStat
            label={ar ? "الثقة" : "Confidence"}
            value={formatPercent(f.confidence, 0)}
            sub={ar ? "AI" : "AI"}
            highlight
          />
          <ForecastStat
            label={ar ? "أيام" : "Days"}
            value={formatNumber(
              Math.max(
                1,
                Math.round(
                  (f.periodEnd.getTime() - f.periodStart.getTime()) / 86400000,
                ),
              ),
            )}
            sub={ar ? "نافذة" : "window"}
          />
        </div>

        {/* Signal */}
        <div
          className="rounded-lg p-2.5 text-[11px] leading-relaxed"
          style={{
            background: "var(--brand-soft)",
            color: "var(--text)",
            border: "1px dashed color-mix(in srgb, var(--brand) 25%, transparent)",
          }}
        >
          <span
            className="me-1 font-black"
            style={{ color: "var(--brand)" }}
          >
            {ar ? "إشارة H-Nerve:" : "H-Nerve signal:"}
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
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--brand-soft)",
        }}
      >
        <div className="flex flex-wrap gap-1">
          {(["DRAFT", "APPROVED", "EXECUTED", "DISMISSED"] as const).map((s) => {
            // NS-1 wiring fix: Approve a DRAFT routes through approveForecast
            // (flips status AND drafts the cross-tenant PO bridge). Dismiss
            // routes through rejectForecast. All other transitions keep the
            // plain setForecastStatus. Without this, the bridge never ran
            // from the UI — the Approve button hit setForecastStatus only.
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
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-extrabold transition hover:bg-[var(--surface-elevated)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s === "APPROVED" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : s === "EXECUTED" ? (
                    <ArrowLeftRight className="h-3 w-3 text-blue-600" />
                  ) : s === "DISMISSED" ? (
                    <XCircle className="h-3 w-3 text-rose-600" />
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
      className="rounded-lg p-2 text-center"
      style={{
        background: highlight ? "var(--brand-soft)" : "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="text-[9px] font-extrabold uppercase tracking-[0.1em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div
        className="exec-num mt-0.5 text-[15px] font-black"
        style={{ color: highlight ? "var(--brand)" : "var(--text)" }}
      >
        {value}
      </div>
      <div
        className="text-[9px] font-bold"
        style={{ color: "var(--text-muted)" }}
      >
        {sub}
      </div>
    </div>
  );
}
