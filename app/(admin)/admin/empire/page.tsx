// /admin/empire — The Empire Dashboard.
//
// For someone running multiple H-Nerve installations. Eight tiles on
// one screen: live brain IQ, 8-week sparkline, pulse counts, the most
// recent decision. Quiet Authority aesthetic — institutional, restrained.
//
// Phase 19 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { getEmpireTiles, type EmpireTile, type SparkPoint } from "@/lib/empire/aggregator";
import { getLocale } from "@/lib/i18n/i18n.server";
import { ArrowUpRight, Crown, Globe2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmpirePage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const tiles = await getEmpireTiles();

  const totalIq = Math.round(
    tiles.reduce((s, t) => s + t.iq, 0) / Math.max(1, tiles.length),
  );
  const totalDecisions = tiles.reduce((s, t) => s + t.decisions7d, 0);
  const realCount = tiles.filter((t) => !t.synthetic).length;

  return (
    <section className="emp-root">
      <header className="emp-head">
        <div className="emp-head-mark">
          <Crown className="h-3.5 w-3.5" strokeWidth={1.4} />
          <span>{ar ? "لوحة الإمبراطورية" : "EMPIRE"}</span>
        </div>
        <h1 className="emp-head-title">
          {ar
            ? "ثمان أعمال. دماغ واحد لكل منها. شاشة واحدة."
            : "Eight businesses. One brain each. One screen."}
        </h1>
        <p className="emp-head-sub">
          {ar
            ? "كل ذكاء دماغ، نبضه، آخر قراره — في تخطيط واحد. التحديث آنيّ."
            : "Each brain's IQ, pulse, last decision — on a single grid. Live."}
        </p>
        <div className="emp-head-stats">
          <Stat label={ar ? "متوسط الذكاء" : "AVG IQ"} value={totalIq} accent />
          <Stat label={ar ? "أعمال" : "BUSINESSES"} value={tiles.length} />
          <Stat label={ar ? "قرارات / ٧ أيام" : "DECISIONS / 7d"} value={totalDecisions} />
          <Stat label={ar ? "ضمن H-Nerve" : "ON H-NERVE"} value={realCount} />
        </div>
      </header>

      <div className="emp-grid">
        {tiles.map((t, i) => (
          <Tile key={t.key} tile={t} ar={ar} index={i} />
        ))}
      </div>

      <p className="emp-foot">
        {ar
          ? "لكل وحدة في الإمبراطورية دماغ مستقل. كل ذكاء يصعد عند هبوط آخر تقرير ضبط ذاتي."
          : "Each unit runs its own brain. Each IQ ticks up as a self-tuning report lands."}
      </p>
    </section>
  );
}

function Tile({
  tile,
  ar,
  index,
}: {
  tile: EmpireTile;
  ar: boolean;
  index: number;
}) {
  const breathDelay = (index * 320) % 4000; // 0-3.7s offset for each tile
  const deltaSign = tile.iqDelta1w > 0 ? "+" : tile.iqDelta1w < 0 ? "−" : "·";
  const deltaAbs = Math.abs(tile.iqDelta1w);

  const inner = (
    <>
      <header className="emp-tile-head">
        <div className="emp-tile-name">
          <span className="emp-tile-title">
            {ar ? tile.name : tile.nameEn}
          </span>
          <span className="emp-tile-meta">
            <Globe2 className="h-3 w-3" strokeWidth={1.5} />
            <span>{tile.region}</span>
            <span className="emp-tile-meta-sep">·</span>
            <span>{ar ? tile.industryAr : tile.industry}</span>
          </span>
        </div>
        {tile.synthetic ? (
          <span className="emp-tile-tag" title={ar ? "بيانات تجريبية" : "Demo data"}>
            DEMO
          </span>
        ) : tile.key.startsWith("self:") ? (
          <span className="emp-tile-tag emp-tile-tag-primary">YOU</span>
        ) : null}
      </header>

      <div className="emp-tile-iq">
        <span className="emp-tile-iq-num">{tile.iq}</span>
        <span
          className="emp-tile-iq-delta"
          data-dir={tile.iqDelta1w > 0 ? "up" : tile.iqDelta1w < 0 ? "down" : "flat"}
        >
          {deltaSign}
          {deltaAbs}
        </span>
        <span className="emp-tile-iq-label">IQ · 1W</span>
      </div>

      <Sparkline points={tile.spark} />

      <footer className="emp-tile-foot">
        <FootStat label={ar ? "إشارات" : "Signals"} value={tile.insightsOpen} />
        <FootStat label={ar ? "خطط" : "Plans"} value={tile.plansActive} />
        <FootStat label={ar ? "قرارات" : "Decided"} value={tile.decisions7d} />
        {/* The arrow signals "go" — only real (navigable) tiles get it. */}
        {!tile.synthetic ? (
          <ArrowUpRight
            className="h-3.5 w-3.5 emp-tile-arrow"
            strokeWidth={1.4}
          />
        ) : null}
      </footer>

      {/* Hover layer — last decision */}
      {tile.latestDecision ? (
        <div className="emp-tile-hover" aria-hidden>
          <p className="emp-tile-hover-eyebrow">
            {ar ? "آخر قرار" : "LATEST DECISION"}
          </p>
          <p className="emp-tile-hover-text">
            {ar ? tile.latestDecision.goal : tile.latestDecision.goalEn}
          </p>
          <p className="emp-tile-hover-meta">
            {tile.latestDecision.targetMetric} ·{" "}
            {(tile.latestDecision.targetDelta * 100).toFixed(0)}% target
          </p>
        </div>
      ) : null}
    </>
  );

  const style = {
    ["--emp-breath-delay" as any]: `${breathDelay}ms`,
  } as React.CSSProperties;

  // Synthetic/demo tiles point nowhere — render them as a non-interactive
  // card instead of a <Link href="#"> that looks clickable but only jumps
  // to the top of the page.
  if (tile.synthetic) {
    return (
      <div
        className="emp-tile"
        data-synthetic="true"
        aria-disabled="true"
        style={style}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href="/admin/tenants"
      className="emp-tile"
      data-synthetic="false"
      style={style}
    >
      {inner}
    </Link>
  );
}

function Sparkline({ points }: { points: SparkPoint[] }) {
  if (!points.length) {
    return <div className="emp-tile-spark emp-tile-spark-empty" aria-hidden />;
  }
  const w = 200;
  const h = 36;
  const pad = 2;
  const min = Math.min(...points.map((p) => p.iq));
  const max = Math.max(...points.map((p) => p.iq));
  const span = Math.max(1, max - min);
  const xs = (i: number) =>
    pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const ys = (iq: number) =>
    h - pad - ((iq - min) / span) * (h - pad * 2);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(p.iq).toFixed(1)}`)
    .join(" ");
  // Area fill
  const last = points.length - 1;
  const area = `${d} L ${xs(last).toFixed(1)} ${h} L ${xs(0).toFixed(1)} ${h} Z`;
  return (
    <svg
      className="emp-tile-spark"
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} className="emp-tile-spark-area" />
      <path d={d} className="emp-tile-spark-line" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xs(i)}
          cy={ys(p.iq)}
          r={i === last ? 1.8 : 0.9}
          className={i === last ? "emp-tile-spark-dot is-last" : "emp-tile-spark-dot"}
        />
      ))}
    </svg>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`emp-stat ${accent ? "is-accent" : ""}`}>
      <div className="emp-stat-label">{label}</div>
      <div className="emp-stat-value">{value.toLocaleString()}</div>
    </div>
  );
}

function FootStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="emp-foot-stat">
      <span className="emp-foot-stat-label">{label}</span>
      <span className="emp-foot-stat-value">{value}</span>
    </div>
  );
}
