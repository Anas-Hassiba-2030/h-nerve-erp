// Navigation smoke over the critical surfaces, as the signed-in admin
// (saved session from auth.setup.ts). Catches the "page 500s / renders the
// error boundary / silently bounces" class of regression that unit tests
// can never see. Runs with permission enforcement ON, so this also proves
// ADMIN is never locked out of anything by the permission map.

import { test, expect } from "@playwright/test";

const ROUTES = [
  "/dashboard",
  "/companies",
  "/hotels",
  "/finance",
  "/invoices",
  "/pos",
  "/manufacturing",
  "/hr",
  "/crm",
  "/brain",
  "/admin",
  "/admin/journal",
  "/workspace",
  "/settings",
  "/users",
  "/documents",
];

for (const route of ROUTES) {
  test(`admin can load ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, `no response for ${route}`).not.toBeNull();
    expect(response!.status(), `${route} returned ${response!.status()}`).toBeLessThan(400);
    // Enforcement must not have bounced the ADMIN off the page.
    await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/") + "(\\/|\\?|$)"));
    // The Next error boundary renders this exact copy on a crash.
    await expect(page.locator("body")).not.toContainText("Application error");
  });
}
