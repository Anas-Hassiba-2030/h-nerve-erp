/* H-Nerve section behaviors — reveal on scroll, count-up, segmented slider.
   Calm, no scroll-jacking. Honors prefers-reduced-motion. */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── reveal: content is visible by default; entry is INSTANT (no cascade).
  //    Only elements scrolled into view AFTER load get the rise flourish. ──
  var revs = [].slice.call(document.querySelectorAll(".reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    revs.forEach(function (e) { countWithin(e); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");      // animate on scroll-in
          countWithin(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    // Above-the-fold: show instantly (no .in animation), just count up.
    // Below-the-fold: observe → animate when scrolled into view.
    requestAnimationFrame(function () {
      revs.forEach(function (e) {
        var r = e.getBoundingClientRect();
        if (r.top < innerHeight * 0.96) { countWithin(e); }
        else { io.observe(e); }
      });
    });
  }

  // ── count-up ──
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function countWithin(scope) {
    scope.querySelectorAll("[data-count]").forEach(function (el) {
      if (el._done) return; el._done = true;
      var target = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var ar = el.getAttribute("data-ar") === "1";
      function fmt(v) {
        var s = v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
        if (ar) s = s.replace(/[0-9]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; });
        return prefix + s + suffix;
      }
      if (reduce) { el.textContent = fmt(target); return; }
      var dur = 1300, t0 = null;
      function step(now) {
        if (!t0) t0 = now;
        var p = Math.min((now - t0) / dur, 1);
        el.textContent = fmt(target * easeOut(p));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // ── segmented control: one absolute indicator slides; labels never move ──
  document.querySelectorAll(".seg").forEach(function (seg) {
    var ind = seg.querySelector(".seg-ind");
    var btns = seg.querySelectorAll("button");
    function move(btn) {
      if (!ind) return;
      // offsetLeft is relative to .seg (position:relative); indicator base is left:0,
      // so translateX(offsetLeft) aligns it over the button in BOTH ltr and rtl.
      ind.style.width = btn.offsetWidth + "px";
      ind.style.transform = "translateX(" + btn.offsetLeft + "px)";
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active"); move(b);
      });
    });
    var act = seg.querySelector("button.active") || btns[0];
    if (act) { act.classList.add("active"); requestAnimationFrame(function () { move(act); }); }
    // keep aligned if fonts load late / on resize
    addEventListener("resize", function () { var a = seg.querySelector("button.active"); if (a) move(a); });
  });
  // ── button ripple (Phase 3) ──
  if (!reduce) {
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest(".btn");
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 1.1;
      var rip = document.createElement("span");
      rip.className = "ix-ripple";
      rip.style.width = rip.style.height = size + "px";
      rip.style.left = (e.clientX - r.left) + "px";
      rip.style.top = (e.clientY - r.top) + "px";
      btn.appendChild(rip);
      setTimeout(function () { rip.remove(); }, 560);
    });
  }
  // ── return/between-section dive: page contracts into a glowing orb (~420ms) ──
  if (!reduce) {
    var orb = document.createElement("div");
    orb.id = "nav-orb";
    document.body.appendChild(orb);
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || a.target === "_blank" || /^(https?:|mailto:)/i.test(href)) return;
      e.preventDefault();
      orb.classList.add("go");
      document.body.classList.add("diving");
      setTimeout(function () { location.href = href; }, 410);
    });
  }
})();
