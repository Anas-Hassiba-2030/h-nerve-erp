"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";
import { setLocale } from "@/app/actions/preferences";

// Full-screen cinematic login. Ported from the Heritage "cosmos" design:
// aurora nebula + neural/synapse canvas (stars, meteors, supernova black
// holes, galaxy, ringed planet) + a living brain nucleus, with a sign-in
// "dive into the cosmos" transition into /orrery. All CSS is scoped under
// .login-cosmos so it never collides with the app's global .btn/.card/etc.

const NIGHT = "radial-gradient(ellipse 90% 70% at 50% 30%,#0e3328 0%,#0a241b 55%,#06140e 100%)";
const DAWN = "radial-gradient(ellipse 90% 70% at 50% 30%,#163a2c 0%,#2a2a18 60%,#0c1810 100%)";

function strings(ar: boolean) {
  return ar
    ? {
        tag: "الجهاز العصبي الرقمي لمجموعة الحوراني",
        email: "البريد الإلكتروني",
        pw: "كلمة المرور",
        remember: "تذكّرني",
        signin: "تسجيل الدخول",
        theme: "السمة",
        sectors: ["الضيافة", "الألبان", "الزراعة الذكية", "التعليم", "الأسواق", "الاستدامة"],
        title: "H-Nerve ERP · الدخول",
      }
    : {
        tag: "The Digital Nervous System of Hourani Group",
        email: "Email",
        pw: "Password",
        remember: "Remember me",
        signin: "Sign in",
        theme: "Theme",
        sectors: ["Hospitality", "Dairy", "Smart Agriculture", "Education", "Markets", "ESG"],
        title: "H-Nerve ERP · Sign in",
      };
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn ov d5" type="submit" disabled={pending} aria-busy={pending}>
      <span className="sheen" />
      <span>
        {label}
        {pending ? <span className="dots" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

export function LoginCosmos({
  ar,
  skyDawn,
  initialEmail,
  initialError,
}: {
  ar: boolean;
  skyDawn: boolean;
  initialEmail: string;
  initialError: string;
}) {
  const t = strings(ar);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const nucleusRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLFormElement>(null);
  const sparkRef = useRef<((x: number, y: number) => void) | null>(null);
  const misfireRef = useRef<((x: number, y: number) => void) | null>(null);
  const interactedRef = useRef(false);

  const [state, formAction] = useFormState<LoginState, FormData>(loginAction, {
    ok: false,
    error: initialError || undefined,
    email: initialEmail,
  });
  const [errText, setErrText] = useState(initialError || "");

  // Success → play the dive, then navigate into the orrery with the fresh session.
  useEffect(() => {
    if (!state.ok) return;
    const root = rootRef.current;
    const nuc = nucleusRef.current;
    if (nuc) {
      nuc.classList.remove("pulse");
      void nuc.offsetWidth;
      nuc.classList.add("pulse");
    }
    root?.classList.add("dive");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduce ? 150 : 1150;
    const id = setTimeout(() => window.location.assign("/orrery"), delay);
    return () => clearTimeout(id);
  }, [state.ok]);

  // Failure → surface the message, shake the card, briefly dim the nucleus.
  useEffect(() => {
    if (state.ok) return;
    if (!state.error) {
      setErrText("");
      return;
    }
    setErrText(state.error);
    const card = cardRef.current;
    const nuc = nucleusRef.current;
    if (card) {
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");
    }
    if (nuc) {
      const r = nuc.getBoundingClientRect();
      misfireRef.current?.(r.left + r.width / 2, r.top + r.height / 2);
    }
    if (nuc) {
      nuc.style.filter = "grayscale(.4) brightness(.7)";
      const id = setTimeout(() => {
        nuc.style.filter = "";
      }, 700);
      return () => clearTimeout(id);
    }
  }, [state]);

  // ── the neural canvas + parallax (ported verbatim, scoped to refs) ──
  useEffect(() => {
    const root = rootRef.current;
    const cv = canvasRef.current;
    if (!root || !cv) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const TAU = Math.PI * 2;
    let W = 0,
      H = 0;
    let nodes: any[] = [],
      dust: any[] = [],
      sparks: any[] = [],
      stars: any[] = [],
      meteors: any[] = [],
      voids: any[] = [],
      bursts: any[] = [];
    const mouse = { x: -999, y: -999 };
    let nextVoid = performance.now() + 2200;
    let px = 0,
      py = 0,
      cpx = 0,
      cpy = 0;
    let running = true;
    let rafLoop = 0,
      rafPar = 0;

    const a1 = root.querySelector<HTMLElement>(".a1");
    const a2 = root.querySelector<HTMLElement>(".a2");
    const a3 = root.querySelector<HTMLElement>(".a3");
    const stg = root.querySelector<HTMLElement>(".stage");

    function seed() {
      nodes = [];
      const n = Math.min(46, Math.round((innerWidth * innerHeight) / 30000));
      for (let i = 0; i < n; i++)
        nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.08 * DPR, vy: (Math.random() - 0.5) * 0.08 * DPR, r: (Math.random() * 1.3 + 0.6) * DPR });
      dust = [];
      for (let j = 0; j < 60; j++) dust.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.6 + 0.2, r: (Math.random() * 1.1 + 0.3) * DPR });
      stars = [];
      const sn = Math.min(420, Math.round((innerWidth * innerHeight) / 3400));
      for (let s = 0; s < sn; s++) {
        const hero = Math.random() < 0.05,
          z = Math.random();
        stars.push({ x: Math.random() * W, y: Math.random() * H, z, r: ((hero ? 1.6 : 0.5) + Math.random() * (hero ? 1.4 : 1)) * DPR, base: hero ? 0.7 : 0.18 + Math.random() * 0.5, amp: 0.12 + Math.random() * 0.3, sp: 0.4 + Math.random() * 1.4, ph: Math.random() * TAU, hero, tint: Math.random() < 0.18 ? "224,192,137" : Math.random() < 0.3 ? "205,228,218" : "255,250,240" });
      }
      const corners = [[0.08, 0.12], [0.93, 0.16], [0.1, 0.88], [0.9, 0.85]];
      for (let c = 0; c < corners.length; c++)
        stars.push({ x: corners[c][0] * W, y: corners[c][1] * H, z: 0.9, r: (2.2 + Math.random() * 1.1) * DPR, base: 0.78, amp: 0.22, sp: 0.5 + Math.random() * 0.6, ph: Math.random() * TAU, hero: true, tint: Math.random() < 0.5 ? "255,250,240" : "224,192,137" });
      meteors = [];
    }
    function size() {
      W = cv!.width = innerWidth * DPR;
      H = cv!.height = innerHeight * DPR;
      cv!.style.width = innerWidth + "px";
      cv!.style.height = innerHeight + "px";
      seed();
    }
    size();

    const onResize = () => size();
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX * DPR;
      mouse.y = e.clientY * DPR;
      px = e.clientX / innerWidth - 0.5;
      py = e.clientY / innerHeight - 0.5;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma != null) {
        px = Math.max(-0.5, Math.min(0.5, e.gamma / 45));
        py = Math.max(-0.5, Math.min(0.5, ((e.beta ?? 30) - 30) / 45));
      }
    };
    const onVis = () => {
      running = !document.hidden;
      if (running) rafLoop = requestAnimationFrame(loop);
    };
    addEventListener("resize", onResize);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("deviceorientation", onTilt, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    sparkRef.current = (tx: number, ty: number) => {
      if (reduce || !nodes.length) return;
      const s = nodes[(Math.random() * nodes.length) | 0];
      sparks.push({ x: s.x, y: s.y, tx: tx * DPR, ty: ty * DPR, t: 0, sp: 0.03 + Math.random() * 0.02 });
    };
    // a "misfire": red sparks burst outward from a point (the nucleus) on a failed sign-in
    misfireRef.current = (cx: number, cy: number) => {
      if (reduce) return;
      const ox = cx * DPR,
        oy = cy * DPR;
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * TAU,
          d = (70 + Math.random() * 90) * DPR;
        sparks.push({ x: ox, y: oy, tx: ox + Math.cos(a) * d, ty: oy + Math.sin(a) * d, t: 0, sp: 0.02 + Math.random() * 0.02, red: true });
      }
    };

    function par() {
      if (!reduce) {
        cpx += (px - cpx) * 0.05;
        cpy += (py - cpy) * 0.05;
        if (a1) a1.style.transform = "translate(" + cpx * 34 + "px," + cpy * 30 + "px)";
        if (a2) a2.style.transform = "translate(" + cpx * -26 + "px," + cpy * -22 + "px)";
        if (a3) a3.style.transform = "translate(" + cpx * 18 + "px," + cpy * 16 + "px)";
        if (cv) cv.style.transform = "translate(" + cpx * 12 + "px," + cpy * 10 + "px)";
        if (stg && !root!.classList.contains("dive")) stg.style.transform = "translate(" + cpx * -9 + "px," + cpy * -8 + "px)";
      }
      rafPar = requestAnimationFrame(par);
    }
    par();

    const LINK = 130 * DPR;
    function loop() {
      if (!running) return;
      const c = ctx!;
      c.clearRect(0, 0, W, H);
      const T = performance.now() / 1000;
      // distant galaxy
      (function () {
        const gx = W * 0.18 + cpx * 10 * DPR,
          gy = H * 0.74 + cpy * 10 * DPR;
        c.save();
        c.translate(gx, gy);
        c.rotate(-0.5);
        c.scale(1, 0.42);
        const gg = c.createRadialGradient(0, 0, 0, 0, 0, 150 * DPR);
        gg.addColorStop(0, "rgba(224,192,137,.22)");
        gg.addColorStop(0.4, "rgba(15,122,90,.1)");
        gg.addColorStop(1, "rgba(15,122,90,0)");
        c.fillStyle = gg;
        c.beginPath();
        c.arc(0, 0, 150 * DPR, 0, TAU);
        c.fill();
        c.fillStyle = "rgba(255,245,220,.5)";
        c.beginPath();
        c.arc(0, 0, 8 * DPR, 0, TAU);
        c.fill();
        c.restore();
      })();
      // traveling black holes that supernova
      if (!reduce && performance.now() > nextVoid && voids.length < 2) {
        const fast = Math.random() < 0.5,
          edge = Math.random() < 0.5;
        voids.push({ x: edge ? -60 * DPR : W + 60 * DPR, y: (0.12 + Math.random() * 0.5) * H, vx: (edge ? 1 : -1) * (fast ? 0.7 : 0.32) * DPR, vy: (Math.random() - 0.5) * 0.18 * DPR, r: (fast ? 16 : 26) * DPR, life: fast ? 5.5 : 9, t: 0 });
        nextVoid = performance.now() + (4200 + Math.random() * 4200);
      }
      for (let vi = voids.length - 1; vi >= 0; vi--) {
        const v = voids[vi];
        v.x += v.vx;
        v.y += v.vy;
        v.t += 1 / 60;
        const ag = c.createRadialGradient(v.x, v.y, v.r * 0.9, v.x, v.y, v.r * 3.8);
        ag.addColorStop(0, "rgba(224,192,137,.34)");
        ag.addColorStop(0.45, "rgba(198,147,69,.1)");
        ag.addColorStop(1, "rgba(198,147,69,0)");
        c.fillStyle = ag;
        c.beginPath();
        c.arc(v.x, v.y, v.r * 3.8, 0, TAU);
        c.fill();
        c.save();
        c.translate(v.x, v.y);
        c.rotate(-0.5 + Math.sin(v.t * 0.3) * 0.05);
        c.save();
        c.beginPath();
        c.rect(-v.r * 3.2, -v.r * 3.2, v.r * 6.4, v.r * 1.55);
        c.clip();
        const d1 = c.createLinearGradient(-v.r * 2.8, 0, v.r * 2.8, 0);
        d1.addColorStop(0, "rgba(255,238,200,0)");
        d1.addColorStop(0.5, "rgba(255,232,180,.85)");
        d1.addColorStop(1, "rgba(224,160,90,0)");
        c.strokeStyle = d1;
        c.lineWidth = 4 * DPR;
        c.shadowBlur = 16 * DPR;
        c.shadowColor = "rgba(255,220,150,.9)";
        c.beginPath();
        c.ellipse(0, 0, v.r * 2.6, v.r * 0.78, 0, 0, TAU);
        c.stroke();
        c.restore();
        c.shadowBlur = 0;
        c.fillStyle = "#020805";
        c.beginPath();
        c.arc(0, 0, v.r, 0, TAU);
        c.fill();
        c.strokeStyle = "rgba(255,244,214,.95)";
        c.lineWidth = 1.6 * DPR;
        c.shadowBlur = 12 * DPR;
        c.shadowColor = "rgba(255,228,170,1)";
        c.beginPath();
        c.arc(0, 0, v.r * 1.08, 0, TAU);
        c.stroke();
        c.save();
        c.beginPath();
        c.rect(-v.r * 3.2, v.r * 0.02, v.r * 6.4, v.r * 1.6);
        c.clip();
        c.strokeStyle = d1;
        c.lineWidth = 4.5 * DPR;
        c.shadowBlur = 18 * DPR;
        c.shadowColor = "rgba(255,220,150,.95)";
        c.beginPath();
        c.ellipse(0, 0, v.r * 2.6, v.r * 0.78, 0, 0, TAU);
        c.stroke();
        c.restore();
        c.shadowBlur = 0;
        c.restore();
        if (v.t >= v.life || v.x < -80 * DPR || v.x > W + 80 * DPR) {
          if (v.t >= v.life) {
            bursts.push({ x: v.x, y: v.y, t: 0, max: v.r * 11, flash: 1 });
            bursts.push({ x: v.x, y: v.y, t: -0.12, max: v.r * 7, flash: 0 });
            bursts.push({ fire: 1, x: v.x, y: v.y, t: 0, r0: v.r * 2.2 });
            const N = 90;
            for (let e = 0; e < N; e++) {
              const a = Math.random() * TAU,
                sp = (0.6 + Math.random() * 3.4) * DPR,
                big = Math.random() < 0.15;
              bursts.push({ p: 1, x: v.x, y: v.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gy: (0.006 + Math.random() * 0.01) * DPR, life: 1, decay: 0.005 + Math.random() * 0.004, r: (Math.random() * (big ? 3 : 1.6) + 0.7) * DPR, hot: Math.random() < 0.5, settle: Math.random() < 0.5 });
            }
          }
          voids.splice(vi, 1);
        }
      }
      for (let bi = bursts.length - 1; bi >= 0; bi--) {
        const bs = bursts[bi];
        if (bs.fire) {
          bs.t += 1 / 120;
          const fp = bs.t / 0.9;
          if (fp >= 1) {
            bursts.splice(bi, 1);
            continue;
          }
          const fr = bs.r0 * (0.5 + fp * 1.8);
          c.globalAlpha = 1 - fp;
          const fgg = c.createRadialGradient(bs.x, bs.y, 0, bs.x, bs.y, fr);
          fgg.addColorStop(0, "rgba(255,252,240,.95)");
          fgg.addColorStop(0.35, "rgba(255,224,150,.8)");
          fgg.addColorStop(0.7, "rgba(224,140,70,.4)");
          fgg.addColorStop(1, "rgba(180,60,30,0)");
          c.fillStyle = fgg;
          c.beginPath();
          c.arc(bs.x, bs.y, fr, 0, TAU);
          c.fill();
          c.globalAlpha = 1;
        } else if (bs.p) {
          bs.x += bs.vx;
          bs.y += bs.vy;
          bs.vx *= 0.985;
          bs.vy *= 0.985;
          bs.vy += bs.gy;
          bs.life -= bs.decay;
          if (bs.life <= 0) {
            bursts.splice(bi, 1);
            continue;
          }
          const cool = bs.life > 0.55,
            tw = bs.settle ? 0.6 + 0.4 * Math.sin(T * 3 + bs.x) : 1;
          c.globalAlpha = Math.min(1, bs.life * 1.3) * tw;
          c.fillStyle = cool ? (bs.hot ? "rgba(255,248,225,1)" : "rgba(255,210,140,1)") : "rgba(235,242,236,1)";
          c.shadowBlur = (cool ? 9 : 5) * DPR;
          c.shadowColor = cool ? "rgba(255,200,120,.9)" : "rgba(205,228,218,.8)";
          c.beginPath();
          c.arc(bs.x, bs.y, bs.r * (cool ? 1 : 0.7), 0, TAU);
          c.fill();
          c.shadowBlur = 0;
          c.globalAlpha = 1;
        } else {
          bs.t += 1 / 120;
          if (bs.t < 0) continue;
          const pr = bs.t / 1.6;
          if (pr >= 1) {
            bursts.splice(bi, 1);
            continue;
          }
          const rad = bs.max * pr;
          c.globalAlpha = (1 - pr) * 0.9;
          c.strokeStyle = "rgba(255,236,196,1)";
          c.lineWidth = (2.6 - pr * 1.8) * DPR;
          c.shadowBlur = 22 * DPR;
          c.shadowColor = "rgba(255,210,140,1)";
          c.beginPath();
          c.arc(bs.x, bs.y, rad, 0, TAU);
          c.stroke();
          if (bs.flash) {
            c.globalAlpha = (1 - pr) * 0.55;
            const fg = c.createRadialGradient(bs.x, bs.y, 0, bs.x, bs.y, bs.max * 0.7);
            fg.addColorStop(0, "rgba(255,247,225,.85)");
            fg.addColorStop(1, "rgba(224,160,90,0)");
            c.fillStyle = fg;
            c.beginPath();
            c.arc(bs.x, bs.y, bs.max * 0.7, 0, TAU);
            c.fill();
          }
          c.shadowBlur = 0;
          c.globalAlpha = 1;
        }
      }
      // ringed planet
      (function () {
        const pxp = W * 0.88 + Math.sin(T * 0.04) * 14 * DPR + cpx * 20 * DPR,
          pyp = H * 0.8 + cpy * 20 * DPR,
          pr = 24 * DPR;
        const pg = c.createRadialGradient(pxp - pr * 0.4, pyp - pr * 0.4, pr * 0.1, pxp, pyp, pr);
        pg.addColorStop(0, "rgba(120,170,150,.9)");
        pg.addColorStop(0.6, "rgba(15,90,68,.85)");
        pg.addColorStop(1, "rgba(6,30,22,.9)");
        c.save();
        c.translate(pxp, pyp);
        c.rotate(-0.4);
        c.strokeStyle = "rgba(198,147,69,.35)";
        c.lineWidth = 2.4 * DPR;
        c.beginPath();
        c.ellipse(0, 0, pr * 1.9, pr * 0.5, 0, 0, TAU);
        c.stroke();
        c.fillStyle = pg;
        c.beginPath();
        c.arc(0, 0, pr, 0, TAU);
        c.fill();
        c.strokeStyle = "rgba(224,192,137,.5)";
        c.lineWidth = 2.4 * DPR;
        c.beginPath();
        c.ellipse(0, 0, pr * 1.9, pr * 0.5, 0, 3.4, 5.9);
        c.stroke();
        c.restore();
      })();
      // starfield
      for (let st = 0; st < stars.length; st++) {
        const s2 = stars[st];
        const sx = s2.x + cpx * (8 + s2.z * 26) * DPR,
          sy = s2.y + cpy * (8 + s2.z * 26) * DPR;
        let tw = s2.base + s2.amp * Math.sin(T * s2.sp + s2.ph);
        if (tw < 0) tw = 0;
        c.globalAlpha = tw;
        c.fillStyle = "rgba(" + s2.tint + ",1)";
        c.beginPath();
        c.arc(sx, sy, s2.r, 0, TAU);
        c.fill();
        if (s2.hero) {
          c.globalAlpha = tw * 0.5;
          c.strokeStyle = "rgba(" + s2.tint + ",1)";
          c.lineWidth = DPR * 0.5;
          const L = s2.r * 4;
          c.beginPath();
          c.moveTo(sx - L, sy);
          c.lineTo(sx + L, sy);
          c.moveTo(sx, sy - L);
          c.lineTo(sx, sy + L);
          c.stroke();
        }
      }
      c.globalAlpha = 1;
      // meteors
      if (!reduce && Math.random() < 0.012 && meteors.length < 3) {
        const edge = Math.random(),
          big = Math.random() < 0.35;
        const sx0 = edge * W,
          sy0 = -40 * DPR,
          ang = Math.PI * (0.62 + Math.random() * 0.16),
          mv = (big ? 11 : 7) + Math.random() * 5;
        meteors.push({ x: sx0, y: sy0, vx: Math.cos(ang) * mv * DPR, vy: Math.sin(ang) * mv * DPR, life: 1, len: (big ? 200 : 90 + Math.random() * 120) * DPR, big });
      }
      for (let mi = meteors.length - 1; mi >= 0; mi--) {
        const m = meteors[mi];
        m.x += m.vx;
        m.y += m.vy;
        m.life -= m.big ? 0.008 : 0.012;
        let ux = m.vx,
          uy = m.vy;
        const ul = Math.sqrt(ux * ux + uy * uy);
        ux /= ul;
        uy /= ul;
        const tg = c.createLinearGradient(m.x, m.y, m.x - ux * m.len, m.y - uy * m.len);
        tg.addColorStop(0, "rgba(255,250,235," + (0.9 * m.life).toFixed(3) + ")");
        tg.addColorStop(0.4, "rgba(224,192,137," + (0.4 * m.life).toFixed(3) + ")");
        tg.addColorStop(1, "rgba(224,192,137,0)");
        c.strokeStyle = tg;
        c.lineWidth = (m.big ? 3.4 : 2) * DPR;
        c.lineCap = "round";
        c.shadowBlur = (m.big ? 18 : 10) * DPR;
        c.shadowColor = "rgba(224,192,137,.85)";
        c.beginPath();
        c.moveTo(m.x, m.y);
        c.lineTo(m.x - ux * m.len, m.y - uy * m.len);
        c.stroke();
        if (m.big) {
          c.fillStyle = "rgba(255,250,235," + m.life.toFixed(3) + ")";
          c.beginPath();
          c.arc(m.x, m.y, 2.4 * DPR, 0, TAU);
          c.fill();
        }
        c.shadowBlur = 0;
        if (m.life <= 0 || m.x > W + 60 * DPR || m.y > H + 60 * DPR) meteors.splice(mi, 1);
      }
      // dust
      for (const d of dust) {
        d.x += Math.sin(performance.now() / 9000 + d.z) * 0.05 * DPR;
        c.globalAlpha = d.z * 0.4;
        c.fillStyle = "#cfe4da";
        c.beginPath();
        c.arc(d.x, d.y, d.r, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
      // nodes + axons
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
        const mdx = a.x - mouse.x,
          mdy = a.y - mouse.y,
          md = mdx * mdx + mdy * mdy;
        if (md < 150 * DPR * (150 * DPR)) {
          const f = (1 - Math.sqrt(md) / (150 * DPR)) * 0.4;
          a.x += (mdx / Math.sqrt(md + 1)) * f * DPR;
          a.y += (mdy / Math.sqrt(md + 1)) * f * DPR;
        }
        for (let k = i + 1; k < nodes.length; k++) {
          const b = nodes[k],
            dx = a.x - b.x,
            dy = a.y - b.y,
            dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < LINK) {
            c.strokeStyle = "rgba(15,122,90," + (0.12 * (1 - dd / LINK)).toFixed(3) + ")";
            c.lineWidth = DPR * 0.6;
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
          }
        }
        c.fillStyle = "rgba(205,228,218,.5)";
        c.beginPath();
        c.arc(a.x, a.y, a.r, 0, TAU);
        c.fill();
      }
      if (!reduce && Math.random() < 0.04 && nodes.length > 1) {
        const p = nodes[(Math.random() * nodes.length) | 0],
          q = nodes[(Math.random() * nodes.length) | 0];
        if (p !== q) sparks.push({ x: p.x, y: p.y, tx: q.x, ty: q.y, t: 0, sp: 0.02 + Math.random() * 0.02 });
      }
      for (let si = sparks.length - 1; si >= 0; si--) {
        const s = sparks[si];
        s.t += s.sp;
        const x = s.x + (s.tx - s.x) * s.t,
          y = s.y + (s.ty - s.y) * s.t;
        c.shadowBlur = 10 * DPR;
        c.shadowColor = s.red ? "rgba(184,92,56,.95)" : "rgba(224,192,137,.9)";
        c.fillStyle = s.red ? "rgba(214,108,70," + (1 - s.t).toFixed(3) + ")" : "rgba(224,192,137,.95)";
        c.beginPath();
        c.arc(x, y, (s.red ? 2 : 1.6) * DPR, 0, TAU);
        c.fill();
        c.shadowBlur = 0;
        if (s.t >= 1) sparks.splice(si, 1);
      }
      rafLoop = requestAnimationFrame(loop);
    }
    if (!reduce) rafLoop = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafLoop);
      cancelAnimationFrame(rafPar);
      removeEventListener("resize", onResize);
      removeEventListener("pointermove", onMove);
      removeEventListener("deviceorientation", onTilt);
      document.removeEventListener("visibilitychange", onVis);
      sparkRef.current = null;
      misfireRef.current = null;
    };
  }, []);

  // ── micro-interactions on the inputs ──
  function onFieldFocus(e: React.FocusEvent<HTMLInputElement>) {
    interactedRef.current = true;
    const r = e.currentTarget.getBoundingClientRect();
    sparkRef.current?.(r.left + r.width / 2, r.top + r.height / 2);
  }
  function pulseNucleus() {
    const nuc = nucleusRef.current;
    if (!nuc) return;
    nuc.classList.remove("pulse");
    void nuc.offsetWidth;
    nuc.classList.add("pulse");
  }

  // theme toggle: self-contained dawn ⇄ night sky (remembered locally)
  const [dawn, setDawn] = useState(skyDawn);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hn_login_sky");
      if (saved === "dawn") setDawn(true);
      else if (saved === "night") setDawn(false);
    } catch {}
  }, []);
  useEffect(() => {
    if (skyRef.current) skyRef.current.style.background = dawn ? DAWN : NIGHT;
    try {
      localStorage.setItem("hn_login_sky", dawn ? "dawn" : "night");
    } catch {}
  }, [dawn]);

  // Desktop autofocus (skip touch so we don't pop the mobile keyboard) +
  // an idle "thinking" heartbeat on the nucleus that stops once the user engages.
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let focusId: ReturnType<typeof setTimeout> | undefined;
    if (matchMedia("(pointer:fine)").matches) {
      focusId = setTimeout(() => {
        if (interactedRef.current) return;
        rootRef.current?.querySelector<HTMLInputElement>("#lc-email")?.focus();
      }, 1300); // after the entrance overture settles
    }
    let beat: ReturnType<typeof setInterval> | undefined;
    if (!reduce) {
      beat = setInterval(() => {
        if (!interactedRef.current) pulseNucleus();
      }, 3200);
    }
    return () => {
      if (focusId) clearTimeout(focusId);
      if (beat) clearInterval(beat);
    };
  }, []);

  return (
    <div ref={rootRef} className="login-cosmos play" lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"}>
      <div ref={skyRef} className="lc-sky" style={{ background: skyDawn ? DAWN : NIGHT }} />
      <div className="aurora a1" />
      <div className="aurora a2" />
      <div className="aurora a3" />
      <canvas ref={canvasRef} className="lc-neural" />
      <div className="lc-veil" />
      <div className="lc-flash" />

      <div className="chrome">
        <div className="toggles">
          {/* Language — real i18n: posts the locale cookie and re-renders bilingual */}
          <form action={setLocale}>
            <input type="hidden" name="locale" value={ar ? "en" : "ar"} />
            <button className="tg" type="submit" aria-label={ar ? "English" : "العربية"}>
              {ar ? (
                <>
                  <span className="on">ع</span> / EN
                </>
              ) : (
                <>
                  ع / <span className="on">EN</span>
                </>
              )}
            </button>
          </form>
          {/* Theme — dawn/night sky */}
          <button className="tg" type="button" onClick={() => setDawn((d) => !d)}>
            ◐ <span>{t.theme}</span>
          </button>
        </div>
      </div>

      <div className="stage">
        <div className="crown">
          <div ref={nucleusRef} className="nucleus ov">
            <div className="bloom" />
            <div className="orb" />
            <div className="corona" />
            <div className="spec" />
            <svg className="hex" viewBox="0 0 100 100" fill="none">
              <polygon points="50,5 89,27 89,73 50,95 11,73 11,27" fill="rgba(10,77,58,.85)" stroke="#c69345" strokeWidth="2.4" strokeLinejoin="round" />
              <g className="brainmesh" stroke="#c69345" strokeWidth=".8" opacity=".7">
                <line x1="50" y1="22" x2="34" y2="40" />
                <line x1="50" y1="22" x2="66" y2="40" />
                <line x1="34" y1="40" x2="30" y2="62" />
                <line x1="66" y1="40" x2="70" y2="62" />
                <line x1="34" y1="40" x2="50" y2="52" />
                <line x1="66" y1="40" x2="50" y2="52" />
                <line x1="50" y1="52" x2="30" y2="62" />
                <line x1="50" y1="52" x2="70" y2="62" />
                <line x1="30" y1="62" x2="50" y2="78" />
                <line x1="70" y1="62" x2="50" y2="78" />
                <line x1="50" y1="52" x2="50" y2="78" />
              </g>
              <g className="synapse" fill="#ffe9b8">
                <circle cx="50" cy="22" r="1.6" />
                <circle cx="34" cy="40" r="1.6" />
                <circle cx="66" cy="40" r="1.6" />
                <circle cx="50" cy="52" r="2" />
                <circle cx="30" cy="62" r="1.6" />
                <circle cx="70" cy="62" r="1.6" />
                <circle cx="50" cy="78" r="1.6" />
              </g>
              <g stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".92">
                <line x1="37" y1="33" x2="37" y2="67" />
                <line x1="63" y1="33" x2="63" y2="67" />
                <line x1="37" y1="50" x2="63" y2="50" />
              </g>
            </svg>
          </div>
          <div className="wordmark ov d1">
            H‑Nerve <span className="erp">ERP</span>
          </div>
          <div className="crown-tag ov d1">{t.tag}</div>
        </div>

        <div className="sectors ov d2">
          {t.sectors.map((s, i) => (
            <span key={i}>
              <b>{s}</b>
              {i < t.sectors.length - 1 ? <i>·</i> : null}
            </span>
          ))}
        </div>

        <form ref={cardRef} className="card play" action={formAction} aria-label={t.signin}>
          <div className="rail ov d2" style={{ margin: "0 auto 18px" }} />
          <div className="field ov d2">
            <label htmlFor="lc-email">{t.email}</label>
            <input id="lc-email" name="email" type="email" required placeholder="you@hourani.jo" dir="ltr" autoComplete="username" defaultValue={initialEmail} onFocus={onFieldFocus} onInput={pulseNucleus} />
            <span className="uline" />
          </div>
          <div className="field ov d3">
            <label htmlFor="lc-pw">{t.pw}</label>
            <input id="lc-pw" name="password" type="password" required placeholder="••••••••" dir="ltr" autoComplete="current-password" onFocus={onFieldFocus} onInput={pulseNucleus} />
            <span className="uline" />
          </div>
          <div className="row ov d4">
            <label>
              <input type="checkbox" name="remember" defaultChecked /> <span>{t.remember}</span>
            </label>
          </div>
          <SubmitButton label={t.signin} />
          <div className="err" aria-live="polite">
            {errText}
          </div>
        </form>
      </div>

      <div className="footer ov d5">
        POWERED BY · <b>ANAS MK HASIBA</b> · H‑NERVE
      </div>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.login-cosmos{position:fixed;inset:0;z-index:50;overflow:hidden;color:#f5efe6;
  font-family:"IBM Plex Sans Arabic","Cairo","Tajawal",system-ui,sans-serif;
  --emerald:#0f7a5a;--emerald-deep:#0a4d3a;--gold:#c69345;--gold-soft:#e0c089;--cream:#f5efe6;--mist:#cfe4da;--terra:#b85c38;
  --display:"Fraunces","Tiempos Headline",Georgia,serif;--body:"Inter",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.login-cosmos *{box-sizing:border-box}
.login-cosmos .lc-sky{position:absolute;inset:0;z-index:0}
.login-cosmos .aurora{position:absolute;border-radius:50%;filter:blur(70px);z-index:1;mix-blend-mode:screen;will-change:transform;transition:transform .5s ease-out}
.login-cosmos .a1{width:60vw;height:60vw;left:6%;top:-8%;opacity:.85;background:radial-gradient(circle,rgba(15,122,90,.55),transparent 70%);animation:lcAu1 34s ease-in-out infinite}
.login-cosmos .a2{width:52vw;height:52vw;right:0%;top:34%;opacity:.7;background:radial-gradient(circle,rgba(198,147,69,.34),transparent 70%);animation:lcAu2 42s ease-in-out infinite}
.login-cosmos .a3{width:64vw;height:64vw;left:24%;bottom:-22%;opacity:.5;background:radial-gradient(circle,rgba(205,228,218,.14),transparent 72%);animation:lcAu3 50s ease-in-out infinite}
@keyframes lcAu1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5vw,4vh) scale(1.12)}}
@keyframes lcAu2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-6vw,-3vh) scale(1.14)}}
@keyframes lcAu3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(4vw,-5vh) scale(1.08)}}
.login-cosmos .lc-neural{position:absolute;inset:0;z-index:2}
.login-cosmos .lc-veil{position:absolute;inset:0;z-index:3;pointer-events:none;background:radial-gradient(ellipse 60% 56% at 50% 50%,rgba(6,20,14,0) 0%,rgba(6,20,14,.4) 72%,rgba(6,20,14,.78) 100%)}
.login-cosmos .chrome{position:absolute;top:0;inset-inline:0;z-index:8;display:flex;align-items:center;justify-content:space-between;padding:20px 26px}
.login-cosmos .toggles{display:flex;gap:8px;margin-inline-start:auto}
.login-cosmos .tg{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:999px;cursor:pointer;font-size:12px;font-weight:700;color:var(--mist);background:rgba(255,255,255,.05);border:1px solid rgba(198,147,69,.28);transition:all .3s cubic-bezier(.16,1,.3,1)}
.login-cosmos .tg:hover{border-color:var(--gold);color:#fff}
.login-cosmos .tg .on{color:var(--gold)}
.login-cosmos .stage{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px;will-change:transform}
.login-cosmos .crown{display:flex;flex-direction:column;align-items:center;gap:14px}
.login-cosmos .wordmark{font-family:var(--display);font-size:27px;font-weight:700;color:#fff;text-shadow:0 2px 18px rgba(6,20,14,.9),0 0 30px rgba(6,20,14,.7)}
.login-cosmos .wordmark .erp{color:var(--gold)}
.login-cosmos .crown-tag{font-size:12.5px;font-weight:500;color:#dfeee6;opacity:.95;margin-top:-4px;text-shadow:0 1px 12px rgba(6,20,14,.95)}
.login-cosmos .nucleus{position:relative;width:150px;height:150px;display:grid;place-items:center;z-index:6;animation:lcBloom 4s ease-in-out infinite}
.login-cosmos .bloom{position:absolute;inset:-40px;border-radius:50%;background:radial-gradient(circle,rgba(198,147,69,.42),rgba(15,122,90,.18) 45%,transparent 70%);animation:lcBloom 4s ease-in-out infinite;will-change:transform,opacity}
@keyframes lcBloom{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.12);opacity:1}}
.login-cosmos .hex{width:64px;height:64px;filter:drop-shadow(0 0 12px rgba(224,192,137,.55));will-change:transform;position:relative;z-index:5}
.login-cosmos .orb{position:absolute;left:50%;top:50%;width:124px;height:124px;transform:translate(-50%,-50%);border-radius:50%;overflow:hidden;background:radial-gradient(circle at 38% 33%,#2e6b57,#0f5a44 42%,#0a3328 66%,#06140e);box-shadow:inset 0 2px 20px rgba(220,195,138,.22),inset 0 -12px 34px rgba(0,0,0,.65),0 0 54px rgba(15,122,90,.5)}
.login-cosmos .orb::before{content:"";position:absolute;inset:-25%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg,rgba(224,192,137,.18) 40deg,transparent 90deg,rgba(46,107,87,.3) 160deg,transparent 220deg,rgba(224,192,137,.14) 300deg,transparent 360deg);animation:lcSpin 14s linear infinite;mix-blend-mode:screen}
.login-cosmos .orb::after{content:"";position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle at 50% 45%,rgba(224,192,137,.3),rgba(224,192,137,0) 60%);animation:lcBloom 3.2s ease-in-out infinite}
.login-cosmos .corona{position:absolute;left:50%;top:50%;width:150px;height:150px;transform:translate(-50%,-50%);border-radius:50%;border:1.5px solid rgba(224,192,137,.55);box-shadow:0 0 18px rgba(224,192,137,.45),0 0 40px rgba(15,122,90,.3);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));animation:lcCorona 5s ease-in-out infinite}
@keyframes lcCorona{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}}
.login-cosmos .spec{position:absolute;left:calc(50% - 24px);top:calc(50% - 36px);width:38px;height:22px;border-radius:50%;z-index:4;background:radial-gradient(circle,rgba(255,255,255,.45),transparent 70%);filter:blur(3px);transform:rotate(-25deg);pointer-events:none}
.login-cosmos .synapse circle{animation:lcFire 3.4s ease-in-out infinite}
.login-cosmos .synapse circle:nth-child(2){animation-delay:.5s}.login-cosmos .synapse circle:nth-child(3){animation-delay:1s}
.login-cosmos .synapse circle:nth-child(4){animation-delay:.25s}.login-cosmos .synapse circle:nth-child(5){animation-delay:1.4s}
.login-cosmos .synapse circle:nth-child(6){animation-delay:.8s}.login-cosmos .synapse circle:nth-child(7){animation-delay:1.8s}
@keyframes lcFire{0%,100%{opacity:.25}50%{opacity:1}}
.login-cosmos .brainmesh line{animation:lcMesh 5s ease-in-out infinite}
@keyframes lcMesh{0%,100%{opacity:.35}50%{opacity:.8}}
@keyframes lcSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
.login-cosmos .nucleus.pulse .bloom{animation:lcBloomPulse .5s ease}
@keyframes lcBloomPulse{0%{transform:scale(1)}40%{transform:scale(1.28);opacity:1}100%{transform:scale(1)}}
.login-cosmos .card{position:relative;width:min(354px,90vw);padding:26px 28px 22px;border-radius:18px;background:rgba(8,24,17,.28);backdrop-filter:blur(16px) saturate(130%);-webkit-backdrop-filter:blur(16px) saturate(130%);box-shadow:0 30px 90px -40px rgba(0,0,0,.7)}
.login-cosmos .card::before{content:"";position:absolute;inset:0;border-radius:18px;padding:1px;pointer-events:none;background:linear-gradient(150deg,rgba(198,147,69,.45),rgba(15,122,90,.2) 42%,transparent 72%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.login-cosmos .card::after{content:"";position:absolute;top:0;left:18%;right:18%;height:1px;background:linear-gradient(90deg,transparent,rgba(224,192,137,.8),transparent);animation:lcHair 4s ease-in-out infinite}
@keyframes lcHair{0%,100%{opacity:.3}50%{opacity:.9}}
.login-cosmos .rail{height:1px;width:54px;margin:13px auto 0;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.login-cosmos .field{position:relative;margin-bottom:14px}
.login-cosmos .field label{display:block;font-size:11px;font-weight:600;color:var(--mist);margin-bottom:5px}
.login-cosmos .field input{width:100%;background:rgba(255,255,255,.03);border:0;border-bottom:1.5px solid rgba(205,228,218,.16);border-radius:8px 8px 0 0;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px;outline:none;transition:background .3s}
.login-cosmos .field input::placeholder{color:rgba(205,228,218,.4)}
.login-cosmos .field input:focus{background:rgba(15,122,90,.08)}
.login-cosmos .field .uline{position:absolute;bottom:0;inset-inline:50%;height:1.5px;background:linear-gradient(90deg,var(--gold),var(--gold-soft));border-radius:2px;box-shadow:0 0 9px rgba(198,147,69,.6);transition:inset-inline .4s cubic-bezier(.16,1,.3,1)}
.login-cosmos .field input:focus ~ .uline{inset-inline:0}
.login-cosmos .row{display:flex;align-items:center;justify-content:space-between;margin:2px 0 20px;font-size:12px}
.login-cosmos .row label{display:flex;align-items:center;gap:6px;color:var(--mist);cursor:pointer}
.login-cosmos .row input{accent-color:var(--emerald)}
.login-cosmos .btn{position:relative;width:100%;border:0;cursor:pointer;border-radius:12px;overflow:hidden;padding:13px;font-family:inherit;font-size:14px;font-weight:700;letter-spacing:.02em;color:#fff;background:linear-gradient(135deg,var(--emerald),var(--emerald-deep));box-shadow:0 12px 30px -12px rgba(15,122,90,.8);transition:transform .2s,box-shadow .2s}
.login-cosmos .btn:hover{transform:translateY(-2px);box-shadow:0 18px 40px -14px rgba(15,122,90,.95)}
.login-cosmos .btn:active{transform:translateY(0) scale(.99)}
.login-cosmos .btn:disabled{opacity:.85;cursor:progress}
.login-cosmos .btn .dots{display:inline-block;width:1.4em;text-align:start;vertical-align:bottom}
.login-cosmos .btn .dots::after{content:"";animation:lcDots 1.1s steps(4,end) infinite}
@keyframes lcDots{0%{content:""}25%{content:"·"}50%{content:"··"}75%{content:"···"}100%{content:""}}
.login-cosmos .btn .sheen{position:absolute;inset:0;background:linear-gradient(115deg,transparent 32%,rgba(224,192,137,.5) 50%,transparent 68%);transform:translateX(-130%)}
.login-cosmos .btn:hover .sheen{transform:translateX(130%);transition:transform .6s ease}
.login-cosmos[dir="rtl"] .btn:hover .sheen{transform:translateX(-130%)}
.login-cosmos[dir="rtl"] .btn .sheen{transform:translateX(130%)}
.login-cosmos .err{text-align:center;font-size:12px;color:var(--terra);margin-top:12px;min-height:14px;opacity:0;transition:opacity .3s}
.login-cosmos .err:not(:empty){opacity:1}
.login-cosmos .card.shake{animation:lcShake .4s}
@keyframes lcShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
.login-cosmos .sectors{z-index:5;text-align:center;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(224,192,137,.78);max-width:620px;line-height:1.6;text-shadow:0 1px 10px rgba(6,20,14,.9)}
.login-cosmos .sectors b{font-weight:600}
.login-cosmos .sectors i{font-style:normal;opacity:.5;margin:0 8px}
.login-cosmos .footer{position:absolute;bottom:16px;inset-inline:0;z-index:6;text-align:center;font-family:var(--body);font-size:9.5px;letter-spacing:.22em;color:rgba(207,228,218,.45)}
.login-cosmos .footer b{color:var(--gold-soft);font-weight:600}
.login-cosmos .ov{opacity:0}
.login-cosmos.play .ov{animation:lcRise .9s cubic-bezier(.16,1,.3,1) forwards}
.login-cosmos.play .d1{animation-delay:.5s}.login-cosmos.play .d2{animation-delay:.72s}.login-cosmos.play .d3{animation-delay:.92s}.login-cosmos.play .d4{animation-delay:1.08s}.login-cosmos.play .d5{animation-delay:1.24s}
@keyframes lcRise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.login-cosmos .nucleus.ov{opacity:0}.login-cosmos.play .nucleus{animation:lcRise 1s cubic-bezier(.16,1,.3,1) .25s forwards,lcBloom 4s ease-in-out 1.25s infinite}
.login-cosmos.dive .chrome,.login-cosmos.dive .footer{transition:opacity .4s;opacity:0}
.login-cosmos.dive .card,.login-cosmos.dive .sectors,.login-cosmos.dive .crown-tag,.login-cosmos.dive .wordmark{transition:opacity .5s,transform .6s cubic-bezier(.7,0,.84,0);opacity:0;transform:translateY(18px) scale(.96)}
.login-cosmos.dive .stage{animation:lcDive 1.1s cubic-bezier(.6,0,.3,1) forwards}
@keyframes lcDive{0%{transform:scale(1);filter:blur(0)}55%{filter:blur(1.5px)}100%{transform:scale(4.2);filter:blur(8px);opacity:0}}
.login-cosmos.dive .lc-neural,.login-cosmos.dive .aurora{transition:transform 1.1s cubic-bezier(.6,0,.3,1),filter 1.1s;transform:scale(1.6);filter:blur(3px)}
.login-cosmos.dive .lc-flash{opacity:1}
.login-cosmos .lc-flash{position:absolute;inset:0;z-index:20;background:radial-gradient(circle at 50% 46%,rgba(224,192,137,.92),rgba(15,122,90,.45) 32%,transparent 66%);opacity:0;pointer-events:none;transition:opacity .9s ease-in}
.login-cosmos.dive .nucleus{animation:lcFlare .9s cubic-bezier(.5,0,.3,1) forwards!important}
@keyframes lcFlare{0%{transform:scale(1);filter:brightness(1)}40%{transform:scale(1.5);filter:brightness(2.4) drop-shadow(0 0 40px rgba(224,192,137,.9))}100%{transform:scale(6);opacity:0;filter:brightness(3)}}
@media (prefers-reduced-motion:reduce){
  .login-cosmos .aurora{animation:none!important;opacity:.5}
  .login-cosmos .hex,.login-cosmos .bloom,.login-cosmos .nucleus{animation:none!important}
  .login-cosmos .ov,.login-cosmos.play .ov,.login-cosmos .nucleus.ov{opacity:1!important;animation:none!important;transform:none!important}
  .login-cosmos .lc-neural{display:none}
}
@media (max-width:560px){ .login-cosmos .sectors{display:none} }
@media (max-height:680px){
  .login-cosmos .stage{gap:16px}
  .login-cosmos .nucleus{width:92px;height:92px}
  .login-cosmos .hex{width:62px;height:62px}
  .login-cosmos .card{padding:26px 30px 22px}
}
@media (max-height:560px){ .login-cosmos .nucleus{display:none} .login-cosmos .sectors{display:none} }
`;
