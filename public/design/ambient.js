/* ════════════════════════════════════════════════════════════════
   H-NERVE · SECTION SIGNATURE BACKGROUNDS  (Phase 4 — elevated)
   ----------------------------------------------------------------
   One canvas behind content (z-index 0, above the Phase 2 living
   base, below content). Rich, visibly-alive ambient per sector,
   chosen by  data-ambient="hospitality|dairy|agriculture|university|
   holding|finance|cosmic". 60fps, transform+opacity feel, pauses
   when hidden. Reduced-motion → static tint (ambient.css).
   ════════════════════════════════════════════════════════════════ */
(function () {
  var amb = document.documentElement.getAttribute("data-ambient")
         || (document.body && document.body.getAttribute("data-ambient"));
  if (!amb || document.getElementById("ambient-bg")) return;

  var root = document.createElement("div");
  root.id = "ambient-bg";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = '<div class="amb-tint"></div><canvas class="amb-canvas"></canvas>';
  var living = document.getElementById("living-bg");
  if (living && living.nextSibling) document.body.insertBefore(root, living.nextSibling);
  else document.body.insertBefore(root, document.body.firstChild);

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var cv = root.querySelector(".amb-canvas");
  var ctx = cv.getContext("2d");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    W = cv.width = Math.floor(innerWidth * DPR);
    H = cv.height = Math.floor(innerHeight * DPR);
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    if (sig.init) sig.init();
  }

  /* ─────────────────────── signatures ─────────────────────── */
  var SIGS = {
    // أرينا — GOLDEN HOUR: diagonal god-rays + dust motes catching light
    hospitality: {
      init: function () {
        this.motes = []; var n = 60;
        for (var i = 0; i < n; i++) this.motes.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.6, 2.2) * DPR, vx: rnd(-0.06, -0.02) * DPR, vy: rnd(-0.04, -0.01) * DPR, a: rnd(0.15, 0.5), ph: rnd(0, TAU), pr: rnd(2600, 6000) });
      },
      draw: function (t) {
        // diagonal god-ray bands
        ctx.save();
        ctx.translate(W * 0.5, H * 0.5); ctx.rotate(-0.55); ctx.translate(-W * 0.5, -H * 0.5);
        var sweep = (Math.sin(t / 9000) * 0.5 + 0.5) * W * 0.4;
        for (var b = 0; b < 5; b++) {
          var x = (b / 5) * W * 1.8 - W * 0.4 + sweep;
          var g = ctx.createLinearGradient(x, 0, x + W * 0.16, 0);
          g.addColorStop(0, "rgba(194,163,90,0)");
          g.addColorStop(0.5, "rgba(212,180,110,0.13)");
          g.addColorStop(1, "rgba(194,163,90,0)");
          ctx.fillStyle = g; ctx.fillRect(x, -H, W * 0.16, H * 3);
        }
        ctx.restore();
        // dust motes
        for (var i = 0; i < this.motes.length; i++) {
          var m = this.motes[i]; m.x += m.vx; m.y += m.vy;
          if (m.x < -8) m.x = W + 8; if (m.y < -8) m.y = H + 8;
          ctx.globalAlpha = m.a * (0.5 + 0.5 * Math.sin(t / m.pr + m.ph));
          ctx.fillStyle = "rgba(222,195,138,1)";
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
    // المها — FLOWING MILK: liquid waves lower half + rising bubbles
    dairy: {
      init: function () {
        this.bubbles = []; for (var i = 0; i < 26; i++) this.bubbles.push(this.spawn());
      },
      spawn: function () { return { x: Math.random() * W, y: H + Math.random() * H * 0.5, r: rnd(2, 7) * DPR, sp: rnd(0.1, 0.4) * DPR, a: rnd(0.12, 0.34) }; },
      draw: function (t) {
        // flowing milk waves across the lower half
        for (var w = 0; w < 3; w++) {
          var baseY = H * (0.62 + w * 0.13);
          var amp = H * 0.035 * (1 + w * 0.3);
          ctx.beginPath(); ctx.moveTo(0, H);
          for (var x = 0; x <= W; x += 28 * DPR) {
            var y = baseY + Math.sin(x / (W * 0.22) + t / (2600 + w * 900) + w) * amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, H); ctx.closePath();
          ctx.fillStyle = ["rgba(255,255,255,0.30)", "rgba(244,247,248,0.26)", "rgba(232,240,243,0.22)"][w];
          ctx.fill();
        }
        // rising cream bubbles
        for (var i = 0; i < this.bubbles.length; i++) {
          var b = this.bubbles[i]; b.y -= b.sp; b.x += Math.sin(t / 1800 + b.y / 60) * 0.2 * DPR;
          if (b.y < H * 0.45) this.bubbles[i] = this.spawn();
          ctx.globalAlpha = b.a; ctx.fillStyle = "rgba(255,255,255,1)";
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
    // لوران — LIVING FIELD: green hills + pollen on wind + crop rows in depth
    agriculture: {
      init: function () {
        this.pollen = []; for (var i = 0; i < 40; i++) this.pollen.push({ x: Math.random() * W, y: rnd(0, H * 0.85), r: rnd(0.8, 2.4) * DPR, vx: rnd(0.15, 0.5) * DPR, ph: rnd(0, TAU), a: rnd(0.18, 0.5) });
      },
      draw: function (t) {
        // receding crop-row lines (perspective)
        ctx.strokeStyle = "rgba(94,123,90,0.10)"; ctx.lineWidth = 1 * DPR;
        var hy = H * 0.6;
        for (var r = 0; r < 7; r++) {
          var y = hy + Math.pow(r / 7, 1.8) * H * 0.4;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        // soft hills
        for (var k = 0; k < 2; k++) {
          ctx.beginPath(); ctx.moveTo(0, H);
          var by = H * (0.66 + k * 0.12);
          for (var x = 0; x <= W; x += 40 * DPR) ctx.lineTo(x, by + Math.sin(x / (W * 0.3) + k) * H * 0.02);
          ctx.lineTo(W, H); ctx.closePath();
          ctx.fillStyle = k ? "rgba(110,140,108,0.10)" : "rgba(126,155,134,0.13)"; ctx.fill();
        }
        // pollen drifting on wind
        for (var i = 0; i < this.pollen.length; i++) {
          var p = this.pollen[i]; p.x += p.vx; p.y += Math.sin(t / 1400 + p.ph) * 0.18 * DPR;
          if (p.x > W + 8) { p.x = -8; p.y = rnd(0, H * 0.85); }
          ctx.globalAlpha = p.a; ctx.fillStyle = "rgba(196,206,150,1)";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
    // الأهلية — CHALK & ARCHITECTURE: line constellations + ghost arches + rising chalk
    university: {
      init: function () {
        this.nodes = []; for (var i = 0; i < 16; i++) this.nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: rnd(-0.05, 0.05) * DPR, vy: rnd(-0.05, 0.05) * DPR });
        this.chalk = []; for (var j = 0; j < 34; j++) this.chalk.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.6, 1.8) * DPR, vy: rnd(-0.3, -0.08) * DPR, a: rnd(0.12, 0.4) });
      },
      draw: function (t) {
        // ghost arches
        ctx.strokeStyle = "rgba(120,130,200,0.07)"; ctx.lineWidth = 1.5 * DPR;
        for (var a = 0; a < 3; a++) {
          var ax = W * (0.25 + a * 0.25), aw = W * 0.1, ay = H * 0.78;
          ctx.beginPath(); ctx.moveTo(ax - aw, ay);
          ctx.lineTo(ax - aw, ay - H * 0.18);
          ctx.arc(ax, ay - H * 0.18, aw, Math.PI, 0); ctx.lineTo(ax + aw, ay); ctx.stroke();
        }
        // constellation lines
        var ns = this.nodes;
        for (var i = 0; i < ns.length; i++) {
          var n = ns[i]; n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1;
          for (var j2 = i + 1; j2 < ns.length; j2++) {
            var d = Math.hypot(n.x - ns[j2].x, n.y - ns[j2].y);
            if (d < W * 0.16) { ctx.globalAlpha = (1 - d / (W * 0.16)) * 0.10; ctx.strokeStyle = "rgba(79,93,209,1)"; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(ns[j2].x, ns[j2].y); ctx.stroke(); }
          }
        }
        ctx.globalAlpha = 1;
        // rising chalk dust
        for (var c = 0; c < this.chalk.length; c++) {
          var ch = this.chalk[c]; ch.y += ch.vy; ch.x += Math.sin(t / 2000 + ch.y / 80) * 0.12 * DPR;
          if (ch.y < -6) { ch.y = H + 6; ch.x = Math.random() * W; }
          ctx.globalAlpha = ch.a; ctx.fillStyle = "rgba(180,188,224,1)";
          ctx.beginPath(); ctx.arc(ch.x, ch.y, ch.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
    // الحوراني القابضة — HERITAGE RINGS: concentric gold ripples from center
    holding: {
      init: function () { this.t0 = 0; },
      draw: function (t) {
        var cxp = W / 2, cyp = H * 0.46, max = Math.max(W, H) * 0.75, n = 6, period = 7000;
        ctx.lineWidth = 1.5 * DPR;
        for (var i = 0; i < n; i++) {
          var prog = ((t / period) + i / n) % 1;
          var r = prog * max;
          ctx.globalAlpha = Math.sin(prog * Math.PI) * 0.16;
          ctx.strokeStyle = "rgba(194,163,90,1)";
          ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    },
    // المالية — DATA TIDE: upward grid + candlestick silhouettes + gold tick flickers
    finance: {
      init: function () {
        this.candles = []; var n = 22, bw = W / n;
        for (var i = 0; i < n; i++) this.candles.push({ x: i * bw + bw * 0.3, w: bw * 0.4, h: rnd(H * 0.06, H * 0.26), up: Math.random() < 0.55, ph: rnd(0, TAU) });
        this.bw = bw; this.gridY = 0;
        this.ticks = []; for (var k = 0; k < 8; k++) this.ticks.push({ x: Math.random() * W, y: Math.random() * H, a: 0, ph: rnd(0, TAU) });
      },
      draw: function (t) {
        // upward-drifting grid
        var step = 48 * DPR; this.gridY = (t / 60) % step;
        ctx.strokeStyle = "rgba(46,107,87,0.06)"; ctx.lineWidth = 1 * DPR;
        for (var y = H - this.gridY; y > 0; y -= step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        for (var x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        // candlestick silhouettes scrolling slowly
        var off = (t / 22) % (this.bw * 2);
        var baseY = H * 0.62;
        for (var i = 0; i < this.candles.length; i++) {
          var c = this.candles[i]; var cx2 = c.x - off; if (cx2 < -this.bw) cx2 += this.bw * (this.candles.length);
          var bob = Math.sin(t / 2200 + c.ph) * H * 0.012;
          ctx.globalAlpha = 0.07;
          ctx.fillStyle = c.up ? "rgba(46,107,87,1)" : "rgba(168,106,92,1)";
          ctx.fillRect(cx2, baseY - c.h / 2 + bob, c.w, c.h);
          ctx.fillRect(cx2 + c.w / 2 - 0.5 * DPR, baseY - c.h / 2 - 10 * DPR + bob, 1 * DPR, c.h + 20 * DPR);
        }
        // gold tick flickers
        for (var k = 0; k < this.ticks.length; k++) {
          var tk = this.ticks[k]; var a = Math.max(0, Math.sin(t / 900 + tk.ph));
          ctx.globalAlpha = a * 0.5; ctx.fillStyle = "rgba(212,180,110,1)";
          ctx.beginPath(); ctx.arc(tk.x, tk.y, 1.6 * DPR, 0, TAU); ctx.fill();
          if (a < 0.02 && Math.random() < 0.03) { tk.x = Math.random() * W; tk.y = Math.random() * H; }
        }
        ctx.globalAlpha = 1;
      }
    },
    // العقل — COSMIC: data motes drifting toward central glow (reference, unchanged)
    cosmic: {
      init: function () { this.motes = []; for (var i = 0; i < 50; i++) this.motes.push(this.spawn()); },
      spawn: function () { var a = Math.random() * TAU, R = Math.max(W, H) * 0.55; return { x: W / 2 + Math.cos(a) * R, y: H * 0.46 + Math.sin(a) * R, r: rnd(0.5, 1.7) * DPR, sp: rnd(0.15, 0.55) * DPR, a: rnd(0.15, 0.55), gold: Math.random() < 0.5 }; },
      draw: function () {
        var cxp = W / 2, cyp = H * 0.46;
        for (var i = 0; i < this.motes.length; i++) {
          var m = this.motes[i]; var dx = cxp - m.x, dy = cyp - m.y, d = Math.hypot(dx, dy) || 1;
          m.x += (dx / d) * m.sp; m.y += (dy / d) * m.sp;
          if (d < 24 * DPR) { this.motes[i] = this.spawn(); continue; }
          ctx.globalAlpha = m.a * Math.min(1, d / (W * 0.4));
          ctx.fillStyle = m.gold ? "rgba(220,195,138,1)" : "rgba(205,224,214,1)";
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  var sig = SIGS[amb] || SIGS.cosmic;
  resize();
  addEventListener("resize", resize);

  var running = true;
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
  function loop(now) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    sig.draw(now || 0);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
