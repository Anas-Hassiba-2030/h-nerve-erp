// scripts/capture-dashboard.ts — local screenshot tool (not committed).
//   npx tsx scripts/capture-dashboard.ts <output.png>
// Logs in, opens /dashboard, waits for entrance + count-up to settle, shoots
// a full-page screenshot. Requires `npm start` running on :3000.

import { chromium } from "playwright";

const out = process.argv[2] || "dashboard.png";
const BASE = "http://localhost:3000";
// seed.ts hashes SEED_ADMIN_PASSWORD (falls back to "admin123" only if unset).
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000); // let the form hydrate before submitting
  await page.fill('input[name="email"]', "admin@hourani.jo");
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button.btn-primary[type="submit"]').click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Dashboard holds an open realtime SSE connection, so "networkidle" never
  // fires — use domcontentloaded then a fixed settle for entrance + count-up.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  if (page.url().includes("/login")) throw new Error(`bounced to login: ${page.url()}`);
  await page.waitForTimeout(2800); // entrance stagger + KPI count-up settle
  await page.screenshot({ path: out, fullPage: true });

  console.log("saved", out);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
