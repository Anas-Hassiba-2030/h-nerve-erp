// Full-surface sweep: EVERY section the navigation offers must actually
// render for a signed-in admin.
//
// Why this exists on top of nav.spec.ts's curated list: an auth-gated route
// answers 307 whether the page is healthy or throws on its first query, so a
// status probe from outside proves nothing (that trap has already cost this
// project a live "the system froze"). The only honest check is to be signed
// in and look at what comes back.
//
// The route list is DERIVED from ORRERY_GROUPS — the same source the rail,
// the Console board and the static hub read. A section that ships into the
// menu therefore ships into this sweep with no edit here, which is the point:
// the failure mode being prevented is a link that exists in the menu and
// leads somewhere broken.

import { test, expect } from "@playwright/test";
import { ORRERY_GROUPS } from "../src/lib/orrery/groups";
import { shellHome } from "../src/lib/theme/shell";

// Surfaces reachable by a real operator that the menu does NOT list: the two
// shell homes, the VOAC map + its explainers (linked from /voac's header), and
// the console families whose parent page has no pill of its own. Kept explicit
// and short — anything that belongs in the menu should be IN the menu, and
// this list is the honest exception, not a second navigation source.
const UNLISTED = [
  shellHome("orbit"),
  shellHome("console"),
  "/voac/map",
  "/voac/how",
  "/voac/stack",
  "/hr",
  "/admin/journal",
];

// De-duplicated because a route may legitimately appear in two groups.
const ROUTES = [
  ...new Set([...UNLISTED, ...ORRERY_GROUPS.flatMap((g) => g.children.map((c) => c.route))]),
];

test.describe("every navigable section renders", () => {
  for (const route of ROUTES) {
    test(`admin can load ${route}`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.status(), `${route} returned ${response!.status()}`).toBeLessThan(400);
      // Enforcement must not have bounced the ADMIN somewhere else. /orrery is
      // exempt: it is the one authenticated surface rendered OUTSIDE the (app)
      // layout and it serves the hub in an iframe.
      if (route !== "/orrery") {
        await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/") + "(\\/|\\?|$)"));
      }
      // The Next error boundary renders this exact copy on a crash.
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }
});
