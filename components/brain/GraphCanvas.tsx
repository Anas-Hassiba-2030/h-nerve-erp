"use client";

// GraphCanvas — the live causal graph visualization.
//
// Hand-rolled force-directed layout (no external dep):
//   - Each frame: O(n²) Coulomb-style repulsion between nodes,
//                 Hooke's-law spring along each edge,
//                 mild gravity toward center,
//                 velocity damping at 0.85.
//   - Layout converges in ~200 frames for 50 nodes; we run the loop
//     continuously so dragged nodes settle naturally.
//
// Aesthetic: Industrial Precision (docs/DESIGN-SKILL.md §1.B).
//   Off-black background, Heritage ochre highlights, hairline labels.
//
// Signature animation: when the user clicks a node, BFS downstream
// along causal edges; affected nodes pulse in cascade with delays
// proportional to depth.
//
// Phase 1 of docs/PHASES-INTELLIGENCE.md.

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";

export type GNode = {
  id: string;
  kind: string;
  label: string;
  importance: number;
  payload: Record<string, any>;
};

export type GEdge = {
  from: string;
  to: string;
  kind: string;
  weight: number;
  confidence: number;
  rationale?: string | null;
};

// Hub kinds always show their label — leaves cluster around them.
const HUB_KINDS = new Set(["Company", "Hotel", "Farm", "Program", "Forecast", "Insight"]);

// Heritage palette per node kind — the only chromatic accents on screen
const KIND_COLOR: Record<string, string> = {
  Company:     "#c69345", // ochre — the spine of the org
  Hotel:       "#b85c38", // terracotta — hospitality
  Booking:     "#7d5a3a", // copper — bookings cluster around hotels
  DairyBatch:  "#7d5a3a", // copper — dairy
  Farm:        "#1f4e4a", // teal — agriculture / nature
  Crop:        "#7a9b7a", // sage
  Program:     "#c98b8b", // rose
  Transaction: "#4a4138", // ink-3 muted
  Forecast:    "#a87a32", // ochre-2 — predictive layer
  Insight:     "#b85c38", // terracotta — calls for attention
  Plan:        "#1f4e4a", // teal — committed actions
  User:        "#4a4138",
};
const KIND_DEFAULT = "#4a4138";

type SimNode = GNode & {
  x: number; y: number;
  vx: number; vy: number;
  r: number;     // visual radius
  dragging?: boolean;
};

const REPEL = 5400;
const SPRING_K = 0.025;
const SPRING_REST = 124;
const GRAVITY = 0.011;
const DAMP = 0.86;
const MAX_VEL = 24;

// Diverging fill for simulation impact: loss = terracotta, gain = teal.
function simFill(d: number): string {
  return d < 0 ? "#c0563a" : "#2f7d6a";
}

export function GraphCanvas({
  nodes: rawNodes,
  edges: rawEdges,
  onSelectNode,
  impact,
  ar = false,
}: {
  nodes: GNode[];
  edges: GEdge[];
  onSelectNode?: (n: GNode | null) => void;
  /** When the what-if simulator is live: nodeId → projected signed delta. */
  impact?: Map<string, number>;
  ar?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Affected map: nodeId → BFS depth from the clicked node (drives the cascade animation).
  const [affected, setAffected] = useState<Map<string, number>>(new Map());
  const [waveStartedAt, setWaveStartedAt] = useState<number>(0);

  // Resize observer
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ w: Math.max(400, cr.width), h: Math.max(400, cr.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Adjacency for BFS
  const adj = useMemo(() => {
    const m = new Map<string, Array<{ to: string; weight: number }>>();
    for (const e of rawEdges) {
      const list = m.get(e.from) ?? [];
      list.push({ to: e.to, weight: e.weight });
      m.set(e.from, list);
    }
    return m;
  }, [rawEdges]);

  // Undirected neighbour set — powers hover-to-trace (highlight everything
  // one edge away from the node under the cursor, dim the rest).
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (!m.has(a)) m.set(a, new Set());
      m.get(a)!.add(b);
    };
    for (const e of rawEdges) {
      link(e.from, e.to);
      link(e.to, e.from);
    }
    return m;
  }, [rawEdges]);

  // Sim state — keep in a ref so the loop doesn't re-trigger renders
  const simRef = useRef<{ nodes: Map<string, SimNode>; edges: GEdge[] }>({
    nodes: new Map(),
    edges: [],
  });

  // (Re)build sim state when raw input changes
  useEffect(() => {
    const next = new Map<string, SimNode>();
    const cx = size.w / 2;
    const cy = size.h / 2;
    for (const n of rawNodes) {
      const prior = simRef.current.nodes.get(n.id);
      const r = 6 + 18 * Math.max(0, Math.min(1, n.importance));
      next.set(n.id, {
        ...n,
        x: prior?.x ?? cx + (Math.random() - 0.5) * 320,
        y: prior?.y ?? cy + (Math.random() - 0.5) * 320,
        vx: 0,
        vy: 0,
        r,
      });
    }
    simRef.current = { nodes: next, edges: rawEdges };
  }, [rawNodes, rawEdges, size.w, size.h]);

  // Animation loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      step(simRef.current.nodes, simRef.current.edges, size.w, size.h);
      setTick((t) => (t + 1) & 0xffff);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h]);

  // Click → BFS shockwave
  const onNodeClick = (id: string) => {
    if (selected === id) {
      setSelected(null);
      setAffected(new Map());
      onSelectNode?.(null);
      return;
    }
    setSelected(id);
    const n = simRef.current.nodes.get(id);
    if (n && onSelectNode) onSelectNode(n);

    // BFS along outgoing edges only (downstream)
    const m = new Map<string, number>();
    m.set(id, 0);
    let frontier: string[] = [id];
    let depth = 0;
    while (frontier.length && depth < 6) {
      depth++;
      const next: string[] = [];
      for (const f of frontier) {
        const out = adj.get(f) ?? [];
        for (const { to } of out) {
          if (!m.has(to)) {
            m.set(to, depth);
            next.push(to);
          }
        }
      }
      frontier = next;
    }
    setAffected(m);
    setWaveStartedAt(performance.now());
  };

  // Stop dragging on global mouseup
  useEffect(() => {
    const up = () => {
      simRef.current.nodes.forEach((n) => {
        if (n.dragging) n.dragging = false;
      });
    };
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, []);

  const sim = simRef.current;
  const nowMs = performance.now();
  const wavePhaseMs = nowMs - waveStartedAt;
  // Per-depth pulse window (ms): each depth gets a 600ms window starting 80ms after the previous
  const isPulsing = (depth: number) => {
    const start = depth * 80;
    const end = start + 600;
    return wavePhaseMs >= start && wavePhaseMs <= end;
  };
  // [0..1] within the pulse window for opacity easing
  const pulseFrac = (depth: number) => {
    const start = depth * 80;
    const t = wavePhaseMs - start;
    const w = 600;
    if (t < 0 || t > w) return 0;
    return 1 - t / w; // linearly fade out — feels like a real shockwave
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{
        height: "min(76vh, 820px)",
        background: "#0e0e10",
        border: "1px solid var(--heri-rule-strong)",
      }}
    >
      {/* Faint grid for engine-room feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top meta rail */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3"
        style={{
          color: "rgba(245,239,230,0.75)",
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(to bottom, rgba(14,14,16,0.95), rgba(14,14,16,0))",
        }}
      >
        <span style={{ color: "#c69345" }}>● BRAIN GRAPH</span>
        <span>
          {sim.nodes.size} NODES · {sim.edges.length} EDGES
        </span>
      </div>

      <svg
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ display: "block" }}
        onMouseMove={(e) => {
          // Drag any node currently flagged
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          sim.nodes.forEach((n) => {
            if (n.dragging) {
              n.x = mx;
              n.y = my;
              n.vx = 0;
              n.vy = 0;
            }
          });
        }}
      >
        {/* Edges */}
        <g>
          {sim.edges.map((e, i) => {
            const a = sim.nodes.get(e.from);
            const b = sim.nodes.get(e.to);
            if (!a || !b) return null;
            const aDepth = affected.get(a.id);
            const bDepth = affected.get(b.id);
            const onPath =
              selected != null &&
              aDepth !== undefined &&
              bDepth !== undefined &&
              aDepth < bDepth;
            const dimmed =
              selected != null && !(aDepth !== undefined && bDepth !== undefined);
            const causal = e.kind === "causal";
            const baseOpacity = causal ? 0.42 : 0.18;
            let opacity = onPath ? 1 : dimmed ? 0.06 : baseOpacity;
            let stroke = onPath
              ? "#c69345"
              : causal
                ? "rgba(198,147,69,0.55)"
                : "rgba(245,239,230,0.32)";
            let strokeWidth = onPath ? 2.2 : causal ? 1.0 : 0.6;

            // Hover-to-trace: when nothing is clicked, hovering a node lights
            // its incident edges and fades everything else.
            if (hoveredId != null && selected == null) {
              const incident = e.from === hoveredId || e.to === hoveredId;
              if (incident) {
                opacity = causal ? 0.95 : 0.6;
                stroke = "#c69345";
                strokeWidth = causal ? 1.8 : 1.0;
              } else {
                opacity = 0.05;
              }
            }
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={opacity}
                strokeLinecap="round"
                strokeDasharray={causal ? "0" : "3 4"}
                style={{ transition: "opacity 150ms ease, stroke-width 150ms ease" }}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {[...sim.nodes.values()].map((n) => {
            const fill = KIND_COLOR[n.kind] ?? KIND_DEFAULT;
            const isSel = selected === n.id;
            const isHov = hoveredId === n.id;
            const depth = affected.get(n.id);
            const isAffected = depth !== undefined && depth > 0;
            const pulsing = isAffected && isPulsing(depth!);
            const pulseFr = isAffected ? pulseFrac(depth!) : 0;

            // What-if simulation overlay.
            const simDelta = impact?.get(n.id);
            const inSim = impact != null && impact.size > 0;
            const bodyFill = simDelta !== undefined ? simFill(simDelta) : fill;
            const rOut =
              simDelta !== undefined
                ? n.r + Math.min(11, Math.abs(simDelta) * 22)
                : n.r;

            // Hover-to-trace: the hovered node and its direct neighbours stay
            // lit; everyone else recedes. Only active when nothing is clicked
            // and the simulator isn't running.
            const hovering = hoveredId != null && selected == null && !inSim;
            const isHoverNeighbor =
              hovering &&
              (n.id === hoveredId || (neighbors.get(hoveredId!)?.has(n.id) ?? false));

            const bodyOpacity = inSim
              ? simDelta !== undefined
                ? 0.96
                : 0.13
              : hovering
                ? isHoverNeighbor
                  ? 0.98
                  : 0.18
                : selected != null && !isSel && !isAffected
                  ? 0.35
                  : 0.95;

            return (
              <g
                key={n.id}
                style={{ cursor: "grab" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  n.dragging = true;
                }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() =>
                  setHoveredId((cur) => (cur === n.id ? null : cur))
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick(n.id);
                }}
              >
                {/* Pulsing ring (shockwave) — bright while the wave passes */}
                {pulsing ? (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r + 22 * pulseFr + 3}
                    fill="none"
                    stroke="#c69345"
                    strokeWidth={2.4}
                    opacity={pulseFr}
                  />
                ) : null}

                {/* Persistent affected ring — stays after the wave passes,
                    so the user can scan the downstream set after the fact. */}
                {isAffected && !isSel ? (
                  <>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r + 4}
                      fill="none"
                      stroke="#c69345"
                      strokeWidth={1.4}
                      opacity={0.85}
                    />
                    {/* Outer breath — softer, larger */}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r + 7}
                      fill="none"
                      stroke="#c69345"
                      strokeWidth={0.6}
                      opacity={0.35}
                    />
                  </>
                ) : null}

                {/* Selected halo — double ring for the click target */}
                {isSel ? (
                  <>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r + 6}
                      fill="none"
                      stroke="#c69345"
                      strokeWidth={2}
                      opacity={1}
                    />
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r + 11}
                      fill="none"
                      stroke="#c69345"
                      strokeWidth={0.8}
                      opacity={0.55}
                    />
                  </>
                ) : null}

                {/* The node body */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={rOut}
                  fill={bodyFill}
                  opacity={bodyOpacity}
                  stroke="rgba(245,239,230,0.18)"
                  strokeWidth={1}
                  style={{ transition: "opacity 150ms ease, r 200ms ease" }}
                />

                {/* Label — for hub kinds, on hover, when selected/affected, a
                    hovered node's neighbour, or when this node carries a
                    simulated impact. */}
                {((isHov || isSel || isAffected || isHoverNeighbor) ||
                  simDelta !== undefined ||
                  HUB_KINDS.has(n.kind)) ? (
                  <text
                    x={n.x}
                    y={n.y + rOut + 12}
                    textAnchor="middle"
                    style={{
                      fill: isSel || isHov ? "#fafaf7" : "rgba(245,239,230,0.78)",
                      fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {truncate(n.label, 22)}
                  </text>
                ) : null}

                {/* Simulated delta badge above the node. */}
                {simDelta !== undefined && Math.abs(simDelta) >= 0.01 ? (
                  <text
                    x={n.x}
                    y={n.y - rOut - 5}
                    textAnchor="middle"
                    style={{
                      fill: simFill(simDelta),
                      fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {`${simDelta > 0 ? "▲ +" : "▼ "}${Math.round(simDelta * 100)}%`}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div
        className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-2"
        style={{
          color: "rgba(245,239,230,0.7)",
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {Object.entries(KIND_COLOR).slice(0, 8).map(([kind, color]) => (
          <span
            key={kind}
            className="inline-flex items-center gap-1.5 px-2 py-0.5"
            style={{
              background: "rgba(14,14,16,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
            />
            {kind}
          </span>
        ))}
      </div>

      {/* Bottom hint */}
      <div
        className="pointer-events-none absolute bottom-3 right-3 z-10 px-2.5 py-1"
        style={{
          color: "rgba(245,239,230,0.5)",
          fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
          fontSize: 9.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          background: "rgba(14,14,16,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {ar
          ? "مرّر للتتبّع · اضغط للأثر · اسحب للتحريك"
          : "hover to trace · click for impact · drag to move"}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Force simulation step
// ──────────────────────────────────────────────────────────────────────

function step(
  nodes: Map<string, SimNode>,
  edges: GEdge[],
  w: number,
  h: number
) {
  const arr = [...nodes.values()];
  const n = arr.length;
  if (n === 0) return;

  // Repulsion (O(n²) — fine for ≤ 100 nodes)
  for (let i = 0; i < n; i++) {
    const a = arr[i];
    if (a.dragging) continue;
    for (let j = i + 1; j < n; j++) {
      const b = arr[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = Math.max(dx * dx + dy * dy, 25);
      const dist = Math.sqrt(distSq);
      const force = REPEL / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      if (!b.dragging) {
        b.vx -= fx;
        b.vy -= fy;
      }
    }
  }

  // Springs (edges)
  for (const e of edges) {
    const a = nodes.get(e.from);
    const b = nodes.get(e.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const desired = SPRING_REST + 30 * (1 - Math.abs(e.weight));
    const diff = dist - desired;
    const f = SPRING_K * diff;
    const fx = (dx / dist) * f;
    const fy = (dy / dist) * f;
    if (!a.dragging) {
      a.vx += fx;
      a.vy += fy;
    }
    if (!b.dragging) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // Gravity to center + damping + integration
  const cx = w / 2;
  const cy = h / 2;
  for (const node of arr) {
    if (node.dragging) continue;
    node.vx += (cx - node.x) * GRAVITY;
    node.vy += (cy - node.y) * GRAVITY;
    node.vx *= DAMP;
    node.vy *= DAMP;
    // Clamp
    if (node.vx > MAX_VEL) node.vx = MAX_VEL;
    if (node.vx < -MAX_VEL) node.vx = -MAX_VEL;
    if (node.vy > MAX_VEL) node.vy = MAX_VEL;
    if (node.vy < -MAX_VEL) node.vy = -MAX_VEL;
    node.x += node.vx;
    node.y += node.vy;
    // Bound
    const pad = node.r + 8;
    if (node.x < pad) { node.x = pad; node.vx *= -0.4; }
    if (node.x > w - pad) { node.x = w - pad; node.vx *= -0.4; }
    if (node.y < pad) { node.y = pad; node.vy *= -0.4; }
    if (node.y > h - pad) { node.y = h - pad; node.vy *= -0.4; }
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
