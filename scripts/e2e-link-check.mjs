// scripts/e2e-link-check.mjs
//
// Button / link-direction check. Logs in, then crawls every internal link
// reachable from the nav + a seed set of pages, visits each, and flags any
// that 404 or 5xx — so we can be sure every button/link points somewhere real.
//
//   PW=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//   BASE=http://localhost:3000 node scripts/e2e-link-check.mjs
//
// Exit code 1 if any broken link is found.

import { chromium } from "playwright-core";

const EXEC = process.env.PW || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = process.env.BASE || "http://localhost:3000";
const EMAIL = process.env.EMAIL || "admin@hourani.jo";
const PASS = process.env.PASS || "admin123";

// Seed pages to crawl outward from.
const SEEDS = [
  "/orrery", "/dashboard", "/companies", "/hotels", "/dairy", "/farms",
  "/education", "/supply-chain", "/finance", "/insights", "/plans",
  "/messages", "/tasks", "/digest", "/employees", "/brain", "/brain/council",
  "/brain/memory", "/brain/learning", "/brain/iq", "/brain/trust",
  "/brain/narrate", "/workflows", "/integrations", "/settings", "/me",
];

(async () => {
  const b = await chromium.launch({ executablePath: EXEC, headless: true, args: ["--no-sandbox"] });
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "ar" })).newPage();

  // login
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button.btn-primary[type="submit"]');
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const s = await page.evaluate(async () => (await fetch("/dashboard", { redirect: "manual" })).status).catch(() => 0);
    if (s === 200) break;
  }
  await page.evaluate(() => { const d = new Date().toISOString().slice(0, 10);
    localStorage.setItem("hnerve_briefing", d); localStorage.setItem("h_nerve_onboarded_v1", "1"); localStorage.setItem("h_nerve_welcome_v1.4_seen", "1"); });

  // Collect internal links from each seed page
  const links = new Set();
  for (const s of SEEDS) links.add(s);
  for (const s of SEEDS) {
    try {
      await page.goto(BASE + s, { waitUntil: "domcontentloaded", timeout: 12000 });
      await page.waitForTimeout(150);
      const found = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => a.getAttribute("href")),
      );
      for (const h of found) {
        if (!h) continue;
        const clean = h.split("#")[0].split("?")[0];
        // skip dynamic [id] links we can't resolve generically & logout
        if (clean && !clean.startsWith("/api") && clean !== "/logout") links.add(clean);
      }
    } catch {}
  }

  // Visit each link, record status
  const broken = [];
  const ok = [];
  for (const href of [...links].sort()) {
    try {
      const resp = await page.goto(BASE + href, { waitUntil: "domcontentloaded", timeout: 12000 });
      const code = resp ? resp.status() : 0;
      const body = (await page.textContent("body").catch(() => "")) || "";
      const is404 = /Page not found|SIGNAL LOST|could not be found/i.test(body);
      if (code >= 400 || is404) broken.push(`${href} → ${code}${is404 ? " (404 page)" : ""}`);
      else ok.push(href);
    } catch (e) {
      broken.push(`${href} → NAV-FAIL ${String(e.message || e).slice(0, 50)}`);
    }
  }

  console.log(`\n=== LINK CHECK: ${links.size} unique internal links ===`);
  console.log(`OK: ${ok.length}   BROKEN: ${broken.length}`);
  if (broken.length) {
    console.log("\nBROKEN LINKS:");
    broken.forEach((x) => console.log("  ✗ " + x));
  } else {
    console.log("✓ no broken links");
  }
  await b.close();
  process.exit(broken.length ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
