#!/usr/bin/env node
// Build the served Orrery hub (public/hub/*) from the pristine design reference
// at docs/design/orrery/index.html (itself unpacked from a Claude Design standalone
// export — see docs/design/orrery/PORT-MAP.md).
//
//   node scripts/build-orrery.mjs
//
// Pipeline: extract <style> blocks + body markup + inline engine from the reference,
// rewire the engine's hard navigations into a postMessage bridge (window.__hnNavigate),
// point font urls at /hub/fonts, copy fonts + GSAP into public/, then assemble a
// single self-contained doc that the OrreryFrame iframe loads. Idempotent.
//
// WHY public/hub and not public/orrery: on Cloudflare Workers the static-assets
// layer answers BEFORE the Worker runs and auto-serves directory index.html files,
// so public/orrery/index.html shadowed the Next /orrery route entirely — users got
// the bare static doc top-level, where the postMessage navigation bridge has no
// parent listening and every orbit click silently did nothing ("the system froze").
// The asset dir must NEVER share a path with a Next route. See PR notes 2026-07-19.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REF_DIR = join(ROOT, "docs/design/orrery");
const REF = join(REF_DIR, "index.html");
const RES = join(REF_DIR, "resources");
const OUT = join(ROOT, "public/hub");
const OUT_FONTS = join(OUT, "fonts");

const html = readFileSync(REF, "utf8");

// 1) styles — concatenate every <style> block from the reference <head>
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
let css = styles.join("\n\n/* ── next block ── */\n\n");
// fonts resolve from /hub/fonts in the app
css = css.replace(/url\("resources\/([^"]+\.woff2)"\)/g, 'url("/hub/fonts/$1")');

// 2) body markup — between <body> and the first inline <script>, minus any <script src>
let markup = /<body>([\s\S]*?)<script>/.exec(html)[1];
markup = markup.replace(/<script[^>]*src=[^>]*><\/script>/g, "").trim();

// 3) inline engine — the first inline <script> before the trailing external scripts
let engine = /<body>[\s\S]*?<script>([\s\S]*?)<\/script>\s*<script src/.exec(html)[1];
// bridge: every hard navigation becomes a message to the Next router host
engine = engine.replace(/location\.href\s*=\s*([^;]+);/g, "window.__hnNavigate($1);");
if (/location\.href\s*=/.test(engine)) throw new Error("unrewired location.href remains in engine");

// bridge: the in-hub language toggle must persist the REAL app locale. setLang()
// only flips the iframe's own visuals, so also notify the parent (OrreryFrame),
// which writes the h_nerve_locale cookie + reloads → whole-app bilingual switch.
// GUARD: post only once setLang is user-driven (window.__hnLangReady). The hub
// hardcodes setLang("ar") at init; without this guard an English-locale app
// would be clobbered back to Arabic on every Orrery load.
engine = engine.replace(
  /(document\.documentElement\.dir\s*=\s*\(l==="ar"\)\s*\?\s*"rtl"\s*:\s*"ltr";)/,
  '$1\n  if(window.__hnLangReady){ try{ parent.postMessage({__orreryLang:l}, "*"); }catch(e){} }',
);
// arm the bridge only AFTER the hardcoded init setLang("ar") has run.
engine = engine.replace(
  /(\n\s*setLang\("ar"\);)/,
  '$1\n  window.__hnLangReady = true;',
);
if (!/__hnLangReady = true/.test(engine)) throw new Error("failed to arm orrery lang bridge after init setLang");

// 4) copy assets
mkdirSync(OUT_FONTS, { recursive: true });
let fonts = 0;
for (const f of readdirSync(RES)) {
  if (f.endsWith(".woff2")) {
    copyFileSync(join(RES, f), join(OUT_FONTS, f));
    fonts++;
  }
}
// GSAP (vendor) — the engine's only hard dependency
const gsap = readdirSync(RES).find((f) => /^9f74afc4.*\.js$/.test(f));
if (!gsap) throw new Error("GSAP resource not found in reference resources/");
copyFileSync(join(RES, gsap), join(OUT, "gsap.js"));

// 5) assemble the served doc
const doc = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>H-Nerve · المدار</title>
<style>${css}</style>
<script src="/hub/gsap.js"></script>
</head>
<body>
${markup}
<script>
/* Standalone guard: this doc only functions inside the OrreryFrame iframe —
   the navigation bridge posts to the parent. Opened top-level (old bookmark,
   direct asset hit), no parent listens and every click would dead-end, so
   self-heal into the real authenticated hub route instead. */
if (window === window.parent) { location.replace("/orrery"); }
/* bridge: dives post up to the Next router instead of hard navigation */
window.__hnNavigate = function(h){ try{ parent.postMessage({__orreryNav:h}, "*"); }catch(e){ location.href=h; } };
/* receiver: the host pushes real identity + locale after load */
window.addEventListener("message", function(e){
  var d = e && e.data || {};
  if(!d || !d.__orrerySet) return;
  try{
    if(d.lang && typeof window.setLang==="function") window.setLang(d.lang);
    if(d.userName){ var u=document.getElementById("userName"); if(u) u.textContent=d.userName; }
    if(d.roleLabel){ var r=document.getElementById("roleLabel"); if(r) r.textContent=d.roleLabel; }
    if(d.iq){ var q=document.getElementById("tbIQ"); if(q) q.textContent="IQ "+d.iq; }
  }catch(err){}
});
</script>
<script>${engine}</script>
</body></html>
`;
writeFileSync(join(OUT, "index.html"), doc);
console.log(
  `built public/hub/index.html (${doc.length} chars) · ${styles.length} style blocks · ${fonts} fonts · gsap ✓`,
);
