// useGraphCanvas — stateful logic for the GraphCanvas visualization.
//
// Extracted verbatim from GraphCanvas.tsx: owns the force-sim ref, the
// resize observer, the animation loop, BFS shockwave click handler, drag
// teardown, and every derived value the SVG render consumes. The component
// stays mostly-rendering.

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import type { GNode, GEdge, SimNode } from "./GraphCanvas";

const REPEL = 5400;
const SPRING_K = 0.025;
const SPRING_REST = 124;
const GRAVITY = 0.011;
const DAMP = 0.86;
const MAX_VEL = 24;

export function useGraphCanvas({
  nodes: rawNodes,
  edges: rawEdges,
  onSelectNode,
}: {
  nodes: GNode[];
  edges: GEdge[];
  onSelectNode?: (n: GNode | null) => void;
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

  return {
    containerRef,
    size,
    selected,
    hoveredId,
    setHoveredId,
    tick,
    affected,
    neighbors,
    onNodeClick,
    sim,
    isPulsing,
    pulseFrac,
  };
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
