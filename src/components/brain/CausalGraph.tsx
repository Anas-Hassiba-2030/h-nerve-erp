"use client";

// CausalGraph — client port of the Claude Design reference
// (docs/design/system/sections/causal.html + causal-ops.js).
//
// Faithful to the reference's interaction model: an SVG node-edge graph
// where clicking a node lights a BFS cascade of downstream effects, edge
// by edge, with a travelling pulse and a readout. Rebuild shows a
// "thinking" indicator and a toast. The reference's hard-coded NODES/EDGES
// are replaced by the live Prisma graph passed in as props; everything
// else (class names, animation timings, ar() numerals) is preserved.

import { useEffect, useMemo, useRef, useState } from "react";

export type CGNode = { id: string; label: string };
export type CGEdge = { from: string; to: string };

type Props = {
  ar: boolean;
  nodes: CGNode[];
  edges: CGEdge[];
  /** Optional note under the hint — e.g. "showing top N of M entities". */
  subtitle?: string;
  /** Server-action rebuild form, rendered as the primary control. */
  rebuildSlot: React.ReactNode;
};

// Arabic-Indic numerals — mirrors causal-ops.js `ar()`.
function toAr(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

// Deterministic concentric-ring layout inside the 800×440 viewBox.
// One ring works for a handful of nodes; with hundreds of nodes a single
// ring collapses into an unreadable bright band, so we spread them across
// multiple concentric rings sized so each node has ~22px of arc to itself.
function layout(nodes: CGNode[]): Record<string, { x: number; y: number; label: string }> {
  const pos: Record<string, { x: number; y: number; label: string }> = {};
  const cx = 400;
  const cy = 220;
  const n = Math.max(nodes.length, 1);
  const outerRx = 340;
  const outerRy = 195;
  const minArc = 22;
  const outerCirc = 2 * Math.PI * ((outerRx + outerRy) / 2);
  const perRing = Math.max(8, Math.floor(outerCirc / minArc));
  const rings = Math.max(1, Math.ceil(n / perRing));
  const innerRx = rings > 1 ? 70 : outerRx;
  const innerRy = rings > 1 ? 40 : outerRy;
  nodes.forEach((node, i) => {
    const ring = i % rings;
    const idxInRing = Math.floor(i / rings);
    const ringCount = Math.ceil((n - ring) / rings);
    const t = rings === 1 ? 1 : ring / (rings - 1);
    const rx = innerRx + (outerRx - innerRx) * t;
    const ry = innerRy + (outerRy - innerRy) * t;
    const phase = (ring * 0.37) * Math.PI;
    const a = (idxInRing / ringCount) * Math.PI * 2 - Math.PI / 2 + phase;
    pos[node.id] = {
      x: Math.round(cx + rx * Math.cos(a)),
      y: Math.round(cy + ry * Math.sin(a)),
      label: node.label,
    };
  });
  return pos;
}

export function CausalGraph({ ar, nodes, edges, subtitle, rebuildSlot }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const [thinking, setThinking] = useState(false);

  const posById = useMemo(() => layout(nodes), [nodes]);
  // Only keep edges whose endpoints exist in the node set.
  const validEdges = useMemo(
    () => edges.filter((e) => posById[e.from] && posById[e.to]),
    [edges, posById],
  );

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function toast(msg: string) {
    const t = toastRef.current;
    if (!t) return;
    t.textContent = "✦ " + msg;
    t.classList.add("show");
    window.setTimeout(() => t.classList.remove("show"), 2200);
  }

  function clearSel() {
    const svg = svgRef.current;
    if (!svg) return;
    const ec = validEdges.length;
    const baseOp = ec > 600 ? "0.06" : ec > 200 ? "0.1" : ec > 60 ? "0.16" : "0.22";
    const baseW = ec > 200 ? "0.8" : "1.3";
    svg.querySelectorAll(".cg-edge").forEach((l) => {
      l.setAttribute("opacity", baseOp);
      l.setAttribute("stroke", "#C2A35A");
      l.setAttribute("stroke-width", baseW);
    });
    svg.querySelectorAll(".cg-halo").forEach((h) => h.setAttribute("opacity", "0"));
    svg
      .querySelectorAll(".cg-node circle:first-child")
      .forEach((c) => c.setAttribute("fill", "rgba(31,77,63,.85)"));
    const r = svg.parentElement?.querySelector<HTMLDivElement>(".cg-readout");
    r?.classList.remove("show");
  }

  function hl(id: string) {
    const svg = svgRef.current;
    const g = svg?.querySelector(`.cg-node[data-node="${CSS.escape(id)}"]`);
    if (!g) return;
    g.querySelector(".cg-halo")?.setAttribute("opacity", "1");
    g.querySelector("circle")?.setAttribute("fill", "rgba(46,107,87,.95)");
  }

  function lightEdge(i: number) {
    const svg = svgRef.current;
    const l = svg?.querySelector(`.cg-edge[data-edge="${i}"]`);
    if (!l || !svg) return;
    l.setAttribute("opacity", "0.9");
    l.setAttribute("stroke", "#DCC38A");
    l.setAttribute("stroke-width", "2.4");
    if (!reduce) {
      const x1 = +l.getAttribute("x1")!;
      const y1 = +l.getAttribute("y1")!;
      const x2 = +l.getAttribute("x2")!;
      const y2 = +l.getAttribute("y2")!;
      const NS = "http://www.w3.org/2000/svg";
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "3.2");
      c.setAttribute("fill", "#FBF3DC");
      const am = document.createElementNS(NS, "animate");
      am.setAttribute("attributeName", "cx");
      am.setAttribute("from", String(x1));
      am.setAttribute("to", String(x2));
      am.setAttribute("dur", "0.5s");
      am.setAttribute("fill", "freeze");
      const am2 = document.createElementNS(NS, "animate");
      am2.setAttribute("attributeName", "cy");
      am2.setAttribute("from", String(y1));
      am2.setAttribute("to", String(y2));
      am2.setAttribute("dur", "0.5s");
      am2.setAttribute("fill", "freeze");
      c.appendChild(am);
      c.appendChild(am2);
      svg.appendChild(c);
      window.setTimeout(() => c.remove(), 560);
    }
  }

  function readout(start: string, n: number) {
    const svg = svgRef.current;
    const r = svg?.parentElement?.querySelector<HTMLDivElement>(".cg-readout");
    if (!r) return;
    const nm = posById[start]?.label ?? "";
    r.innerHTML = ar
      ? "تغيّر في <b>" + nm + "</b> يؤثّر على <b>" + toAr(n - 1) + "</b> كيانات مرتبطة عبر الرسم السببي."
      : "A change in <b>" + nm + "</b> affects <b>" + (n - 1) + "</b> connected entities across the causal graph.";
    r.classList.add("show");
  }

  // BFS cascade highlight, edge-by-edge with delay — mirrors causal-ops.js.
  function cascade(start: string) {
    clearSel();
    const adj: Record<string, { to: string; edge: number }[]> = {};
    validEdges.forEach((e, i) => {
      (adj[e.from] = adj[e.from] || []).push({ to: e.to, edge: i });
    });
    const visited: Record<string, boolean> = {};
    visited[start] = true;
    let affected = 1;
    hl(start);
    const delay = reduce ? 0 : 260;

    function expand(curr: string[]): string[] {
      const next: string[] = [];
      curr.forEach((id) => {
        (adj[id] || []).forEach((x) => {
          window.setTimeout(() => {
            lightEdge(x.edge);
            if (!visited[x.to]) hl(x.to);
          }, 0);
          if (!visited[x.to]) {
            visited[x.to] = true;
            next.push(x.to);
            affected++;
          }
        });
      });
      return next;
    }
    function run(curr: string[]) {
      if (!curr.length) {
        readout(start, affected);
        return;
      }
      window.setTimeout(() => {
        const nx = expand(curr);
        run(nx);
      }, delay);
    }
    run([start]);
    if (reduce) {
      const seen: Record<string, number> = {};
      seen[start] = 1;
      const q = [start];
      while (q.length) {
        const c = q.shift()!;
        (adj[c] || []).forEach((x) => {
          if (!seen[x.to]) {
            seen[x.to] = 1;
            q.push(x.to);
          }
        });
      }
      readout(start, Object.keys(seen).length);
    }
  }

  // Wire node click handlers after render.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handlers: Array<[Element, () => void]> = [];
    svg.querySelectorAll<SVGGElement>(".cg-node").forEach((g) => {
      const id = g.dataset.node!;
      const fn = () => cascade(id);
      g.addEventListener("click", fn);
      handlers.push([g, fn]);
    });
    return () => handlers.forEach(([el, fn]) => el.removeEventListener("click", fn as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posById, validEdges]);

  function onRebuild() {
    setThinking(true);
    clearSel();
    const svg = svgRef.current;
    if (svg) svg.style.opacity = ".3";
    window.setTimeout(
      () => {
        if (svg) {
          svg.style.transition = "opacity .5s";
          svg.style.opacity = "1";
        }
        setThinking(false);
        toast(
          ar
            ? "أُعيد بناء الرسم السببي · " + toAr(validEdges.length) + " رابط"
            : "Causal graph rebuilt · " + validEdges.length + " edges",
        );
      },
      reduce ? 100 : 1100,
    );
  }

  return (
    <>
      <div className="br-controls">
        <span onClick={onRebuild}>{rebuildSlot}</span>
        <button className="br-btn br-btn-ghost" id="clearBtn" onClick={clearSel}>
          {ar ? "مسح التحديد" : "Clear selection"}
        </button>
        {thinking && (
          <span className="br-thinking" id="thinking" style={{ display: "inline-flex" }}>
            {ar ? "يبني الدماغ الشبكة" : "The brain is building the network"}
            <span className="dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </span>
        )}
      </div>

      <div className="cg-stage">
        <span className="cg-hint">
          {ar ? "انقر عقدة لتتبّع الأثر" : "Click a node to trace the effect"}
          {subtitle ? <span className="cg-sub">{subtitle}</span> : null}
        </span>
        <svg id="cg" ref={svgRef} viewBox="0 0 800 440">
          {(() => {
            const ec = validEdges.length;
            const edgeOp = ec > 600 ? 0.06 : ec > 200 ? 0.1 : ec > 60 ? 0.16 : 0.22;
            const edgeW = ec > 200 ? 0.8 : 1.3;
            return validEdges.map((e, i) => {
              const a = posById[e.from];
              const b = posById[e.to];
              return (
                <line
                  key={`e${i}`}
                  className="cg-edge"
                  data-edge={i}
                  data-from={e.from}
                  data-to={e.to}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#C2A35A"
                  strokeWidth={edgeW}
                  opacity={edgeOp}
                />
              );
            });
          })()}
          {(() => {
            // Readable-hub rendering (2026-07-24): the old design put the full
            // label INSIDE a 26px circle — real entity names overflowed and,
            // with hundreds of nodes, the whole stage collapsed into a
            // hairball. Now: a compact dot with the (truncated) name lettered
            // beside it, alternating above/below the ring so neighbouring
            // labels don't collide. Full name stays available as a tooltip.
            const count = nodes.length;
            const nodeR = count > 200 ? 4 : count > 80 ? 7 : 11;
            const showLabel = count <= 40;
            const trunc = (s: string) => (s.length > 18 ? s.slice(0, 17) + "…" : s);
            return nodes.map((n, i) => {
              const p = posById[n.id];
              const below = i % 2 === 0;
              return (
                <g key={n.id} className="cg-node" data-node={n.id} transform={`translate(${p.x},${p.y})`}>
                  <circle r={nodeR} fill="rgba(31,77,63,.85)" stroke="#C2A35A" strokeWidth={1.5} />
                  <circle className="cg-halo" r={nodeR + 3} fill="none" stroke="#DCC38A" strokeWidth={2} opacity={0} />
                  {showLabel ? (
                    <text
                      textAnchor="middle"
                      dy={below ? nodeR + 16 : -(nodeR + 8)}
                      fill="#fff"
                      fontFamily="Cairo,sans-serif"
                      fontSize={13}
                      fontWeight={700}
                      style={{ paintOrder: "stroke", stroke: "rgba(10,24,19,.85)", strokeWidth: 4 }}
                    >
                      {trunc(n.label)}
                    </text>
                  ) : null}
                  <title>{n.label}</title>
                </g>
              );
            });
          })()}
        </svg>
        <div className="cg-readout" id="readout"></div>
      </div>

      <div className="br-toast" id="toast" ref={toastRef}></div>
    </>
  );
}
