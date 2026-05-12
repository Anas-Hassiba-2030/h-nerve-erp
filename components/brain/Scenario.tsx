"use client";

// Scenario — the live what-if scrub UI.
//
// Layout:
//   ┌─────────────────────────────────────────────────────────────┐
//   │  SOURCE: [autocomplete: pick a starting node]              │
//   │  PERTURBATION: [-100% ←——●——→ +100%]      delta=−40%       │
//   │                                                              │
//   │  Editorial line: "If Arena occupancy drops 40%, …"          │
//   │                                                              │
//   │  TIER 1 (immediate downstream)                               │
//   │    Hourani Holding   100 → 60      −40%      conf 0.92      │
//   │    Lina Haddad · BK  1,560 → 936    −40%     conf 0.85      │
//   │  TIER 2                                                      │
//   │    Maha Dairy   …      …                                     │
//   │  …                                                           │
//   └─────────────────────────────────────────────────────────────┘
//
// Aesthetic: the scrub controls (top) lean Industrial Precision (dark
// surface, ochre accent). The impact list (bottom) is Heritage Modern
// (cream tiles, hairline rules, display-serif numerals via SmoothNumber).
// This is intentional — the "engine controls" want a different register
// than the "stories about the business" they produce.
//
// Phase 2 of docs/PHASES-INTELLIGENCE.md.

import { useMemo, useState } from "react";
import type { GraphNode, GraphEdge } from "@/lib/brain/graph";
import { simulateOnSnapshot, primaryMetric } from "@/lib/brain/simulator.bfs";
import type { ImpactRow } from "@/lib/brain/simulator";
import { SmoothNumber } from "./SmoothNumber";
import { Search, Zap, ChevronRight } from "lucide-react";

const HUB_KINDS = new Set(["Company", "Hotel", "Farm", "Program", "Forecast", "Insight"]);

const KIND_COLOR: Record<string, string> = {
  Company:     "var(--heri-ochre)",
  Hotel:       "var(--heri-terracotta)",
  Booking:     "var(--heri-copper)",
  DairyBatch:  "var(--heri-copper)",
  Farm:        "var(--heri-teal)",
  Crop:        "var(--heri-sage)",
  Program:     "var(--heri-rose)",
  Transaction: "var(--heri-ink-3)",
  Forecast:    "var(--heri-ochre-2)",
  Insight:     "var(--heri-terracotta)",
};

export function Scenario({
  nodes,
  edges,
  ar,
  defaultSourceId,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  ar: boolean;
  defaultSourceId?: string;
}) {
  const hubs = useMemo(
    () => nodes.filter((n) => HUB_KINDS.has(n.kind)),
    [nodes]
  );

  const [sourceId, setSourceId] = useState<string>(
    defaultSourceId ?? hubs[0]?.id ?? ""
  );
  const [delta, setDelta] = useState(-0.4); // -40% by default — opens with a bang

  const source = useMemo(
    () => nodes.find((n) => n.id === sourceId) ?? null,
    [nodes, sourceId]
  );

  const impact = useMemo<ImpactRow[]>(() => {
    if (!source || Math.abs(delta) < 0.001) return [];
    return simulateOnSnapshot({ nodes, edges }, { nodeId: source.id, delta });
  }, [nodes, edges, source, delta]);

  // Group by hops (BFS depth) for the tier display.
  const tiers = useMemo(() => {
    const map = new Map<number, ImpactRow[]>();
    for (const row of impact) {
      const list = map.get(row.hops) ?? [];
      list.push(row);
      map.set(row.hops, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [impact]);

  const top3 = impact.slice(0, 3);
  const totalAffected = impact.length;

  // Editorial headline (template-based — Phase 4 will rewrite via the Narrator)
  const direction = delta < 0 ? (ar ? "تنخفض" : "drops") : (ar ? "ترتفع" : "rises");
  const directionTop3 = (r: ImpactRow) =>
    r.projectedDelta < 0
      ? (ar ? "تنخفض" : "falls")
      : (ar ? "ترتفع" : "rises");
  const pctAbs = Math.abs(delta * 100).toFixed(0);

  return (
    <div className="space-y-5">
      {/* ── Industrial Precision control deck ───────────────────────── */}
      <section
        style={{
          background: "#0e0e10",
          color: "rgba(245,239,230,0.88)",
          border: "1px solid rgba(245,239,230,0.14)",
          padding: "20px 22px",
          position: "relative",
        }}
      >
        {/* faint dotted background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10">
          {/* Source row */}
          <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
            <span
              className="inline-flex items-center gap-2"
              style={{
                fontFamily:
                  "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                fontSize: 10.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#c69345",
              }}
            >
              <Search className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "المصدر" : "Source"}
            </span>
            <SourcePicker
              hubs={hubs}
              value={sourceId}
              onChange={setSourceId}
            />
          </div>

          {/* Slider */}
          <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
            <span
              className="inline-flex items-center gap-2"
              style={{
                fontFamily:
                  "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                fontSize: 10.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#c69345",
              }}
            >
              <Zap className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "التغيير" : "Perturbation"}
            </span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={delta}
              onChange={(e) => setDelta(parseFloat(e.target.value))}
              className="brain-slider w-full"
              aria-label="perturbation"
            />
            <span
              style={{
                fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: delta < 0 ? "#e89a7c" : delta > 0 ? "#9bd6c4" : "#fafaf7",
                fontVariantNumeric: "tabular-nums",
                minWidth: 88,
                textAlign: "end" as const,
              }}
            >
              {(delta >= 0 ? "+" : "") + (delta * 100).toFixed(0)}%
            </span>
          </div>

          {/* Source node summary */}
          {source ? (
            <div
              className="mt-5 pt-4"
              style={{ borderTop: "1px solid rgba(245,239,230,0.1)" }}
            >
              <div
                style={{
                  fontFamily:
                    "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: KIND_COLOR[source.kind] ?? "#c69345",
                }}
              >
                {source.kind}
              </div>
              <div
                style={{
                  fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "-0.012em",
                  color: "#fafaf7",
                  marginTop: 4,
                }}
              >
                {source.label}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Editorial headline (Heritage Modern editorial register) ──── */}
      {source && Math.abs(delta) >= 0.005 ? (
        <section
          style={{
            background: "var(--heri-cream)",
            border: "1px solid var(--heri-rule-strong)",
            padding: "20px 26px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* gold rail */}
          <span
            aria-hidden
            className="absolute"
            style={{
              top: 0,
              insetInline: 0,
              height: 2,
              background:
                "linear-gradient(90deg, var(--heri-terracotta) 0%, var(--heri-ochre) 50%, var(--heri-teal) 100%)",
            }}
          />
          <div className="heri-eyebrow mb-2.5">
            {ar ? "السيناريو" : "Scenario"}
          </div>
          <p
            style={{
              fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
              fontSize: "clamp(17px, 1.4vw, 22px)",
              lineHeight: 1.45,
              letterSpacing: "-0.01em",
              color: "var(--heri-ink)",
              textWrap: "balance" as any,
              maxWidth: "65ch",
            }}
          >
            {ar ? (
              <>
                إذا {direction} مؤشر <em style={{ color: "var(--heri-terracotta)", fontStyle: "italic" }}>{source.label}</em>{" "}
                بنسبة {pctAbs}٪، فإنّ التموجات ستصل إلى{" "}
                <strong style={{ fontWeight: 600 }}>{totalAffected}</strong> كياناً مرتبطاً.
                {top3.length > 0 ? (
                  <>
                    {" "}أكبر التعرّضات:{" "}
                    {top3.map((r, i) => (
                      <span key={r.node.id}>
                        <em style={{ color: "var(--heri-copper)", fontStyle: "italic" }}>{r.node.label}</em>{" "}
                        ({directionTop3(r)} {Math.abs(r.projectedDelta * 100).toFixed(0)}٪)
                        {i < top3.length - 1 ? ", " : "."}
                      </span>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <>
                If <em style={{ color: "var(--heri-terracotta)", fontStyle: "italic" }}>{source.label}</em>{" "}
                {direction} by {pctAbs}%, the ripple reaches{" "}
                <strong style={{ fontWeight: 600 }}>{totalAffected}</strong> connected entities.
                {top3.length > 0 ? (
                  <>
                    {" "}Top exposures:{" "}
                    {top3.map((r, i) => (
                      <span key={r.node.id}>
                        <em style={{ color: "var(--heri-copper)", fontStyle: "italic" }}>{r.node.label}</em>{" "}
                        ({directionTop3(r)} {Math.abs(r.projectedDelta * 100).toFixed(0)}%)
                        {i < top3.length - 1 ? ", " : "."}
                      </span>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </p>
        </section>
      ) : null}

      {/* ── Impact tiers ────────────────────────────────────────────── */}
      {tiers.length === 0 ? (
        <div
          className="px-6 py-12 text-center"
          style={{
            background: "var(--heri-cream-2)",
            border: "1px solid var(--heri-rule)",
            color: "var(--heri-ink-3)",
            fontStyle: "italic",
            fontSize: 13,
          }}
        >
          {ar
            ? "لا تأثيرات منتشرة. اسحب المؤشر أو غيّر المصدر."
            : "No propagating effects. Drag the slider or change the source."}
        </div>
      ) : (
        <div className="space-y-4">
          {tiers.map(([depth, rows]) => (
            <TierBlock key={depth} depth={depth} rows={rows} ar={ar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function TierBlock({
  depth,
  rows,
  ar,
}: {
  depth: number;
  rows: ImpactRow[];
  ar: boolean;
}) {
  return (
    <section
      style={{
        background: "var(--heri-cream-2)",
        border: "1px solid var(--heri-rule)",
        padding: "16px 20px",
      }}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="heri-eyebrow inline-flex items-center gap-2">
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 18,
              height: 1.5,
              background: "var(--heri-ochre)",
            }}
          />
          {ar ? `الطبقة ${depth}` : `TIER ${depth}`}
          <span
            style={{
              color: "var(--heri-ink-3)",
              marginInlineStart: 4,
            }}
          >
            · {rows.length} {ar ? "عنصر" : "items"}
          </span>
        </div>
      </header>
      <ul className="space-y-1.5">
        {rows.slice(0, 12).map((row) => (
          <ImpactRowView key={row.node.id} row={row} ar={ar} />
        ))}
        {rows.length > 12 ? (
          <li
            className="px-2 pt-2 heri-eyebrow heri-eyebrow-ink"
            style={{ fontSize: 10 }}
          >
            +{rows.length - 12} {ar ? "أخرى" : "more"}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function ImpactRowView({ row, ar }: { row: ImpactRow; ar: boolean }) {
  const accent = KIND_COLOR[row.node.kind] ?? "var(--heri-ink-3)";
  const negative = row.projectedDelta < 0;
  const deltaColor = negative ? "var(--heri-terracotta)" : "var(--heri-teal)";
  const m = primaryMetric(row.node);
  const projectedValue = m ? m.value * (1 + row.projectedDelta) : null;

  return (
    <li
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: "12px 1fr auto auto auto",
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        padding: "8px 12px",
      }}
    >
      {/* Kind dot */}
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: accent,
          marginInlineStart: 1,
        }}
      />

      {/* Label */}
      <div className="min-w-0">
        <div
          className="truncate"
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            color: "var(--heri-ink)",
            lineHeight: 1.2,
          }}
          title={row.pathSummary}
        >
          {row.node.label}
        </div>
        <div
          className="truncate"
          style={{
            fontFamily:
              "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
            fontSize: 9.5,
            letterSpacing: "0.06em",
            color: "var(--heri-ink-3)",
            marginTop: 2,
          }}
        >
          {row.pathSummary}
        </div>
      </div>

      {/* Current → projected (if numeric) */}
      <div
        className="hidden md:block text-right"
        style={{
          fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
          fontSize: 14,
          color: "var(--heri-ink-2)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 130,
          letterSpacing: "-0.012em",
        }}
      >
        {projectedValue !== null && m ? (
          <>
            <span style={{ opacity: 0.5 }}>
              {Math.round(m.value).toLocaleString("en-US")}
            </span>
            <ChevronRight
              className="inline mx-1 h-3 w-3 rtl:rotate-180"
              style={{ verticalAlign: "middle", color: "var(--heri-rule-strong)" }}
              strokeWidth={1.5}
            />
            <SmoothNumber
              value={projectedValue}
              format="integer"
              unit={m.unit}
              style={{ color: "var(--heri-ink)" }}
            />
          </>
        ) : (
          <span style={{ opacity: 0.45, fontSize: 11 }}>—</span>
        )}
      </div>

      {/* Delta % */}
      <div
        className="text-right"
        style={{
          fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
          fontSize: 16,
          fontWeight: 500,
          color: deltaColor,
          letterSpacing: "-0.018em",
          minWidth: 64,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {(row.projectedDelta >= 0 ? "+" : "") + (row.projectedDelta * 100).toFixed(1) + "%"}
      </div>

      {/* Confidence dot */}
      <span
        title={`${ar ? "الثقة" : "confidence"}: ${(row.confidence * 100).toFixed(0)}%`}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: deltaColor,
          opacity: Math.max(0.25, row.confidence),
        }}
      />
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Source picker — autocomplete-style keyboard-friendly select.
// ─────────────────────────────────────────────────────────────────────

function SourcePicker({
  hubs,
  value,
  onChange,
}: {
  hubs: GraphNode[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "rgba(245,239,230,0.06)",
          color: "#fafaf7",
          border: "1px solid rgba(245,239,230,0.18)",
          padding: "8px 12px",
          fontFamily: "'Inter Tight','Inter',system-ui,sans-serif",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "-0.005em",
          borderRadius: 0,
          minWidth: 280,
          appearance: "none",
        }}
      >
        {/* Group by kind */}
        {groupBy(hubs, (n) => n.kind).map(([kind, list]) => (
          <optgroup
            key={kind}
            label={kind.toUpperCase()}
            style={{ background: "#0e0e10", color: "#c69345" }}
          >
            {list.map((n) => (
              <option
                key={n.id}
                value={n.id}
                style={{ background: "#0e0e10", color: "#fafaf7" }}
              >
                {n.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Array<[K, T[]]> {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = m.get(k) ?? [];
    list.push(item);
    m.set(k, list);
  }
  return [...m.entries()];
}
