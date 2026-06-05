"use client";

// Phase 28 — The Companion ("الشرارة / The Spark").
// A small ambient photon of emerald-gold light that idles in the bottom-right
// corner and occasionally drifts to nearby positions. It is the visible body
// of the Brain — subtle, never intrusive, never covers content.
//
// Hard rules:
//  • prefers-reduced-motion → hidden, no animation
//  • Dismissible + remembered via localStorage (key: hn_companion_off)
//  • pointer-events: none on the mote; only the dismiss × is interactive
//  • transform/opacity only — no layout shifts, near-zero CPU when idle
//  • z-index 9000: above app chrome, below modals (10000+)

import { useEffect, useRef, useState } from "react";

// Drift target offsets (px) from the fixed base position (bottom-right corner).
// Negative ty = move up, negative tx = move left.
const DRIFT_TARGETS: [number, number][] = [
  [0, 0],         // home
  [0, -220],      // up
  [-100, -150],   // up-left
  [-60, -40],     // slightly left
  [0, -380],      // high up
  [-140, -60],    // left
];

export function Companion() {
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const [drifting, setDrifting] = useState(false);
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Never animate under reduced motion
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Respect dismiss preference
    try {
      if (localStorage.getItem("hn_companion_off") === "1") return;
    } catch {/* ignore */}
    setVisible(true);
  }, []);

  // Drift loop — only runs while visible
  useEffect(() => {
    if (!visible) return;
    let idx = 0;
    function scheduleDrift() {
      const delay = 7000 + Math.random() * 6000;
      timerRef.current = setTimeout(() => {
        // Pick next target (never the same index twice in a row)
        let next = Math.floor(Math.random() * DRIFT_TARGETS.length);
        if (next === idx) next = (next + 1) % DRIFT_TARGETS.length;
        idx = next;
        setDrifting(true);
        setOffset(DRIFT_TARGETS[next]);
        // Settle: stop the drift class after transition completes
        setTimeout(() => setDrifting(false), 2200);
        scheduleDrift();
      }, delay);
    }
    scheduleDrift();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  // Occasional pulse (simulates Brain activity)
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      if (Math.random() < 0.35) {
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem("hn_companion_off", "1"); } catch {/* ignore */}
  }

  if (!visible) return null;

  const tx = offset[0];
  const ty = offset[1];

  return (
    <div
      className={"hn-spark-wrap" + (drifting ? " hn-drifting" : "") + (pulse ? " hn-pulse" : "")}
      style={{ transform: `translate(${tx}px, ${ty}px)` }}
      aria-hidden="true"
    >
      {/* comet trail */}
      <div className="hn-spark-trail" />
      {/* core mote */}
      <div className="hn-spark-core" />
      {/* dismiss button — only this div has pointer-events */}
      <button
        className="hn-spark-dismiss"
        onClick={dismiss}
        aria-label="Hide companion"
        title="Hide"
        aria-hidden="false"
      >
        ×
      </button>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
/* ── Base wrapper ── fixed to bottom-right; drifts via transform ── */
.hn-spark-wrap {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 20px;
  height: 20px;
  z-index: 9000;
  pointer-events: none;
  transition: transform 2.0s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* ── Core mote — emerald-gold photon ── */
.hn-spark-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 38%, #f0c040 0%, #2e9b6a 55%, transparent 78%);
  box-shadow:
    0 0 6px 2px rgba(240,192,64,.55),
    0 0 14px 5px rgba(46,155,106,.40),
    0 0 28px 10px rgba(46,107,87,.20);
  animation: hnBob 3.8s ease-in-out infinite;
}

/* ── Comet trail ── */
.hn-spark-trail {
  position: absolute;
  top: 6px;
  right: 14px;
  width: 28px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(to left, rgba(240,192,64,.45), transparent);
  opacity: 0;
  transition: opacity .4s;
}
.hn-drifting .hn-spark-trail {
  opacity: 1;
}

/* ── Bob idle ── */
@keyframes hnBob {
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}

/* ── Pulse (Brain activity) ── */
.hn-pulse .hn-spark-core {
  animation: hnBob 3.8s ease-in-out infinite, hnFlare .9s ease-out;
}
@keyframes hnFlare {
  0%   { box-shadow: 0 0 6px 2px rgba(240,192,64,.55), 0 0 14px 5px rgba(46,155,106,.40), 0 0 28px 10px rgba(46,107,87,.20); }
  40%  { box-shadow: 0 0 12px 6px rgba(240,192,64,.9), 0 0 30px 12px rgba(46,155,106,.70), 0 0 50px 20px rgba(46,107,87,.35); }
  100% { box-shadow: 0 0 6px 2px rgba(240,192,64,.55), 0 0 14px 5px rgba(46,155,106,.40), 0 0 28px 10px rgba(46,107,87,.20); }
}

/* ── Dismiss × ── */
.hn-spark-dismiss {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(240,192,64,.35);
  background: rgba(10,24,19,.75);
  color: rgba(240,192,64,.6);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity .25s;
  padding: 0;
}
.hn-spark-wrap:hover .hn-spark-dismiss {
  opacity: 1;
}

/* ── Reduced motion: never render at all (component checks matchMedia before
   setting visible, so this is a belt-and-suspenders guard) ── */
@media (prefers-reduced-motion: reduce) {
  .hn-spark-wrap { display: none !important; }
}
`;
