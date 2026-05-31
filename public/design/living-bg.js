/* ════════════════════════════════════════════════════════════════
   H-NERVE · GLOBAL LIVING BACKGROUND  (shared include — Phase 2)
   ----------------------------------------------------------------
   Self-initializing. Just add to any page:
       <link rel="stylesheet" href="living-bg.css">
       <script src="living-bg.js" defer></script>
   Mode comes from data-living on <html> or <body> ("work" default,
   or "night"). Injects an aurora layer + a low-density particle
   canvas drifting at ~0.05x. Pauses when tab hidden. Honors
   prefers-reduced-motion (static gradient, no canvas).
   ════════════════════════════════════════════════════════════════ */
(function () {
  if (document.getElementById("living-bg")) return; // idempotent
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mode = document.documentElement.getAttribute("data-living")
          || document.body.getAttribute("data-living") || "work";
  if (!document.documentElement.getAttribute("data-living"))
    document.documentElement.setAttribute("data-living", mode);

  // ── DOM ──
  var root = document.createElement("div");
  root.id = "living-bg";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML =
    '<div class="lb-aurora a1"></div><div class="lb-aurora a2"></div><div class="lb-aurora a3"></div>' +
    '<canvas class="lb-particles"></canvas>';
  document.body.insertBefore(root, document.body.firstChild);

  if (reduce) return; // static gradient only

  // ── particle canvas ──
  var cv = root.querySelector(".lb-particles");
  var ctx = cv.getContext("2d");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, parts = [];
  var TAU = Math.PI * 2;

  // palettes per mode
  var PAL = mode === "night"
    ? [["220,195,138", 0.30], ["205,224,214", 0.22], ["46,107,87", 0.20]]   // gold / mist / emerald, brighter
    : [["194,163,90", 0.22], ["126,155,134", 0.18], ["180,170,140", 0.14]]; // gold / sage / warm-ivory, subliminal
  var COUNT = mode === "night" ? 90 : 26;
  var SPEED = mode === "night" ? 0.10 : 0.05; // px/frame base (×0.05x feel)

  function pick() { return PAL[(Math.random() * PAL.length) | 0]; }

  function resize() {
    W = cv.width = innerWidth * DPR;
    H = cv.height = innerHeight * DPR;
    cv.style.width = innerWidth + "px";
    cv.style.height = innerHeight + "px";
  }
  function seed() {
    parts = [];
    for (var i = 0; i < COUNT; i++) {
      var c = pick();
      var twinkle = mode === "night";
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        r: (Math.random() * (twinkle ? 1.0 : 1.6) + (twinkle ? 0.4 : 0.7)) * DPR,
        vx: (Math.random() - 0.5) * SPEED * DPR,
        vy: (Math.random() - 0.5) * SPEED * DPR - (twinkle ? 0 : 0.015 * DPR),
        col: c[0], baseA: c[1] * (0.5 + Math.random() * 0.6),
        amp: twinkle ? 0.5 : 0.18, period: Math.random() * 4000 + 3000, phase: Math.random() * TAU
      });
    }
  }
  resize(); seed();
  addEventListener("resize", function () { resize(); seed(); });

  var running = true;
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) loop(performance.now());
  });

  function loop(now) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      var a = p.baseA + p.amp * Math.sin(now / p.period * TAU + p.phase);
      if (a < 0) a = 0;
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(" + p.col + ",1)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
