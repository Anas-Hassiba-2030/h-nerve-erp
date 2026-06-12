"use client";

// Live debate choreography — ported from docs/design/system/sections/council.js.
// Five seats around a round table speak in turn (thinking → gold line to centre
// → debate tile slides in). Moderator synthesis fills the confidence ring.
// Replay button reruns the timeline.

import { useEffect, useRef } from "react";

type Stance = "support" | "oppose" | "qualify";

type Agent = {
  id: string;
  nm: string;   // Arabic name
  nmEn: string;
  ro: string;   // role label (Arabic)
  roEn: string;
  glyph: string;
  stance: Stance;
  text: string;    // Arabic body (with <b>)
  textEn: string;
};

const AGENTS_AR: Agent[] = [
  { id: "hosp", nm: "خبير الضيافة", nmEn: "Hospitality", ro: "أرينا", roEn: "Arena", glyph: "ض", stance: "support",
    text: "مؤتمرات أرينا في الربع الثالث ترفع الطلب على الأجبان الفاخرة بأكثر من الثلث. <b>الطلب مضمون</b>.",
    textEn: "Arena Q3 conferences lift premium-cheese demand by over a third. <b>Demand is secured</b>." },
  { id: "agri", nm: "خبير الزراعة", nmEn: "Agriculture", ro: "لوران", roEn: "Loran", glyph: "ز", stance: "qualify",
    text: "العائد يتحسّن، لكن أوصي بربط التوسّع بقدرة التبريد. <b>تدرّج قبل الالتزام الكامل.</b>",
    textEn: "Yield is improving, but tie expansion to chill-chain capacity. <b>Phase before full commitment.</b>" },
  { id: "dairy", nm: "خبير الألبان", nmEn: "Dairy", ro: "المها", roEn: "Maha", glyph: "ل", stance: "support",
    text: "خطوط الإنتاج جاهزة وهامش الجبن الفاخر ٣٨٪. <b>نملك الطاقة الفعلية للمضاعفة.</b>",
    textEn: "Lines are ready, premium-cheese margin is 38%. <b>We have real capacity to double.</b>" },
  { id: "edu", nm: "خبير التعليم", nmEn: "Education", ro: "الأهلية", roEn: "Ahliyya", glyph: "ع", stance: "qualify",
    text: "رأس المال المطلوب قد يزاحم استثمارات أخرى. <b>وازِن التدفق النقدي أولاً.</b>",
    textEn: "Required capital may crowd out other investments. <b>Balance cash flow first.</b>" },
  { id: "risk", nm: "ضابط المخاطر", nmEn: "Risk", ro: "المجموعة", roEn: "Group", glyph: "خ", stance: "oppose",
    text: "خمس وحدات قرب الانتهاء. المضاعفة الآن <b>تضخّم خطر الهدر</b> قبل تصريف المخزون.",
    textEn: "Five units near expiry. Doubling now <b>amplifies waste risk</b> before draining stock." },
];

const TENSION: [string, string][] = [["risk", "hosp"], ["risk", "dairy"], ["agri", "dairy"]];

const STANCE_LBL = {
  support: { ar: "يؤيّد", en: "Supports" },
  oppose:  { ar: "يعارض", en: "Opposes"  },
  qualify: { ar: "يتحفّظ", en: "Qualifies" },
} as const;

const SVGNS = "http://www.w3.org/2000/svg";

export function CouncilStage({ ar }: { ar: boolean }) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const modRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const ringValRef = useRef<HTMLElement | null>(null);
  const centerTtlRef = useRef<HTMLDivElement | null>(null);
  const seatElsRef = useRef<Record<string, HTMLDivElement>>({});
  const seatPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const CIRC = 289;

    function toAr(n: number | string): string {
      return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
    }
    function setRing(p: number) {
      ringRef.current?.setAttribute("stroke-dashoffset", String(CIRC * (1 - p / 100)));
      if (ringValRef.current) ringValRef.current.textContent = ar ? toAr(Math.round(p)) : String(Math.round(p));
    }

    function layoutSeats() {
      const table = tableRef.current;
      if (!table) return;
      const r = table.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const rad = Math.min(r.width, r.height) * 0.42;
      AGENTS_AR.forEach((a, i) => {
        const ang = (-90 + i * (360 / AGENTS_AR.length)) * Math.PI / 180;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad * 0.82;
        let s = seatElsRef.current[a.id];
        if (!s) {
          s = document.createElement("div");
          s.className = "seat " + a.stance;
          s.dataset.id = a.id;
          s.innerHTML =
            `<div class="av">${a.glyph}<div class="think"><span></span><span></span><span></span></div></div>` +
            `<div class="nm">${ar ? a.nm : a.nmEn}</div><div class="ro">${ar ? a.ro : a.roEn}</div>`;
          table.appendChild(s);
          seatElsRef.current[a.id] = s;
        }
        s.style.left = `${x}px`;
        s.style.top = `${y}px`;
        seatPosRef.current[a.id] = { x, y };
      });
    }

    function centerPt() {
      const t = tableRef.current!;
      const r = t.getBoundingClientRect();
      return { x: r.width / 2, y: r.height / 2 };
    }

    function line(x1: number, y1: number, x2: number, y2: number, cls: string) {
      const l = document.createElementNS(SVGNS, "line");
      l.setAttribute("x1", String(x1));
      l.setAttribute("y1", String(y1));
      l.setAttribute("x2", String(x2));
      l.setAttribute("y2", String(y2));
      l.setAttribute("class", cls);
      svgRef.current?.appendChild(l);
      return l;
    }

    function speakLine(a: Agent) {
      const p = seatPosRef.current[a.id], c = centerPt();
      const l = line(p.x, p.y, p.x, p.y, "");
      l.setAttribute("stroke", "#DCC38A");
      l.setAttribute("stroke-width", "1.4");
      l.setAttribute("opacity", "0.8");
      if (reduce) {
        l.setAttribute("x2", String(c.x));
        l.setAttribute("y2", String(c.y));
        setTimeout(() => l.remove(), 600);
        return;
      }
      let t0: number | null = null;
      const dur = 420;
      function step(now: number) {
        if (!t0) t0 = now;
        const k = Math.min((now - t0) / dur, 1);
        l.setAttribute("x2", String(p.x + (c.x - p.x) * k));
        l.setAttribute("y2", String(p.y + (c.y - p.y) * k));
        if (k < 1) requestAnimationFrame(step);
        else {
          (l as unknown as HTMLElement).style.transition = "opacity .5s";
          l.setAttribute("opacity", "0.15");
          setTimeout(() => l.remove(), 1200);
        }
      }
      requestAnimationFrame(step);
    }

    function drawTension() {
      const sv = svgRef.current;
      if (!sv) return;
      Array.from(sv.querySelectorAll(".tension")).forEach((n) => n.remove());
      TENSION.forEach((pair) => {
        const a = seatElsRef.current[pair[0]];
        const b = seatElsRef.current[pair[1]];
        if (!a || !b) return;
        if (!a.classList.contains("spoke") || !b.classList.contains("spoke")) return;
        const pa = seatPosRef.current[pair[0]];
        const pb = seatPosRef.current[pair[1]];
        const l = line(pa.x, pa.y, pb.x, pb.y, "tension");
        l.setAttribute("stroke", "#A86A5C");
        l.setAttribute("stroke-width", "0.8");
        l.setAttribute("opacity", "0.3");
        l.setAttribute("stroke-dasharray", "3 4");
      });
    }

    function tile(a: Agent) {
      const feed = feedRef.current!;
      const d = document.createElement("div");
      d.className = "dbt " + a.stance;
      const stanceLbl = ar ? STANCE_LBL[a.stance].ar : STANCE_LBL[a.stance].en;
      d.innerHTML =
        `<div class="dav">${a.glyph}</div><div class="dbody">` +
        `<div class="dhead"><span class="dnm">${ar ? a.nm : a.nmEn}</span><span class="stance">${stanceLbl}</span></div>` +
        `<div class="dtext">${ar ? a.text : a.textEn}</div></div>`;
      feed.appendChild(d);
      requestAnimationFrame(() => { requestAnimationFrame(() => { d.classList.add("in"); }); });
    }

    function clearTimers() {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    }
    function after(ms: number, fn: () => void) {
      timersRef.current.push(setTimeout(fn, ms));
    }

    function animateRing(target: number) {
      if (reduce) { setRing(target); return; }
      let t0: number | null = null;
      const dur = 1100;
      function step(now: number) {
        if (!t0) t0 = now;
        const k = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - k, 3);
        setRing(target * e);
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function runDebate() {
      clearTimers();
      if (feedRef.current) feedRef.current.innerHTML = "";
      const sv = svgRef.current;
      if (sv) Array.from(sv.children).forEach((n) => n.remove());
      Object.values(seatElsRef.current).forEach((s) => s.classList.remove("thinking", "spoke"));
      modRef.current?.classList.remove("in");
      setRing(0);
      if (centerTtlRef.current) centerTtlRef.current.innerHTML = ar ? "الدماغ<b>يستمع</b>" : "Brain<b>listens</b>";

      const step = reduce ? 250 : 1150;
      AGENTS_AR.forEach((a, i) => {
        const base = i * step;
        after(base, () => { seatElsRef.current[a.id]?.classList.add("thinking"); });
        after(base + (reduce ? 100 : 520), () => {
          seatElsRef.current[a.id]?.classList.remove("thinking");
          seatElsRef.current[a.id]?.classList.add("spoke");
          speakLine(a);
          tile(a);
          drawTension();
        });
      });
      const end = AGENTS_AR.length * step + (reduce ? 200 : 600);
      after(end, () => {
        if (centerTtlRef.current) centerTtlRef.current.innerHTML = ar ? "الدماغ<b>يوازن</b>" : "Brain<b>weighs</b>";
        modRef.current?.classList.add("in");
        animateRing(84);
      });
    }

    layoutSeats();
    const onResize = () => { layoutSeats(); drawTension(); };
    window.addEventListener("resize", onResize);

    if (document.hidden) {
      const onVis = () => {
        if (!document.hidden) {
          runDebate();
          document.removeEventListener("visibilitychange", onVis);
        }
      };
      document.addEventListener("visibilitychange", onVis);
    } else {
      runDebate();
    }

    const onReplay = () => runDebate();
    const btn = document.getElementById("co-replay-btn");
    btn?.addEventListener("click", onReplay);

    return () => {
      clearTimers();
      window.removeEventListener("resize", onResize);
      btn?.removeEventListener("click", onReplay);
    };
  }, [ar]);

  return (
    <>
      <div className="co-question">
        <div className="q-glow" />
        <div className="lbl">{ar ? "السؤال المطروح" : "The question"}</div>
        <h2>{ar ? "هل نضاعف إنتاج جبن المها للربع الثالث؟" : "Do we double Maha cheese output for Q3?"}</h2>
      </div>

      <div className="co-table" ref={tableRef}>
        <svg className="co-svg" ref={svgRef} />
        <div className="ring-c" />
        <div className="co-center">
          <div className="ttl" ref={centerTtlRef} dangerouslySetInnerHTML={{ __html: ar ? "الدماغ<b>يستمع</b>" : "Brain<b>listens</b>" }} />
        </div>
      </div>

      <div className="co-feed" ref={feedRef} />

      <div className="co-mod" ref={modRef}>
        <div className="mod-card">
          <div className="ring-wrap">
            <svg width="104" height="104">
              <defs>
                <linearGradient id="co-cg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#DCC38A" />
                  <stop offset="100%" stopColor="#C2A35A" />
                </linearGradient>
              </defs>
              <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(205,224,214,.15)" strokeWidth="7" />
              <circle ref={ringRef} cx="52" cy="52" r="46" fill="none" stroke="url(#co-cg)" strokeWidth="7" strokeLinecap="round" strokeDasharray="289" strokeDashoffset="289" />
            </svg>
            <div className="rtxt">
              <b ref={(el) => { ringValRef.current = el; }}>{ar ? "٠" : "0"}</b>
              <span>{ar ? "الثقة" : "Confidence"}</span>
            </div>
          </div>
          <div className="mod-body">
            <div className="mlbl">{ar ? "◆ توصية المُنسّق" : "◆ Moderator's synthesis"}</div>
            <h3>{ar ? "توسّع تدريجي ومشروط — لا مضاعفة كاملة" : "Phased, conditional expansion — not a full double"}</h3>
            <p>
              {ar
                ? "صرّف الدفعات الخمس القريبة من الانتهاء خلال ٧٢ ساعة، ثم ارفع الطاقة ٦٠٪ قبل مؤتمرات الربع الثالث. يلتقط معظم الطلب مع احتواء خطر الهدر."
                : "Drain the five near-expiry batches within 72h, then raise capacity 60% before the Q3 conferences. Captures most of the demand while containing waste risk."}
            </p>
          </div>
        </div>
      </div>

      <div className="co-replay-row">
        <button id="co-replay-btn" className="dl-btn dl-btn-secondary co-replay dl-btn-onnight">
          {ar ? "↻ أعد النقاش" : "↻ Replay the debate"}
        </button>
      </div>
    </>
  );
}
