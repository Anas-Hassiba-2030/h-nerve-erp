// Auth-flow contract, exercised through the real browser: redirect to
// login, credential rejection, successful sign-in, and full logout.
// These run WITHOUT the saved admin session (fresh cookie jar).

import { test, expect } from "@playwright/test";

// Fresh cookie jar + a file-unique client IP: the middleware login
// rate-limiter (8 POSTs/min per IP) keys on x-forwarded-for, and every
// spec file sharing localhost would trip it across workers.
test.use({
  storageState: { cookies: [], origins: [] },
  extraHTTPHeaders: { "x-forwarded-for": "10.99.0.2" },
});

test("unauthenticated visitor is bounced from the app to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password is rejected with an error, no session issued", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#lc-email").fill("admin@hourani.jo");
  await page.locator("#lc-pw").fill("definitely-wrong");
  await page.getByRole("button", { name: /تسجيل الدخول|sign in/i }).click();
  // The login form surfaces failures INLINE via useActionState (no URL
  // change) — the .err live region fills with the rejection message.
  await expect(page.locator(".login-cosmos .err")).not.toBeEmpty({ timeout: 30_000 });
  // Still no session: the app keeps bouncing us.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("valid admin credentials sign in and land on the Orrery hub", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#lc-email").fill("admin@hourani.jo");
  await page.locator("#lc-pw").fill("admin123");
  await page.getByRole("button", { name: /تسجيل الدخول|sign in/i }).click();
  await page.waitForURL("**/orrery", { timeout: 45_000 });
});

test("logout clears the session everywhere", async ({ page }) => {
  // Sign in.
  await page.goto("/login");
  await page.locator("#lc-email").fill("admin@hourani.jo");
  await page.locator("#lc-pw").fill("admin123");
  await page.getByRole("button", { name: /تسجيل الدخول|sign in/i }).click();
  await page.waitForURL("**/orrery", { timeout: 45_000 });

  // The /logout route handler is the shared sign-out door (UserMenu links here).
  await page.goto("/logout");
  await page.waitForURL(/\/login/, { timeout: 30_000 });

  // Session must be dead: protected pages bounce again.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
