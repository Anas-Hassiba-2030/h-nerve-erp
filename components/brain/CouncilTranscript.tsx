"use client";

// CouncilTranscript — the ORIGINAL "Claude Design" cosmic-orbit council.
//
// Faithful React port of docs/design/system/sections/council.html +
// council.js: five (or N) specialist voices are SEATS placed around a
// concentric ring, the Brain sits at the centre, and a choreographed
// timeline runs the debate — each voice "thinks" (gold line + dots), then
// "speaks" (a gold beam shoots seat→centre and a debate tile slides into
// the feed), faint tension lines connect opposing stances, and finally the
// Moderator's synthesis fades in with a confidence ring that fills 0→final.
//
// ALL real data is preserved: every voice's bilingual speakerLabel, its
// position (support/oppose/qualify/moderate), its thesis + evidence, and the
// synthesis recommendation / confidence / dissentNote. The confidence
// tick-up behaviour is kept (it now drives BOTH the SVG ring and the number).
//
// Styling lives in app/(app)/brain/council/council-design.css, scoped under
// .dl-page. This component must therefore render inside a DaylightShell.

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import type { CouncilSession, AgentVoice } from "@/lib/brain/council";

// Short persona descriptor under each speaker's name — turns a label into a
// recognisable seat at the table. Bilingual; falls back to nothing if unknown.
const AGENT_ROLE: Record<string, { ar: string; en: string }> = {
  "hospitality-expert": { ar: "أرينا · ضيافة", en: "Arena · hospitality" },
  "dairy-expert":       { ar: "المها · ألبان", en: "Maha · dairy" },
  "agri-expert":        { ar: "لوران · زراعة", en: "Loran · agronomy" },
  "finance-brain":      { ar: "الخزينة والهامش", en: "Treasury & margin" },
  "risk-officer":       { ar: "ضابط المخاطر", en: "Risk officer" },
  moderator:            { ar: "المُيَسّر", en: "Moderator" },
};

const SVGNS = "http://www.w3.org/2000/svg";
const RING_CIRC = 289; // 2πr for r=46 (matches the reference confidence ring)

type Stance = AgentVoice["position"];

function stanceLabel(p: Stance, ar: boolean): string {
  if (ar) {
    return p === "support" ? "يؤيّد"
      : p === "oppose" ? "يعارض"
      : p === "qualify" ? "يتحفّظ"
      : "يتأمّل";
  }
  return p === "support" ? "Supports"
    : p === "oppose" ? "Opposes"
    : p === "qualify" ? "Qualifies"
    : "Moderate";
}

// First visible grapheme of a label → the avatar glyph (matches the reference's
// single-letter seat avatars). Uses Intl.Segmenter when available so Arabic
// clusters render whole; falls back to the first code point.
function glyphOf(label: string): string {
  const trimmed = (label || "").trim();
  if (!trimmed) return "•";
  try {
    // @ts-ignore — Segmenter is widely available; guarded by try/catch.
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      // @ts-ignore
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      const first = seg.segment(trimmed)[Symbol.iterator]().next();
      if (!first.done) return first.value.segment;
    }
  } catch {
    /* fall through */
  }
  return Array.from(trimmed)[0] ?? "•";
}

// Render the thesis with the reference's <b>…</b> emphasis honoured. The live
// thesis text may contain a single emphasised clause wrapped in <b>; we render
// it safely by splitting on the tag rather than using dangerouslySetInnerHTML.
function ThesisText({ text }: { text: string }) {
  const src = text ?? "";
  if (!src.includes("<b>")) return <>{src}</>;
  // Split into [before, bold, after, bold, ...] segments.
  const parts = src.split(/<b>|<\/b>/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>
      )}
    </>
  );
}

export function CouncilTranscript({
  session,
  ar,
}: {
  session: CouncilSession;
  ar: boolean;
}) {
  const voices = session.voices;
  const synthesis = session.synthesis;
  const confidencePct = Math.round((synthesis.confidence ?? 0) * 100);

  // Refs into the stage so the timeline can drive DOM the way council.js does.
  const tableRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const seatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const centerTtlRef = useRef<HTMLDivElement | null>(null);
  const feedTilesRef = useRef<Array<HTMLDivElement | null>>([]);
  const modRef = useRef<HTMLDivElement | null>(null);
  const confRingRef = useRef<SVGCircleElement | null>(null);
  const confValRef = useRef<HTMLElement | null>(null);

  const timersRef = useRef<number[]>([]);
  const rafsRef = useRef<number[]>([]);
  const seatPos = useRef<Array<{ x: number; y: number }>>([]);

  // Confidence target — ticks from 0 → final once the moderator synthesises,
  // exactly as before (the original ticked on mount; here it is driven by the
  // choreography so the ring and number rise together).
  const [, setConfidenceTarget] = useState(0);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    rafsRef.current.forEach((r) => cancelAnimationFrame(r));
    rafsRef.current = [];
  }, []);
  const after = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const centerPt = useCallback(() => {
    const el = tableRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  }, []);

  // Place each seat around the ring — direct port of council.js layoutSeats().
  const layoutSeats = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    const r = table.getBoundingClientRect();
    const cx = r.width / 2;
    const cy = r.height / 2;
    const rad = Math.min(r.width, r.height) * 0.42;
    const n = Math.max(voices.length, 1);
    voices.forEach((_, i) => {
      const ang = ((-90 + i * (360 / n)) * Math.PI) / 180;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad * 0.82;
      const s = seatRefs.current[i];
      if (s) {
        s.style.left = x + "px";
        s.style.top = y + "px";
      }
      seatPos.current[i] = { x, y };
    });
  }, [voices]);

  const makeLine = useCallback(
    (x1: number, y1: number, x2: number, y2: number, cls: string) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const l = document.createElementNS(SVGNS, "line");
      l.setAttribute("x1", String(x1));
      l.setAttribute("y1", String(y1));
      l.setAttribute("x2", String(x2));
      l.setAttribute("y2", String(y2));
      if (cls) l.setAttribute("class", cls);
      svg.appendChild(l);
      return l;
    },
    []
  );

  const reduce = useCallback(
    () =>
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Gold beam seat → centre when an agent speaks (port of speakLine()).
  const speakLine = useCallback(
    (i: number) => {
      const p = seatPos.current[i];
      const c = centerPt();
      if (!p) return;
      const l = makeLine(p.x, p.y, p.x, p.y, "");
      if (!l) return;
      l.setAttribute("stroke", "#DCC38A");
      l.setAttribute("stroke-width", "1.4");
      l.setAttribute("opacity", "0.8");
      if (reduce()) {
        l.setAttribute("x2", String(c.x));
        l.setAttribute("y2", String(c.y));
        after(600, () => l.remove());
        return;
      }
      let t0: number | null = null;
      const dur = 420;
      const step = (now: number) => {
        if (t0 === null) t0 = now;
        const k = Math.min((now - t0) / dur, 1);
        l.setAttribute("x2", String(p.x + (c.x - p.x) * k));
        l.setAttribute("y2", String(p.y + (c.y - p.y) * k));
        if (k < 1) {
          rafsRef.current.push(requestAnimationFrame(step));
        } else {
          l.style.transition = "opacity .5s";
          l.setAttribute("opacity", "0.15");
          after(1200, () => l.remove());
        }
      };
      rafsRef.current.push(requestAnimationFrame(step));
    },
    [after, centerPt, makeLine, reduce]
  );

  // Faint persistent tension lines between opposing stances that have spoken.
  // The reference hardcoded the pairs; we derive them from live data: every
  // "oppose" voice argues with every "support" voice once both have spoken.
  const drawTension = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    Array.from(svg.querySelectorAll(".tension")).forEach((n) => n.remove());
    const spoke = (idx: number) =>
      seatRefs.current[idx]?.classList.contains("spoke");
    voices.forEach((a, ia) => {
      if (a.position !== "oppose" || !spoke(ia)) return;
      voices.forEach((b, ib) => {
        if (b.position !== "support" || !spoke(ib)) return;
        const pa = seatPos.current[ia];
        const pb = seatPos.current[ib];
        if (!pa || !pb) return;
        const l = makeLine(pa.x, pa.y, pb.x, pb.y, "tension");
        if (!l) return;
        l.setAttribute("stroke", "#A86A5C");
        l.setAttribute("stroke-width", "0.8");
        l.setAttribute("opacity", "0.3");
        l.setAttribute("stroke-dasharray", "3 4");
      });
    });
  }, [makeLine, voices]);

  // Confidence ring + numeral (port of setRing/animateRing).
  const setRing = useCallback(
    (p: number) => {
      const ring = confRingRef.current;
      if (ring) ring.setAttribute("stroke-dashoffset", String(RING_CIRC * (1 - p / 100)));
      const val = confValRef.current;
      if (val) {
        const rounded = Math.round(p);
        val.textContent = ar
          ? String(rounded).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
          : String(rounded);
      }
    },
    [ar]
  );
  const animateRing = useCallback(
    (target: number) => {
      if (reduce()) {
        setRing(target);
        setConfidenceTarget(target);
        return;
      }
      let t0: number | null = null;
      const dur = 1100;
      const step = (now: number) => {
        if (t0 === null) t0 = now;
        const k = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - k, 3);
        setRing(target * e);
        if (k < 1) rafsRef.current.push(requestAnimationFrame(step));
        else setConfidenceTarget(target);
      };
      rafsRef.current.push(requestAnimationFrame(step));
    },
    [reduce, setRing]
  );

  // The full choreography (port of runDebate).
  const runDebate = useCallback(() => {
    clearAll();
    const svg = svgRef.current;
    if (svg) Array.from(svg.children).forEach((n) => n.remove());
    seatRefs.current.forEach((s) => s?.classList.remove("thinking", "spoke"));
    feedTilesRef.current.forEach((t) => t?.classList.remove("in"));
    modRef.current?.classList.remove("in");
    setRing(0);
    setConfidenceTarget(0);
    if (centerTtlRef.current) {
      centerTtlRef.current.innerHTML = ar
        ? "الدماغ<b>يستمع</b>"
        : "Brain<b>listening</b>";
    }

    const r = reduce();
    const stepMs = r ? 250 : 1150;
    voices.forEach((_, i) => {
      const base = i * stepMs;
      after(base, () => seatRefs.current[i]?.classList.add("thinking"));
      after(base + (r ? 100 : 520), () => {
        const s = seatRefs.current[i];
        s?.classList.remove("thinking");
        s?.classList.add("spoke");
        speakLine(i);
        feedTilesRef.current[i]?.classList.add("in");
        drawTension();
      });
    });

    const end = voices.length * stepMs + (r ? 200 : 600);
    after(end, () => {
      if (centerTtlRef.current) {
        centerTtlRef.current.innerHTML = ar
          ? "الدماغ<b>يوازن</b>"
          : "Brain<b>weighing</b>";
      }
      modRef.current?.classList.add("in");
      animateRing(confidencePct);
    });
  }, [
    ar,
    after,
    animateRing,
    clearAll,
    confidencePct,
    drawTension,
    reduce,
    setRing,
    speakLine,
    voices,
  ]);

  // Reveal the whole transcript at once — no choreography. Unlike "Replay the
  // debate" (which re-runs the timed animation), this jumps straight to the
  // fully-revealed end state: every voice shown, tension lines drawn, the
  // confidence ring filled. For when the user just wants to read it all now.
  const revealAll = useCallback(() => {
    clearAll();
    seatRefs.current.forEach((s) => {
      s?.classList.remove("thinking");
      s?.classList.add("spoke");
    });
    feedTilesRef.current.forEach((t) => t?.classList.add("in"));
    drawTension();
    if (centerTtlRef.current) {
      centerTtlRef.current.innerHTML = ar ? "الدماغ<b>يوازن</b>" : "Brain<b>weighing</b>";
    }
    modRef.current?.classList.add("in");
    setRing(confidencePct);
    setConfidenceTarget(confidencePct);
  }, [ar, clearAll, confidencePct, drawTension, setRing]);

  // Lay seats out before paint, then run the debate. Re-layout on resize.
  useLayoutEffect(() => {
    layoutSeats();
  }, [layoutSeats]);

  useEffect(() => {
    layoutSeats();
    // Start choreography (pause-aware, like the reference): don't run while hidden.
    if (typeof document !== "undefined" && document.hidden) {
      const onVis = () => {
        if (!document.hidden) {
          runDebate();
          document.removeEventListener("visibilitychange", onVis);
        }
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        document.removeEventListener("visibilitychange", onVis);
        clearAll();
      };
    }
    runDebate();
    const onResize = () => {
      layoutSeats();
      drawTension();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearAll();
    };
    // Re-run when the session changes (replay of a different session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  return (
    <div className="co-wrap">
      {/* ── ribbon: eyebrow + standing intro ───────────────────────────── */}
      <div className="co-ribbon">
        <div className="co-title-box">
          <span className="eb">
            <span className="tick" />
            {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
          </span>
          <h1>{ar ? "المجلس" : "Council"}</h1>
        </div>
        <div className="co-intro">
          {ar
            ? "متخصّصون يتناظرون حول قرار حيّ. يستمع الدماغ، يوازن الحجج، ثم يصوغ التوصية النهائية."
            : "Specialists debate one live decision. The Brain listens, weighs the arguments, then frames the final recommendation."}
        </div>
      </div>

      {/* ── the question on the table ──────────────────────────────────── */}
      <div className="co-question">
        <div className="q-glow" />
        <div className="lbl">{ar ? "السؤال المطروح" : "The question"}</div>
        <h2>{session.topic}</h2>
      </div>

      {/* ── the round table: rings, centre Brain, seats, tension SVG ───── */}
      <div className="co-table" ref={tableRef}>
        <svg className="co-svg" ref={svgRef} />
        <div className="ring-c" />
        <div className="co-center">
          <div className="ttl" ref={centerTtlRef}>
            {ar ? "الدماغ" : "Brain"}
            <b>{ar ? "يستمع" : "listening"}</b>
          </div>
        </div>
        {voices.map((v, i) => {
          const role = AGENT_ROLE[v.agentId];
          return (
            <div
              key={v.agentId + i}
              className={`seat ${v.position}`}
              ref={(el) => {
                seatRefs.current[i] = el;
              }}
            >
              <div className="av">
                {glyphOf(ar ? v.speakerLabel.ar : v.speakerLabel.en)}
                <div className="think">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="nm">{ar ? v.speakerLabel.ar : v.speakerLabel.en}</div>
              {role ? <div className="ro">{ar ? role.ar : role.en}</div> : null}
            </div>
          );
        })}
      </div>

      {/* ── debate feed: one tile per voice (carries the real data) ────── */}
      <div className="co-feed">
        {voices.map((v, i) => {
          const role = AGENT_ROLE[v.agentId];
          return (
            <div
              key={v.agentId + i}
              className={`dbt ${v.position}`}
              ref={(el) => {
                feedTilesRef.current[i] = el;
              }}
            >
              <div className="dav">{glyphOf(ar ? v.speakerLabel.ar : v.speakerLabel.en)}</div>
              <div className="dbody">
                <div className="dhead">
                  <span className="dnm">{ar ? v.speakerLabel.ar : v.speakerLabel.en}</span>
                  {role ? <span className="dro">{ar ? role.ar : role.en}</span> : null}
                  <span className="stance">{stanceLabel(v.position, ar)}</span>
                </div>
                <div className="dtext">
                  <ThesisText text={v.thesis} />
                </div>
                {v.evidence && v.evidence.length > 0 ? (
                  <div className="devid">
                    {v.evidence.map((e, ei) => (
                      <span
                        className="pill"
                        key={ei}
                        title={`weight ${(e.weight * 100).toFixed(0)}%`}
                      >
                        <span
                          className="dot"
                          style={{ opacity: Math.max(0.4, e.weight) }}
                        />
                        {e.label || e.ref}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── moderator synthesis: confidence ring + recommendation + dissent */}
      <div className="co-mod" ref={modRef}>
        <div className="mod-card">
          <div className="ring-wrap">
            <svg width="104" height="104">
              <circle
                cx="52"
                cy="52"
                r="46"
                fill="none"
                stroke="rgba(205,224,214,.15)"
                strokeWidth="7"
              />
              <circle
                ref={confRingRef}
                cx="52"
                cy="52"
                r="46"
                fill="none"
                stroke="url(#co-cg)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC}
              />
              <defs>
                <linearGradient id="co-cg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#DCC38A" />
                  <stop offset="100%" stopColor="#C2A35A" />
                </linearGradient>
              </defs>
            </svg>
            <div className="rtxt">
              <b ref={confValRef}>{ar ? "٠" : "0"}</b>
              <span>{ar ? "الثقة" : "Confidence"}</span>
            </div>
          </div>
          <div className="mod-body">
            <div className="mlbl">◆ {ar ? "توصية المُيَسّر" : "Moderator · synthesis"}</div>
            <h3>{synthesis.recommendation || "—"}</h3>
            {synthesis.dissentNote ? (
              <div className="mod-dissent">
                <span className="dlbl">{ar ? "معارضة مسجّلة" : "Recorded dissent"}</span>
                “{synthesis.dissentNote}”
              </div>
            ) : null}
            <div className="mod-actions">
              <button
                type="button"
                className="dl-btn dl-btn-onnight"
                onClick={revealAll}
              >
                {ar ? "اعرض كل الأصوات دفعة واحدة" : "Show all at once"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── replay the deliberation ────────────────────────────────────── */}
      <div className="co-replay-row">
        <button
          type="button"
          className="dl-btn dl-btn-onnight co-replay"
          onClick={runDebate}
        >
          ↻ {ar ? "أعد النقاش" : "Replay the debate"}
        </button>
      </div>
    </div>
  );
}
