// Signs in once as the seeded admin through the REAL login form and saves
// the session to e2e/.auth/admin.json — every test in the chromium project
// starts already authenticated instead of paying the login flow per test.

import { test as setup, expect } from "@playwright/test";

// File-unique client IP — keeps the login rate-limiter (8/min per IP)
// from coupling this setup login to the spec files' logins.
setup.use({ extraHTTPHeaders: { "x-forwarded-for": "10.99.0.1" } });

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#lc-email").fill("admin@hourani.jo");
  await page.locator("#lc-pw").fill("admin123");
  await page.getByRole("button", { name: /تسجيل الدخول|sign in/i }).click();
  // Successful login lands on the Orrery hub.
  await page.waitForURL("**/orrery", { timeout: 45_000 });
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
