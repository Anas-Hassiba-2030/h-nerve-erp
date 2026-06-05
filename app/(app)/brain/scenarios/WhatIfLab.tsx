"use client";

// Live What-If simulator — ported from docs/design/system/sections/whatif.js.
// Five levers → causal flow → four KPIs. Moving a lever fires a gold pulse from
// the input wire through the brain hub out to each KPI, which flinches on
// arrival. Auto-solve animates levers to an optimal config. Reset returns.

import { useEffect, useRef } from "react";

type Lever = {
  id: "arenaPrice" | "mahaOutput" | "newInvest" | "annualReturn" | "students";
  name: string; nameEn: string;
  unit: string; unitEn: string;
  min: number; max: number; base: number; step: number;
  w: Partial<{ rev: number; net: number; risk: number; iq: number }>;
};

const LEVERS: Lever[] = [
  { id: "arenaPrice", name: "سعر غرفة أرينا", nameEn: "Arena room rate", unit: "د.أ", unitEn: "JOD",
    min: 60, max: 140, base: 96, step: 1, w: { rev: 0.9, net: 1.3, risk: 0.5 } },
  { id: "mahaOutput", name: "إنتاج المها", nameEn: "Maha output", unit: "ألف لتر", unitEn: "k L",
    min: 8, max: 26, base: 14.5, step: 0.5, w: { rev: 0.5, net: 0.4, risk: 0.35, iq: 0.1 } },
  { id: "newInvest", name: "استثمار جديد", nameEn: "New investment", unit: "مليون د.أ", unitEn: "M JOD",
    min: 0, max: 20, base: 4, step: 0.5, w: { net: -0.6, rev: 0.3, risk: 0.7, iq: 0.25 } },
  { id: "annualReturn", name: "العائد السنوي المستهدف", nameEn: "Target annual return", unit: "٪", unitEn: "%",
    min: 4, max: 24, base: 12, step: 0.5, w: { net: 0.8, risk: 0.9 } },
  { id: "students", name: "عدد طلبة الأهلية", nameEn: "Ahliyya students", unit: "", unitEn: "",
    min: 6000, max: 12000, base: 8420, step: 100, w: { rev: 0.6, net: 0.5, risk: -0.15 } },
];

const OUTS = [
  { id: "rev", lbl: "الإيراد", lblEn: "Revenue" },
  { id: "net", lbl: "صافي الربح", lblEn: "Net profit" },
  { id: "iq", lbl: "ذكاء الدماغ", lblEn: "Brain IQ" },
  { id: "risk", lbl: "المخاطرة", lblEn: "Risk" },
] as const;

const BASE = { net: 97643, rev: 137465, iq: 92, risk: 31 };
const SVGNS = "http://www.w3.org/2000/svg";

function toAr(n: number | string, isAr: boolean): string {
  if (!isAr) return String(n);
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
function grp(n: number, isAr: boolean): string {
  return toAr(Math.round(n).toLocaleString("en-US"), isAr);
}
function pct(n: number, isAr: boolean): string {
  return (n >= 0 ? "+" : "−") + toAr(Math.abs(n).toFixed(1), isAr) + (isAr ? "٪" : "%");
}

export function WhatIfLab({ ar }: { ar: boolean }) {
  const leversElRef = useRef<HTMLDivElement | null>(null);
  const flowInRef = useRef<HTMLDivElement | null>(null);
  const flowOutRef = useRef<HTMLDivElement | null>(null);
  const hubRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const narrRef = useRef<HTMLDivElement | null>(null);
  const vigRef = useRef<HTMLDivElement | null>(null);
  const rewRef = useRef<HTMLDivElement | null>(null);
  const solveBtnRef = useRef<HTMLButtonElement | null>(null);
  const resetBtnRef = useRef<HTMLButtonElement | null>(null);
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state: Record<string, number> = {};
    let solving = false;
    let raf = 0;
    let waveT: ReturnType<typeof setTimeout> | undefined;

    // Build levers
    const leversEl = leversElRef.current!;
    const flowIn = flowInRef.current!;
    const flowOut = flowOutRef.current!;
    leversEl.innerHTML = "";
    flowIn.innerHTML = "";
    flowOut.innerHTML = "";

    LEVERS.forEach((L) => {
      state[L.id] = L.base;
      const wrap = document.createElement("div");
      wrap.className = "lever";
      wrap.id = `lever_${L.id}`;
      const unit = ar ? L.unit : L.unitEn;
      const name = ar ? L.name : L.nameEn;
      wrap.innerHTML =
        `<div class="lever-top"><span class="lever-name">${name}</span>` +
        `<span class="lever-val"><span id="v_${L.id}"></span>${unit ? `<span style="font-size:11px;opacity:.6"> ${unit}</span>` : ""}` +
        `<span class="delta zero" id="d_${L.id}">●</span></span></div>` +
        `<input type="range" class="wi-range" id="r_${L.id}" min="${L.min}" max="${L.max}" step="${L.step}" value="${L.base}">`;
      leversEl.appendChild(wrap);
      const n = document.createElement("div");
      n.className = "node";
      n.id = `fin_${L.id}`;
      n.innerHTML = `<span class="nd"></span>${name}`;
      flowIn.appendChild(n);
    });
    OUTS.forEach((o) => {
      const n = document.createElement("div");
      n.className = "node out";
      n.id = `fout_${o.id}`;
      n.innerHTML = `<span class="nlbl">${ar ? o.lbl : o.lblEn}</span><span class="nval" id="fv_${o.id}">—</span>`;
      flowOut.appendChild(n);
    });

    function fmtVal(L: Lever, v: number) {
      if (L.id === "students") return grp(v, ar);
      if (L.step < 1) return toAr(v.toFixed(1), ar);
      return toAr(Math.round(v), ar);
    }

    function compute(st: Record<string, number>) {
      const d = { rev: 0, net: 0, iq: 0, risk: 0 };
      LEVERS.forEach((L) => {
        const dev = (st[L.id] - L.base) / (L.max - L.min);
        for (const k of Object.keys(L.w) as (keyof typeof d)[]) {
          d[k] += dev * (L.w[k] ?? 0);
        }
      });
      return {
        rev: BASE.rev * (1 + d.rev * 0.5),
        net: BASE.net * (1 + d.net * 0.5),
        iq: Math.max(40, Math.min(99, BASE.iq + d.iq * 22)),
        risk: Math.max(2, Math.min(98, BASE.risk + d.risk * 46)),
        d,
      };
    }

    function activity(L: Lever) {
      return Math.abs(state[L.id] - L.base) / (L.max - L.min);
    }

    function narrate(o: ReturnType<typeof compute>) {
      const revD = (o.rev / BASE.rev - 1) * 100;
      const netD = (o.net / BASE.net - 1) * 100;
      const riskD = o.risk - BASE.risk;
      let lead: Lever | null = null;
      let la = 0;
      LEVERS.forEach((L) => { const a = activity(L); if (a > la) { la = a; lead = L; } });
      if (!lead || la < 0.01) {
        return ar
          ? "حرّك أيّ رافعة لتبدأ المحاكاة — أو دع الدماغ يحسب الأفضل."
          : "Move any lever to begin the simulation — or let the brain solve.";
      }
      const lev = lead as Lever;
      const dir = state[lev.id] >= lev.base ? (ar ? "رفعت" : "raised") : (ar ? "خفضت" : "lowered");
      const unit = ar ? lev.unit : lev.unitEn;
      const name = ar ? lev.name : lev.nameEn;
      let s = ar
        ? `لو <b>${dir} ${name}</b> إلى <b>${fmtVal(lev, state[lev.id])}${unit ? " " + unit : ""}</b>، `
        : `If we <b>${dir} ${name}</b> to <b>${fmtVal(lev, state[lev.id])}${unit ? " " + unit : ""}</b>, `;
      s += ar ? `صافي الربح <span class='${netD >= 0 ? "up" : "down"}'>${pct(netD, ar)}</span>` : `net profit <span class='${netD >= 0 ? "up" : "down"}'>${pct(netD, ar)}</span>`;
      s += ar ? ` والإيراد <span class='${revD >= 0 ? "up" : "down"}'>${pct(revD, ar)}</span>` : `, revenue <span class='${revD >= 0 ? "up" : "down"}'>${pct(revD, ar)}</span>`;
      if (Math.abs(riskD) > 1.5) {
        s += ar
          ? `، ${riskD > 0 ? "لكن" : "و"} المخاطرة <span class='${riskD >= 0 ? "down" : "up"}'>${pct(riskD, ar)}</span>`
          : `, ${riskD > 0 ? "but" : "and"} risk <span class='${riskD >= 0 ? "down" : "up"}'>${pct(riskD, ar)}</span>`;
      }
      s += ".";
      return s;
    }

    const svg = svgRef.current!;
    function buildWires() {
      const inN = LEVERS.length, outN = OUTS.length;
      const parts: string[] = [];
      for (let i = 0; i < inN; i++) {
        const y = (i + 0.5) / inN * 100;
        parts.push(pathStr(`win_${i}`, 2, y, 46, 50));
      }
      for (let j = 0; j < outN; j++) {
        const y2 = (j + 0.5) / outN * 100;
        parts.push(pathStr(`wout_${j}`, 54, 50, 98, y2));
      }
      svg.innerHTML = parts.join("");
    }
    function pathStr(id: string, x1: number, y1: number, x2: number, y2: number) {
      const mx = (x1 + x2) / 2;
      const d = `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      return `<path id="${id}" data-d="${d}" d="${d}" fill="none" stroke="#C2A35A" stroke-width="0.6" opacity="0.16" vector-effect="non-scaling-stroke"/>`;
    }
    function styleWires() {
      for (let i = 0; i < LEVERS.length; i++) {
        const a = activity(LEVERS[i]);
        const p = document.getElementById(`win_${i}`);
        if (p) {
          p.setAttribute("stroke-width", (0.4 + a * 1.3).toFixed(2));
          p.setAttribute("opacity", (a > 0.02 ? 0.2 + a * 0.6 : 0.12).toFixed(2));
        }
      }
      const anyActive = LEVERS.some((L) => activity(L) > 0.02);
      for (let j = 0; j < OUTS.length; j++) {
        const po = document.getElementById(`wout_${j}`);
        if (po) {
          po.setAttribute("opacity", (anyActive ? 0.5 : 0.16).toFixed(2));
          po.setAttribute("stroke-width", anyActive ? "0.9" : "0.6");
        }
      }
    }

    function pulseAlong(pathId: string, dur: number, onArrive?: () => void) {
      const p = document.getElementById(pathId) as unknown as SVGPathElement | null;
      if (!p) return;
      const d = p.getAttribute("data-d") ?? "";
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("r", "1.3");
      c.setAttribute("fill", "#FBF3DC");
      const am = document.createElementNS(SVGNS, "animateMotion");
      am.setAttribute("dur", `${dur / 1000}s`);
      am.setAttribute("repeatCount", "1");
      am.setAttribute("path", d);
      am.setAttribute("fill", "freeze");
      c.appendChild(am);
      svg.appendChild(c);
      try { (am as unknown as { beginElement?: () => void }).beginElement?.(); } catch {}
      setTimeout(() => { c.remove(); if (onArrive) onArrive(); }, dur);
    }
    function flinch(id: string) {
      const k = document.getElementById(`kpi_${id}`);
      const f = document.getElementById(`fout_${id}`);
      if (k) { k.classList.remove("flinch"); void k.offsetWidth; k.classList.add("flinch"); }
      if (f) { f.classList.remove("flinch"); void (f as HTMLElement).offsetWidth; f.classList.add("flinch"); }
    }
    function flinchAll() { OUTS.forEach((o) => flinch(o.id)); }
    function fireWave() {
      if (reduce) { flinchAll(); return; }
      let fired = false;
      LEVERS.forEach((L, i) => {
        if (activity(L) < 0.02) return;
        fired = true;
        pulseAlong(`win_${i}`, 380);
        document.getElementById(`fin_${L.id}`)?.classList.add("lit");
      });
      setTimeout(() => {
        hubRef.current?.classList.add("intense");
        OUTS.forEach((o, j) => {
          pulseAlong(`wout_${j}`, 360, () => flinch(o.id));
        });
        setTimeout(() => { if (!solving) hubRef.current?.classList.remove("intense"); }, 500);
      }, fired ? 380 : 0);
    }

    function ghost(id: string, val: number, base: number, money: boolean, invert?: boolean) {
      const g = document.getElementById(`g_${id}`);
      if (!g) return;
      const diff = val - base;
      const eps = base * 0.005 + 0.5;
      if (Math.abs(diff) < eps) { g.className = "ghost zero"; g.innerHTML = ""; return; }
      const good = invert ? diff < 0 : diff > 0;
      g.className = "ghost " + (good ? "up" : "down");
      g.innerHTML = (diff > 0 ? "▲" : "▼") + ` <span class='base'>${money ? grp(base, ar) : toAr(Math.round(base), ar)}</span>`;
    }
    function setOut(id: string, txt: string, cls: string) {
      const e = document.getElementById(`fv_${id}`);
      if (!e) return;
      e.textContent = txt;
      e.className = "nval " + (cls || "");
    }

    function roomReacts(o: ReturnType<typeof compute>) {
      const riskOver = Math.max(0, (o.risk - BASE.risk) / (98 - BASE.risk));
      const netOver = Math.max(0, (o.net / BASE.net - 1));
      if (vigRef.current) vigRef.current.style.opacity = Math.min(0.85, riskOver * 1.1).toFixed(2);
      if (rewRef.current) rewRef.current.style.opacity = Math.min(0.9, netOver * 2.2).toFixed(2);
      const push = LEVERS.reduce((a, L) => a + activity(L), 0) / LEVERS.length;
      hubRef.current?.style.setProperty("--spin", `${(24 - push * 17).toFixed(1)}s`);
      if (push > 0.04) hubRef.current?.classList.add("intense");
      else if (!solving) hubRef.current?.classList.remove("intense");
    }

    function render() {
      const o = compute(state);
      const set = (id: string, txt: string) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      const setW = (id: string, w: number) => { const el = document.getElementById(id); if (el) (el as HTMLElement).style.width = `${w}%`; };
      set("k_net", grp(o.net, ar));
      set("k_rev", grp(o.rev, ar));
      set("k_iq", toAr(Math.round(o.iq), ar));
      set("k_risk", toAr(Math.round(o.risk), ar));
      setW("b_net", Math.max(4, Math.min(100, o.net / BASE.net * 71)));
      setW("b_rev", Math.max(4, Math.min(100, o.rev / BASE.rev * 68)));
      setW("b_iq", o.iq);
      setW("b_risk", o.risk);
      set("hubIQ", toAr(Math.round(o.iq), ar));
      ghost("net", o.net, BASE.net, true);
      ghost("rev", o.rev, BASE.rev, true);
      ghost("iq", o.iq, BASE.iq, false);
      ghost("risk", o.risk, BASE.risk, false, true);
      setOut("rev", pct((o.rev / BASE.rev - 1) * 100, ar), o.rev >= BASE.rev ? "up" : "down");
      setOut("net", pct((o.net / BASE.net - 1) * 100, ar), o.net >= BASE.net ? "up" : "down");
      setOut("iq", toAr(Math.round(o.iq), ar), "");
      setOut("risk", toAr(Math.round(o.risk), ar), o.risk > BASE.risk ? "down" : "up");
      if (narrRef.current) narrRef.current.innerHTML = narrate(o);
      styleWires();
      roomReacts(o);
    }

    function syncLever(L: Lever) {
      const r = document.getElementById(`r_${L.id}`) as HTMLInputElement | null;
      const vEl = document.getElementById(`v_${L.id}`);
      const dEl = document.getElementById(`d_${L.id}`);
      if (!r || !vEl || !dEl) return;
      state[L.id] = parseFloat(r.value);
      r.style.setProperty("--fill", `${(parseFloat(r.value) - L.min) / (L.max - L.min) * 100}%`);
      vEl.textContent = fmtVal(L, state[L.id]);
      const diff = state[L.id] - L.base;
      if (Math.abs(diff) < L.step / 2) {
        dEl.textContent = "●";
        dEl.className = "delta zero";
      } else {
        dEl.textContent = (diff > 0 ? "▲ " : "▼ ") + fmtVal(L, Math.abs(diff));
        dEl.className = "delta " + (diff > 0 ? "up" : "down");
      }
    }
    function fireWaveDebounced() {
      clearTimeout(waveT);
      waveT = setTimeout(fireWave, 90);
    }
    const onInputs: { el: HTMLInputElement; h: () => void }[] = [];
    LEVERS.forEach((L) => {
      const r = document.getElementById(`r_${L.id}`) as HTMLInputElement;
      const h = () => {
        syncLever(L);
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
        if (!solving) fireWaveDebounced();
      };
      r.addEventListener("input", h);
      onInputs.push({ el: r, h });
      syncLever(L);
    });

    function solve() {
      if (solving) return;
      solving = true;
      hubRef.current?.classList.add("intense");
      if (narrRef.current) narrRef.current.innerHTML = ar
        ? "<b>الدماغ يحسب…</b> يبحث عن أعلى صافي ربح ضمن نطاق مخاطرة مقبول."
        : "<b>The brain is solving…</b> seeking the highest net profit within an acceptable risk band.";
      LEVERS.forEach((L) => document.getElementById(`lever_${L.id}`)?.classList.add("brain-moving"));
      const targets: Record<string, number> = { arenaPrice: 124, mahaOutput: 21, newInvest: 7, annualReturn: 14, students: 10800 };
      const start: Record<string, number> = {};
      LEVERS.forEach((L) => { start[L.id] = state[L.id]; });
      if (reduce) {
        LEVERS.forEach((L) => {
          const r = document.getElementById(`r_${L.id}`) as HTMLInputElement;
          r.value = String(targets[L.id]);
          syncLever(L);
        });
        finishSolve();
        return;
      }
      let t0: number | null = null;
      const dur = 2200;
      function ease(x: number) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
      function step(now: number) {
        if (!t0) t0 = now;
        const p = Math.min((now - t0) / dur, 1);
        const e = ease(p);
        LEVERS.forEach((L) => {
          const wob = (1 - p) * Math.sin(p * 22 + L.base) * (L.max - L.min) * 0.04;
          let v = start[L.id] + (targets[L.id] - start[L.id]) * e + wob;
          v = Math.max(L.min, Math.min(L.max, v));
          const r = document.getElementById(`r_${L.id}`) as HTMLInputElement;
          r.value = String(v);
          syncLever(L);
        });
        render();
        if (p < 1) requestAnimationFrame(step);
        else finishSolve();
      }
      requestAnimationFrame(step);
    }
    function finishSolve() {
      LEVERS.forEach((L) => document.getElementById(`lever_${L.id}`)?.classList.remove("brain-moving"));
      render();
      fireWave();
      const o = compute(state);
      setTimeout(() => {
        if (narrRef.current) narrRef.current.innerHTML = ar
          ? `وجدتُ الأمثل: <b>صافي ربح ${grp(o.net, ar)} د.أ</b> (<span class='up'>${pct((o.net / BASE.net - 1) * 100, ar)}</span>) عند مخاطرة <b>${toAr(Math.round(o.risk), ar)}</b> — ضمن النطاق المقبول.`
          : `Optimal found: <b>net profit ${grp(o.net, ar)} JOD</b> (<span class='up'>${pct((o.net / BASE.net - 1) * 100, ar)}</span>) at risk <b>${toAr(Math.round(o.risk), ar)}</b> — within the acceptable band.`;
        hubRef.current?.classList.remove("intense");
        solving = false;
      }, 700);
    }

    function reset() {
      if (solving) return;
      if (reduce) {
        LEVERS.forEach((L) => {
          const r = document.getElementById(`r_${L.id}`) as HTMLInputElement;
          r.value = String(L.base);
          syncLever(L);
        });
        render();
        return;
      }
      const start: Record<string, number> = {};
      LEVERS.forEach((L) => { start[L.id] = state[L.id]; });
      let t0: number | null = null;
      const dur = 900;
      function ease(x: number) { return 1 - Math.pow(1 - x, 3); }
      function step(now: number) {
        if (!t0) t0 = now;
        const p = Math.min((now - t0) / dur, 1);
        const e = ease(p);
        LEVERS.forEach((L) => {
          const v = start[L.id] + (L.base - start[L.id]) * e;
          const r = document.getElementById(`r_${L.id}`) as HTMLInputElement;
          r.value = String(v);
          syncLever(L);
        });
        render();
        if (p < 1) requestAnimationFrame(step);
        else { if (narrRef.current) narrRef.current.innerHTML = narrate(compute(state)); }
      }
      requestAnimationFrame(step);
    }

    const onSolve = () => solve();
    const onReset = () => reset();
    const onSave = () => {
      // Honest action: there is no scenario-persistence backend, so instead of
      // faking a "saved" confirmation, copy the current lever values + the
      // narrative to the clipboard so the user can actually paste/share them.
      const b = saveBtnRef.current;
      if (!b) return;
      const lines = LEVERS.map(
        (L) => `• ${ar ? L.name : L.nameEn}: ${fmtVal(L, state[L.id])}${(ar ? L.unit : L.unitEn) ? " " + (ar ? L.unit : L.unitEn) : ""}`,
      );
      const narr = narrRef.current?.textContent?.trim() ?? "";
      const text = `${ar ? "سيناريو ماذا-لو · H-Nerve" : "What-if scenario · H-Nerve"}\n${lines.join("\n")}${narr ? "\n\n" + narr : ""}`;
      const confirm = () => {
        const t = b.textContent;
        b.textContent = ar ? "✓ نُسخت القيم" : "✓ Values copied";
        setTimeout(() => { b.textContent = t; }, 1600);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(confirm).catch(confirm);
      } else {
        confirm();
      }
    };
    const solveBtn = solveBtnRef.current;
    const resetBtn = resetBtnRef.current;
    const saveBtn = saveBtnRef.current;
    solveBtn?.addEventListener("click", onSolve);
    resetBtn?.addEventListener("click", onReset);
    saveBtn?.addEventListener("click", onSave);
    const onResize = () => buildWires();
    window.addEventListener("resize", onResize);

    buildWires();
    render();

    return () => {
      window.removeEventListener("resize", onResize);
      solveBtn?.removeEventListener("click", onSolve);
      resetBtn?.removeEventListener("click", onReset);
      saveBtn?.removeEventListener("click", onSave);
      onInputs.forEach(({ el, h }) => el.removeEventListener("input", h));
      clearTimeout(waveT);
    };
  }, [ar]);

  return (
    <div className="wi-wrap reveal">
      <div className="wi-vignette" ref={vigRef} />
      <div className="wi-reward" ref={rewRef} />

      <div className="wi-ribbon">
        <div className="wi-title-box">
          <span className="eb"><span className="tick" />{ar ? "محاكاة سببية" : "Causal simulation"}</span>
          <h1>{ar ? "ماذا لو" : "What if"}</h1>
        </div>
        <div className="wi-note">
          <div className="eyebrow"><span className="pulse" />{ar ? "قراءة الدماغ" : "Brain reading"}</div>
          <div className="narr" ref={narrRef}>
            {ar
              ? "حرّك أيّ رافعة لتبدأ المحاكاة — أو دع الدماغ يحسب الأفضل."
              : "Move any lever to begin the simulation — or let the brain solve."}
          </div>
        </div>
      </div>

      <div className="wi-grid">
        <div className="wi-panel">
          <h2>{ar ? "الروافع" : "Levers"}</h2>
          <div className="sub">{ar ? "حرّكها لتغيّر مصير المجموعة" : "Move them to change the group's fate"}</div>
          <div ref={leversElRef} />
        </div>

        <div className="wi-panel wi-flow">
          <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none" />
          <div className="flow-cols">
            <div className="flow-side in" ref={flowInRef} />
            <div className="brain-hub" ref={hubRef}>
              <div className="bi">{ar ? "ذكاء" : "Brain"}<br /><b id="hubIQ">{ar ? "٩٢" : "92"}</b><br />{ar ? "الدماغ" : "IQ"}</div>
            </div>
            <div className="flow-side out" ref={flowOutRef} />
          </div>
        </div>

        <div className="wi-panel">
          <h2>{ar ? "الأثر" : "Impact"}</h2>
          <div className="sub">{ar ? "يتحدّث لحظياً" : "Updates live"}</div>
          <button ref={solveBtnRef} className="dl-btn dl-btn-primary wi-solve">
            {ar ? "✦ دع الدماغ يحسب الأفضل" : "✦ Let the brain solve"}
          </button>
          <div className="wi-kpi" id="kpi_net">
            <div className="k">{ar ? "صافي الربح الشهري" : "Monthly net profit"}</div>
            <div className="v"><span id="k_net">{ar ? "٩٧٬٦٤٣" : "97,643"}</span><span className="u">{ar ? "د.أ" : "JOD"}</span><span className="ghost zero" id="g_net" /></div>
            <div className="bar"><span id="b_net" style={{ width: "71%" }} /></div>
          </div>
          <div className="wi-kpi" id="kpi_rev">
            <div className="k">{ar ? "الإيراد الشهري" : "Monthly revenue"}</div>
            <div className="v"><span id="k_rev">{ar ? "١٣٧٬٤٦٥" : "137,465"}</span><span className="u">{ar ? "د.أ" : "JOD"}</span><span className="ghost zero" id="g_rev" /></div>
            <div className="bar"><span id="b_rev" style={{ width: "68%" }} /></div>
          </div>
          <div className="wi-kpi" id="kpi_iq">
            <div className="k">{ar ? "ذكاء الدماغ" : "Brain IQ"}</div>
            <div className="v"><span id="k_iq">{ar ? "٩٢" : "92"}</span><span className="ghost zero" id="g_iq" /></div>
            <div className="bar"><span id="b_iq" style={{ width: "92%" }} /></div>
          </div>
          <div className="wi-kpi risk" id="kpi_risk">
            <div className="k">{ar ? "مؤشر المخاطرة" : "Risk index"}</div>
            <div className="v"><span id="k_risk">{ar ? "٣١" : "31"}</span><span className="ghost zero" id="g_risk" /></div>
            <div className="bar"><span id="b_risk" style={{ width: "31%" }} /></div>
          </div>
          <div className="wi-actions">
            <button ref={resetBtnRef} className="dl-btn dl-btn-secondary dl-btn-onnight">{ar ? "إعادة الضبط" : "Reset"}</button>
            <button ref={saveBtnRef} className="dl-btn dl-btn-primary">{ar ? "انسخ القيم" : "Copy values"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
