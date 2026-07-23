// Role-enforcement contract through the real middleware + layout gates
// (H_NERVE_PERMS_ENFORCED=true in playwright.config webServer env).
// STAFF is the most-restricted seeded role: allowed on the shop floor,
// denied on money. A denial redirects to /dashboard — never an error page.

import { test, expect } from "@playwright/test";

// Fresh cookie jar + a file-unique client IP so the per-IP login
// rate-limiter never couples this file to the others (see auth.spec.ts).
test.use({
  storageState: { cookies: [], origins: [] },
  extraHTTPHeaders: { "x-forwarded-for": "10.99.0.3" },
});

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator("#lc-email").fill(email);
  await page.locator("#lc-pw").fill("admin123");
  await page.getByRole("button", { name: /تسجيل الدخول|sign in/i }).click();
  await page.waitForURL("**/orrery", { timeout: 45_000 });
}

test("STAFF keeps operational pages (hotels, documents)", async ({ page }) => {
  await loginAs(page, "staff@hourani.jo");
  await page.goto("/hotels");
  await expect(page).toHaveURL(/\/hotels/);
  await page.goto("/documents");
  await expect(page).toHaveURL(/\/documents/);
});

test("STAFF is redirected off finance + admin consoles to /dashboard", async ({ page }) => {
  await loginAs(page, "staff@hourani.jo");
  await page.goto("/finance");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/treasuries");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/admin/journal");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("STAFF keeps universal self-service surfaces (no lockout)", async ({ page }) => {
  await loginAs(page, "staff@hourani.jo");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/settings/);
});
