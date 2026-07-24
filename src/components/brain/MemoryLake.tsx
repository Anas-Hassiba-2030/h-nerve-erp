"use client";

// MemoryLake — client port of the Claude Design reference
// (docs/design/system/sections/memory.html + memory.js).
//
// Ports the contemplative timeline + lake recall interaction:
//   • timeline with alternating left/right cards along a central rule
//   • intersection-observer reveal on scroll
//   • hover any memory → draw emerald SVG bezier "recall" lines to the
//     related memories, brighten them, dim the rest
//   • filter pills (sector / outcome / year) + free-text search
//
// Real data is fed in from the server; everything else (class names,
// animation timings, ar() numerals) is faithful to memory.js.

import { useEffect, useMemo, useRef, useState } from "react";

export type MemoryItem = {
  id: string;
  date: string;        // bilingual rendered date (e.g. "٢٠٢٥ · أيار" or "Aug 2025")
  yr: string;          // year as ISO string for the year filter ("2024" | "2025" | …)
  dom: string;         // sector label as it appears on the chip ("ضيافة", "ألبان", …)
  out: "good" | "bad"; // outcome tier
  sit: string;         // headline / situation
  dec: string;         // decision text (no leading "القرار: ")
  outBadge: { good: string; bad: string }; // bilingual badge labels
  decLabel: string;    // "القرار:" / "Decision:"
  tags: string[];      // for free-text search
  related: string[];   // ids of related memories
};

type Props = {
  ar: boolean;
  memories: MemoryItem[];
  /** distinct sector labels in the current dataset, in display order. */
  domains: string[];
  /** distinct years in the current dataset, ascending. */
  years: string[];
  labels: {
    sector: string; outcome: string; year: string; all: string;
    good: string; bad: string;
    searchPlaceholder: string;
    empty: string;
  };
};

function toAr(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export function MemoryLake({ ar, memories, domains, years, labels }: Props) {
  const tlRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const memRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [filters, setFilters] = useState<{ dom: string; out: string; yr: string }>({
    dom: "all", out: "all", yr: "all",
  });
  const [query, setQuery] = useState("");

  const byId = useMemo(() => {
    const m: Record<string, MemoryItem> = {};
    memories.forEach((mem) => { m[mem.id] = mem; });
    return m;
  }, [memories]);

  // Visible after filters + search.
  const visibility = useMemo(() => {
    const vis: Record<string, boolean> = {};
    const q = query.trim().toLowerCase();
    memories.forEach((m) => {
      let ok =
        (filters.dom === "all" || m.dom === filters.dom) &&
        (filters.out === "all" || m.out === filters.out) &&
        (filters.yr === "all" || m.yr === filters.yr);
      if (ok && q) {
        const hay = (m.sit + " " + m.dec + " " + m.tags.join(" ") + " " + m.dom).toLowerCase();
        ok = q.split(/\s+/).some((w) => w && hay.indexOf(w) >= 0);
      }
      vis[m.id] = ok;
    });
    return vis;
  }, [memories, filters, query]);

  const shown = useMemo(
    () => Object.values(visibility).filter(Boolean).length,
    [visibility],
  );

  // Reveal-on-scroll. The reference toggles `.in` via IntersectionObserver.
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tl = tlRef.current;
    if (!tl) return;
    const nodes = Array.from(tl.querySelectorAll<HTMLDivElement>(".mem"));
    if (reduce || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -6% 0px" },
    );
    nodes.forEach((n) => io.observe(n));
    // Also reveal any already-on-screen nodes immediately.
    requestAnimationFrame(() => {
      nodes.forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95) {
          n.classList.add("in");
          io.unobserve(n);
        }
      });
    });
    return () => io.disconnect();
  }, [memories]);

  function clearRecall() {
    const svg = svgRef.current;
    if (svg) Array.from(svg.querySelectorAll(".recall-ln")).forEach((n) => n.remove());
    memRefs.current.forEach((el) => el.classList.remove("dim", "related"));
  }

  function recall(m: MemoryItem) {
    const el = memRefs.current.get(m.id);
    if (!el || !el.classList.contains("in")) return;
    clearRecall();
    const rel = (m.related || []).filter((id) => {
      const ref = memRefs.current.get(id);
      return ref && !ref.classList.contains("hidden");
    });
    memRefs.current.forEach((other, id) => {
      if (id !== m.id && rel.indexOf(id) < 0) other.classList.add("dim");
    });
    rel.forEach((id) => memRefs.current.get(id)?.classList.add("related"));
    el.classList.add("related");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const tl = tlRef.current;
    const svg = svgRef.current;
    if (!tl || !svg) return;
    const tlRect = tl.getBoundingClientRect();
    function nodeCenter(memEl: HTMLDivElement) {
      const node = memEl.querySelector(".node") as HTMLElement | null;
      if (!node) return { x: 0, y: 0 };
      const n = node.getBoundingClientRect();
      return { x: n.left + n.width / 2 - tlRect.left, y: n.top + n.height / 2 - tlRect.top };
    }
    const a = nodeCenter(el);
    rel.forEach((id) => {
      const ref = memRefs.current.get(id);
      if (!ref) return;
      const b = nodeCenter(ref);
      const d = `M${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`;
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "#7E9B86");
      p.setAttribute("stroke-width", "1.4");
      p.setAttribute("opacity", "0");
      p.setAttribute("class", "recall-ln");
      svg.appendChild(p);
      try {
        const len = (p as any).getTotalLength?.() ?? 0;
        if (len) {
          p.style.strokeDasharray = String(len);
          p.style.strokeDashoffset = String(len);
          p.animate(
            [
              { strokeDashoffset: len, opacity: 0.2 },
              { strokeDashoffset: 0, opacity: 0.75 },
            ],
            { duration: 420, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" },
          );
        } else {
          p.setAttribute("opacity", ".7");
        }
      } catch {
        p.setAttribute("opacity", ".7");
      }
    });
  }

  const arN = (n: number) => (ar ? toAr(n) : String(n));

  return (
    <>
      <div id="lake" aria-hidden>
        <div className="wave w1"></div>
        <div className="wave w2"></div>
        <div className="wave w3"></div>
      </div>

      <div className="ml-ribbon">
        <div className="ml-title-box">
          <span className="eb">
            <span className="tick"></span>
            {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
          </span>
          <h1>{ar ? "ذاكرة القرارات" : "Decision Memory"}</h1>
        </div>
        <div className="ml-search">
          <span className="ic">⌕</span>
          <input
            id="ask"
            type="text"
            placeholder={labels.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* Count string is built HERE (client side) from `ar`, not passed in
              as a function prop — a Server Component cannot pass a function to a
              Client Component (it throws "Functions cannot be passed directly to
              Client Components"), which crashed /brain/memory the moment it had
              any rows to render. */}
          <span className="cnt">
            {ar
              ? `${arN(shown)} من ${arN(memories.length)} ذكرى`
              : `${arN(shown)} of ${arN(memories.length)} memories`}
          </span>
        </div>
      </div>

      <div className="ml-filters">
        <div className="ml-fgroup">
          <span className="glbl">{labels.sector}</span>
          <button
            type="button"
            className={`pill ${filters.dom === "all" ? "on" : ""}`}
            onClick={() => setFilters((f) => ({ ...f, dom: "all" }))}
          >
            {labels.all}
          </button>
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              className={`pill ${filters.dom === d ? "on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, dom: d }))}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="ml-fgroup">
          <span className="glbl">{labels.outcome}</span>
          <button
            type="button"
            className={`pill ${filters.out === "all" ? "on" : ""}`}
            onClick={() => setFilters((f) => ({ ...f, out: "all" }))}
          >
            {labels.all}
          </button>
          <button
            type="button"
            className={`pill ${filters.out === "good" ? "on" : ""}`}
            onClick={() => setFilters((f) => ({ ...f, out: "good" }))}
          >
            {labels.good}
          </button>
          <button
            type="button"
            className={`pill ${filters.out === "bad" ? "on" : ""}`}
            onClick={() => setFilters((f) => ({ ...f, out: "bad" }))}
          >
            {labels.bad}
          </button>
        </div>
        <div className="ml-fgroup">
          <span className="glbl">{labels.year}</span>
          <button
            type="button"
            className={`pill ${filters.yr === "all" ? "on" : ""}`}
            onClick={() => setFilters((f) => ({ ...f, yr: "all" }))}
          >
            {labels.all}
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={`pill ${filters.yr === y ? "on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, yr: y }))}
            >
              {ar ? toAr(y) : y}
            </button>
          ))}
        </div>
      </div>

      <div className="ml-timeline" id="timeline" ref={tlRef}>
        <svg id="recallSvg" ref={svgRef}></svg>
        {memories.map((m, i) => {
          const side = i % 2 === 0 ? "left" : "right";
          const hidden = !visibility[m.id];
          return (
            <div
              key={m.id}
              ref={(el) => {
                if (el) memRefs.current.set(m.id, el);
                else memRefs.current.delete(m.id);
              }}
              className={`mem ${side}${hidden ? " hidden" : ""}`}
              data-id={m.id}
              onMouseEnter={() => recall(m)}
              onMouseLeave={clearRecall}
            >
              <span className="node"></span>
              <div className="mcard">
                <div className="date">{m.date}</div>
                <div className="sit">{m.sit}</div>
                <div className="dec">
                  <b>{m.decLabel}</b> {m.dec}
                </div>
                <div className="foot">
                  {m.out === "good" ? (
                    <span className="badge good">✓ {m.outBadge.good}</span>
                  ) : (
                    <span className="badge bad">△ {m.outBadge.bad}</span>
                  )}
                  <span className="dom">{m.dom}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {shown === 0 ? <div className="ml-empty">{labels.empty}</div> : null}
    </>
  );
}
