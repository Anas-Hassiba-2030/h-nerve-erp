// Strict-CSP contract. The middleware only arms the nonce CSP in
// production, and this suite's server is `next dev` (a prod-node
// `next start` can't run the Cloudflare-runtime Prisma client) — so these
// tests SKIP in the normal local/CI run and exist for prod-shaped servers:
// point PLAYWRIGHT at one (or run the checks against the live Workers
// deployment, where this policy was click-verified on 2026-07-23).

import { test, expect } from "@playwright/test";

// Fresh cookie jar (the login test needs the login PAGE, and a saved admin
// session would bounce it straight to /orrery) + a file-unique client IP
// for the login rate-limiter.
test.use({
  storageState: { cookies: [], origins: [] },
  extraHTTPHeaders: { "x-forwarded-for": "10.99.0.4" },
});

test("documents carry the nonce CSP — no unsafe-inline/eval for scripts", async ({ page }) => {
  const response = await page.goto("/login");
  const csp = response?.headers()["content-security-policy"] ?? "";
  test.skip(!csp.includes("nonce-"), "dev server — strict CSP is production-only");

  const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
  expect(scriptSrc).toContain("nonce-");
  expect(scriptSrc).toContain("strict-dynamic");
  expect(scriptSrc).not.toContain("unsafe-inline");
  expect(csp).not.toContain("unsafe-eval");
});

test("pages hydrate cleanly under the strict CSP (no violations, login works)", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /content security policy/i.test(msg.text())) {
      violations.push(msg.text());
    }
  });

  const response = await page.goto("/login");
  const csp = response?.headers()["content-security-policy"] ?? "";
  test.skip(!csp.includes("nonce-"), "dev server — strict CSP is production-only");

  // The login form is a hydrated client component — if CSP blocked the
  // framework scripts, this interaction chain would go dead.
  await page.locator("#lc-email").fill("admin@hourani.jo");
  await page.locator("#lc-pw").fill("admin123");
  await page.getByRole("button", { name: /تسجيل الدخول|sign in/i }).click();
  await page.waitForURL("**/orrery", { timeout: 45_000 });

  expect(violations, `CSP violations:\n${violations.join("\n")}`).toEqual([]);
});

test("the Orrery hub document keeps its static CSP and same-origin framing", async ({ request, page }) => {
  const probe = await page.goto("/login");
  const pageCsp = probe?.headers()["content-security-policy"] ?? "";
  test.skip(!pageCsp.includes("nonce-"), "dev server — strict CSP is production-only");

  const hub = await request.get("/hub/index.html");
  expect(hub.status()).toBe(200);
  const hubCsp = hub.headers()["content-security-policy"] ?? "";
  // The hub is a prebuilt static doc: inline scripts allowed, framing 'self'.
  expect(hubCsp).toContain("frame-ancestors 'self'");
  expect(hubCsp).toContain("'unsafe-inline'");
  expect(hub.headers()["x-frame-options"] ?? "").toMatch(/sameorigin/i);
});
