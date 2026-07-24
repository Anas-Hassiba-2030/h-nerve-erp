// Mutation flows — the "button silently does nothing" detector.
//
// Gap #7 of the 100/100 readiness list. The existing specs prove pages LOAD
// (nav.spec) and that roles are enforced (perms.spec). Neither notices when a
// create button stops writing: the page still renders, the click still
// animates, and nothing reaches the database. That failure mode has bitten
// this project repeatedly — dead create buttons across 14 actions, a logout
// that didn't log out.
//
// So every test here asserts on the RESULT, never on the click. Fill the real
// form, submit it, then reload the list and require the new row to be there.
// A server action that throws and revalidates to the same state — the exact
// shape of the bug — fails these tests.
//
// Runs against the throwaway e2e database (file:./e2e.db, reset + reseeded per
// run by global-setup.ts), as the seeded admin, with permission enforcement
// ON. Nothing here can touch a real database.

import { test, expect, type Page } from "@playwright/test";

// Each row is stamped with a per-test unique token so a retry (CI retries once)
// can never collide with the row its own first attempt already wrote, and so
// two workers never fight over the same name.
function token(label: string): string {
  return `e2e-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Dismiss any full-screen overlay standing between us and the page.
 *
 * A signed-in session opens onto the Morning Brief (and potentially the
 * onboarding tour / welcome splash). They are `aria-modal` dialogs that
 * intercept pointer events, so EVERY interaction below would otherwise time
 * out on "…mb-overlay intercepts pointer events" — which is also exactly what
 * a real operator hits. Per CLAUDE.md every one of these dismisses on ESC;
 * this presses ESC until the page is actually clickable, and doubles as a
 * standing check that they still do.
 */
const greeted = new WeakSet<Page>();

async function dismissOverlays(page: Page) {
  const modal = page.locator('[aria-modal="true"]');

  // MorningBrief mounts on a 220ms timer AFTER hydration ("defer a beat so the
  // orrery atmosphere mounts first"), so checking immediately after
  // domcontentloaded finds nothing and then the overlay lands mid-click. Wait
  // for it once per browser context — it marks itself seen in localStorage, so
  // later navigations in the same context won't re-show it and don't pay this.
  if (!greeted.has(page)) {
    greeted.add(page);
    await modal.first().waitFor({ state: "visible", timeout: 6_000 }).catch(() => {});
  }

  for (let i = 0; i < 5; i += 1) {
    if (!(await modal.first().isVisible().catch(() => false))) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }

  // ESC should have been enough. Fall back to the overlay's own dismiss button
  // so one stubborn modal doesn't mask the mutation regressions these tests
  // exist to catch — but still fail loudly if nothing clears it.
  await page.locator(".mb-overlay .mb-btn.primary").click({ timeout: 3_000 }).catch(() => {});
  await expect(
    modal.first(),
    "a full-screen modal would not dismiss on ESC — it is trapping the whole app",
  ).toBeHidden({ timeout: 5_000 });
}

/** Navigate and clear the way — the combination every test below needs. */
async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await dismissOverlays(page);
}

/** Fail with a useful message rather than a bare timeout when a row is missing. */
async function expectRowPresent(page: Page, url: string, needle: string, what: string) {
  await open(page, url);
  await expect(
    page.getByText(needle, { exact: false }).first(),
    `${what} was submitted but does not appear at ${url} — the action silently failed to write`,
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("mutation flows persist", () => {
  test("create a company", async ({ page }) => {
    const name = token("co");

    await open(page, "/companies/new");
    // `code` is the business key; keep it short and unique-ish.
    await page.locator('input[name="code"]').fill(name.slice(-8).toUpperCase());
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="nameEn"]').fill(name);

    await page.getByRole("button", { name: /حفظ الشركة|save/i }).click();

    // createCompany redirects to /companies on success.
    await page.waitForURL("**/companies", { timeout: 30_000 });
    await expectRowPresent(page, "/companies", name, "The company");
  });

  test("create a task", async ({ page }) => {
    const title = token("task");

    await open(page, "/tasks/new");
    await page.locator('input[name="title"]').fill(title);
    await page.getByRole("button", { name: /^\s*حفظ|save/i }).click();

    await page.waitForURL("**/tasks**", { timeout: 30_000 });
    await expectRowPresent(page, "/tasks", title, "The task");
  });

  test("create a CRM lead", async ({ page }) => {
    const name = token("lead");

    await open(page, "/crm");
    // Scope to the new-lead form: /crm also renders per-row forms with their
    // own inputs, so a bare input[name="name"] would be ambiguous.
    const form = page.locator('form:has(input[name="expectedValue"])');
    await form.locator('input[name="name"]').fill(name);
    await form.getByRole("button", { name: /إضافة عميل محتمل|add lead/i }).click();

    await expectRowPresent(page, "/crm", name, "The lead");
  });

  test("sign out actually ends the session", async ({ page }) => {
    // The canonical regression: the button renders, the click does nothing,
    // and the user stays signed in. Assert on the SESSION, not the redirect —
    // a redirect to /login with a live cookie would still be broken.
    await open(page, "/dashboard");

    await page.getByRole("button", { name: /قائمة المستخدم|user menu/i }).click();
    await page.getByRole("button", { name: /تسجيل الخروج|sign out/i }).click();

    await page.waitForURL("**/login**", { timeout: 30_000 });

    // The real proof: a protected route must now bounce us back to /login.
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page,
      "after signing out, /dashboard still rendered — the session was not destroyed",
    ).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
