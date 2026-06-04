// useScenario — stateful logic for the Scenario what-if simulator.
//
// Extracted verbatim from Scenario.tsx: owns the source/delta levers, the
// real causal-graph weighted-BFS engine call, every derived KPI, the
// causal-wave + flinch choreography, the auto-solve lever animation, and
// the flow-wire geometry. The component stays mostly-rendering.

import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphNode, GraphEdge } from "@/lib/brain/graph";
import { simulateOnSnapshot } from "@/lib/brain/simulator.bfs";
import type { ImpactRow } from "@/lib/brain/simulator";

const HUB_KINDS = new Set(["Company", "Hotel", "Farm", "Program", "Forecast", "Insight"]);

export function useScenario({
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

  const initialSource = defaultSourceId ?? hubs[0]?.id ?? "";
  const [sourceId, setSourceId] = useState<string>(initialSource);
  const DEFAULT_DELTA = -0.4; // opens with a bang — a 40% shock
  const [delta, setDelta] = useState(DEFAULT_DELTA);

  const source = useMemo(
    () => nodes.find((n) => n.id === sourceId) ?? null,
    [nodes, sourceId]
  );

  // ── THE ENGINE (unchanged): real causal-graph weighted BFS ──────────────
  const impact = useMemo<ImpactRow[]>(() => {
    if (!source || Math.abs(delta) < 0.001) return [];
    return simulateOnSnapshot({ nodes, edges }, { nodeId: source.id, delta });
  }, [nodes, edges, source, delta]);

  // ── derived result KPIs (all from the engine output) ────────────────────
  const totalAffected = impact.length;
  const top3 = impact.slice(0, 3);
  // top exposure = largest absolute projected move downstream
  const topExposure = impact.length
    ? Math.max(...impact.map((r) => Math.abs(r.projectedDelta)))
    : 0;
  // average confidence across the affected set
  const avgConf =
    impact.length > 0
      ? impact.reduce((a, r) => a + r.confidence, 0) / impact.length
      : 0;
  // RISK index (0..100): confidence-weighted share of downstream that moves
  // ADVERSELY in the same direction as the shock. A downward shock that drags
  // many high-confidence nodes down is "risky"; effects that buck the shock
  // (hedges) reduce risk. Pure function of the engine's rows.
  const riskIndex = useMemo(() => {
    if (!impact.length || Math.abs(delta) < 0.001) return 0;
    const shockDir = Math.sign(delta);
    let adverse = 0;
    let total = 0;
    for (const r of impact) {
      const mag = Math.abs(r.projectedDelta) * r.confidence;
      total += mag;
      // "adverse" = moves the same way as the shock (amplifies the disturbance)
      if (Math.sign(r.projectedDelta) === shockDir) adverse += mag;
    }
    if (total === 0) return 0;
    return Math.round((adverse / total) * 100);
  }, [impact, delta]);

  // bilingual editorial narrative — kept from the prior implementation, but
  // rendered into the night-register .narr line with up/down spans.
  const narrative = useMemo(() => {
    if (!source || Math.abs(delta) < 0.005) {
      return null; // → falls back to the resting prompt
    }
    const direction = delta < 0 ? (ar ? "تنخفض" : "drops") : ar ? "ترتفع" : "rises";
    const pctAbs = Math.abs(delta * 100).toFixed(0);
    const dirTop = (r: ImpactRow) =>
      r.projectedDelta < 0 ? (ar ? "تنخفض" : "falls") : ar ? "ترتفع" : "rises";
    return { direction, pctAbs, dirTop };
  }, [source, delta, ar]);

  // ── causal-wave + flinch (the reference's "soul") ───────────────────────
  const reduce = usePrefersReducedMotion();
  const [hubIntense, setHubIntense] = useState(false);
  const [litSource, setLitSource] = useState(false);
  const [flinching, setFlinching] = useState<Record<string, number>>({});
  const [solving, setSolving] = useState(false);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // fire a gold pulse along the wires and make outputs flinch on arrival
  const fireWave = useRef<() => void>(() => {});
  fireWave.current = () => {
    if (Math.abs(delta) < 0.005 || !impact.length) return;
    if (reduce) {
      bumpFlinch(top3.map((r) => r.node.id));
      return;
    }
    setLitSource(true);
    pulseWires("in");
    window.setTimeout(() => {
      setHubIntense(true);
      pulseWires("out", () => bumpFlinch(top3.map((r) => r.node.id)));
      window.setTimeout(() => {
        if (!solvingRef.current) setHubIntense(false);
        setLitSource(false);
      }, 520);
    }, 380);
  };

  function bumpFlinch(ids: string[]) {
    setFlinching((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
  }

  // animate a gold dot along each wire group
  function pulseWires(group: "in" | "out", onArrive?: () => void) {
    const svg = svgRef.current;
    if (!svg) {
      if (onArrive) onArrive();
      return;
    }
    const paths = svg.querySelectorAll<SVGPathElement>(`path[data-grp="${group}"]`);
    let arrived = false;
    paths.forEach((p) => {
      const d = p.getAttribute("d");
      if (!d) return;
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", "1.3");
      c.setAttribute("fill", "#FBF3DC");
      const am = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
      const dur = group === "in" ? 0.38 : 0.36;
      am.setAttribute("dur", dur + "s");
      am.setAttribute("repeatCount", "1");
      am.setAttribute("path", d);
      am.setAttribute("fill", "freeze");
      c.appendChild(am);
      svg.appendChild(c);
      if (am.beginElement) { try { am.beginElement(); } catch { /* ignore */ } }
      window.setTimeout(() => {
        c.remove();
        if (!arrived) { arrived = true; if (onArrive) onArrive(); }
      }, dur * 1000);
    });
    if (paths.length === 0 && onArrive) onArrive();
  }

  // keep a ref of `solving` for timers
  const solvingRef = useRef(false);
  useEffect(() => { solvingRef.current = solving; }, [solving]);

  // fire the wave whenever the user changes inputs (debounced), unless solving
  const waveTimer = useRef<number | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (solvingRef.current) return;
    if (waveTimer.current) window.clearTimeout(waveTimer.current);
    waveTimer.current = window.setTimeout(() => fireWave.current(), 90);
    return () => { if (waveTimer.current) window.clearTimeout(waveTimer.current); };
    // re-run when the engine output identity changes (inputs changed)
  }, [sourceId, delta, impact]);

  // the room reacts: vignette on high risk, reward glow on benign/positive,
  // brain spins faster the harder the shock is pushed.
  const pushAbs = Math.min(1, Math.abs(delta));
  const vignetteOpacity = Math.min(0.8, (riskIndex / 100) * (pushAbs) * 1.1);
  const rewardOpacity =
    delta >= 0 ? Math.min(0.7, pushAbs * 1.4) : Math.min(0.4, (1 - riskIndex / 100) * pushAbs);
  const spinSeconds = (24 - pushAbs * 17).toFixed(1);
  useEffect(() => {
    if (pushAbs > 0.04 && !solvingRef.current) setHubIntense(true);
    else if (!solvingRef.current) setHubIntense(false);
  }, [pushAbs]);

  // ── auto-solve: the Brain animates the lever toward a decisive shock ─────
  const rafRef = useRef<number | null>(null);
  function clearRaf() { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; }

  function animateDeltaTo(target: number, durationMs: number, onDone?: () => void) {
    clearRaf();
    const start = delta;
    const startT = performance.now();
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now: number) => {
      const p = Math.min((now - startT) / durationMs, 1);
      const e = ease(p);
      // a little exploratory wobble while "searching", settling at the end
      const wob = (1 - p) * Math.sin(p * 18) * 0.06;
      let v = start + (target - start) * e + wob;
      v = Math.max(-1, Math.min(1, v));
      setDelta(v);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { setDelta(target); rafRef.current = null; if (onDone) onDone(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function handleSolve() {
    if (solving) return;
    setSolving(true);
    setHubIntense(true);
    // the "optimal probe" — a decisive downward shock that maximises the
    // visible causal wave for the chosen source. (Engine math untouched.)
    const target = -0.6;
    if (reduce) {
      setDelta(target);
      setSolving(false);
      window.setTimeout(() => fireWave.current(), 30);
      return;
    }
    animateDeltaTo(target, 2200, () => {
      window.setTimeout(() => {
        setSolving(false);
        fireWave.current();
      }, 120);
    });
  }

  function handleReset() {
    if (solving) return;
    if (reduce) { setDelta(DEFAULT_DELTA); return; }
    animateDeltaTo(DEFAULT_DELTA, 900);
  }

  const [saved, setSaved] = useState(false);
  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  useEffect(() => () => clearRaf(), []);

  // initial wave on mount (so the page opens "alive")
  useEffect(() => {
    const t = window.setTimeout(() => fireWave.current(), 260);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── flow geometry: source(s) on the left, hub center, top impacts right ──
  // The "input" side shows the perturbed source node (the lever subject).
  const inNodes = source ? [source] : [];
  const outNodes = top3;
  const wires = useMemo(
    () => buildWires(inNodes.length, outNodes.length),
    [inNodes.length, outNodes.length]
  );

  const sliderFill = ((delta + 1) / 2) * 100; // -1..1 → 0..100%

  return {
    hubs,
    sourceId,
    setSourceId,
    delta,
    setDelta,
    source,
    totalAffected,
    top3,
    topExposure,
    avgConf,
    riskIndex,
    narrative,
    hubIntense,
    litSource,
    flinching,
    solving,
    flowRef,
    svgRef,
    vignetteOpacity,
    rewardOpacity,
    spinSeconds,
    handleSolve,
    handleReset,
    saved,
    handleSave,
    inNodes,
    outNodes,
    wires,
    sliderFill,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Wire geometry: S-curves from inputs → hub (center) → outputs, in the
// flow panel's 0..100 viewBox. Mirrors the reference's path() helper.
// ─────────────────────────────────────────────────────────────────────────

type Wire = { id: string; grp: "in" | "out"; d: string };

function buildWires(inN: number, outN: number): Wire[] {
  const out: Wire[] = [];
  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };
  // inputs on the left edge (x=2) flow into the hub edge (x=46)
  for (let i = 0; i < Math.max(1, inN); i++) {
    const y = ((i + 0.5) / Math.max(1, inN)) * 100;
    out.push({ id: "win_" + i, grp: "in", d: curve(2, y, 46, 50) });
  }
  // hub (x=54) flows out to the right edge (x=98)
  for (let j = 0; j < Math.max(1, outN); j++) {
    const y2 = ((j + 0.5) / Math.max(1, outN)) * 100;
    out.push({ id: "wout_" + j, grp: "out", d: curve(54, 50, 98, y2) });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}
