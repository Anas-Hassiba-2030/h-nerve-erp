import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { QuickAddFAB } from "@/components/nav/QuickAddFAB";
import { ViewAsBanner } from "@/components/layout/ViewAsBanner";
import { Conversational } from "@/components/brain/Conversational";
import { TimeScrubber } from "@/components/timemachine/TimeScrubber";
import { TimeMachineBanner } from "@/components/timemachine/TimeMachineBanner";
import { getAsOf } from "@/lib/utils/timemachine";
// Phase 26.8 — non-critical overlays (tour, splash, morning brief, presence
// SSE, drop zone) are lazy-loaded client-side to keep them off the critical
// render path. See components/DeferredOverlays.tsx.
import { DeferredOverlays } from "@/components/layout/DeferredOverlays";
import { Companion } from "@/components/companion/Companion";
// CROSS-TENANT INTENT: the (app) layout reads role permissions unscoped
// (must resolve for any companyId the cookie points at, including a
// superadmin "view as" context).
import { prisma, prismaUnscoped } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { readFlash } from "@/lib/utils/toast";
import { getViewAsTenant, getTenantThemeCookie } from "@/lib/tenancy/tenancy";
import { THEME_PRESETS, themeCssVars, type ThemeKey } from "@/lib/brand/themes";
import { permsEnforced, effectiveCanAccess } from "@/lib/auth/permissions";
import { LivingAtmosphere } from "@/components/orrery/LivingAtmosphere";
import { OrbitReturn } from "@/components/orrery/OrbitReturn";
import { DiveReveal } from "@/components/orrery/DiveReveal";
import { ConstellationRail } from "@/components/orrery/ConstellationRail";
import { FabRail } from "@/components/orrery/FabRail";
import { MorningBrief } from "@/components/brain/MorningBrief";
import "./living.css";
// Daylight work-surface styles are used by ~40 (app) pages (Operations, the
// admin family, achievements, employees, …). Importing here — at the layout,
// not per-page — guarantees the .dl-page palette tokens (--ink/--emerald/…)
// AND the display-font var (--dl-display) are in <head> at first paint on EVERY
// navigation, including client-side ones. When it was imported per-page the CSS
// chunk landed AFTER the RSC commit on client-nav, so var(--ink)/var(--dl-display)
// briefly resolved to nothing → wrong colours + headings falling back to the
// body font ("letters don't appear well"), correcting only on a hard refresh.
import "./daylight.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
  // Stale session (e.g. DB reset since login). Force a fresh sign-in.
  if (!dbUser) redirect("/logout");

  // Phase P5 follow-up — layout-level enforcement layered over the
  // interactive RolePermission editor at /admin/permissions-preview.
  // Middleware is edge-runtime and can't read Prisma; this is where the
  // override check lives. Only fires when H_NERVE_PERMS_ENFORCED=true so
  // the dev/staging path stays unchanged.
  if (permsEnforced() && session.role !== "ADMIN") {
    const pathname = (await headers()).get("x-pathname") ?? "";
    const allowed = await effectiveCanAccess(
      session.role,
      pathname,
      // CROSS-TENANT INTENT: RolePermission is global config.
      () =>
        prismaUnscoped.rolePermission.findMany({
          select: { role: true, path: true, allowed: true },
        }),
    );
    if (!allowed) redirect("/dashboard");
  }

  const locale = await getLocale();
  const initialFlash = await readFlash();

  // Phase 16 — Time Machine cursor (cookie-driven). Banner surfaces only
  // when traveling; pill is always visible.
  const asOfState = await getAsOf();

  // Phase 11 — when a superadmin is "viewing as" a tenant, swap the
  // Heritage palette for the tenant's theme via inline style overrides
  // and surface a banner that lets them exit the preview.
  const viewAsSlug = await getViewAsTenant();
  const viewAsTheme = await getTenantThemeCookie();
  const viewAsTenantData = viewAsSlug
    ? await prisma.tenant.findUnique({ where: { slug: viewAsSlug } })
    : null;

  // Phase F5 — auto-apply the logged-in user's tenant theme. The
  // superadmin "view as" cookie takes priority (so an admin previewing
  // a tenant sees that tenant's palette, not their own). When no
  // view-as is active and the user has a tenantSlug from F1, look up
  // their TenantTheme.preset and apply it. ADMIN with no tenantSlug
  // falls through to Heritage Modern (the canonical default).
  let userThemePreset: ThemeKey | null = null;
  if (!viewAsTheme && session.tenantSlug) {
    const t = await prisma.tenant.findUnique({
      where: { slug: session.tenantSlug },
      include: { theme: true },
    });
    const p = t?.theme?.preset as ThemeKey | undefined;
    if (p && THEME_PRESETS[p]) userThemePreset = p;
  }
  const themeKey: ThemeKey =
    viewAsTheme && THEME_PRESETS[viewAsTheme]
      ? viewAsTheme
      : userThemePreset
      ? userThemePreset
      : "heritage";
  const themeStyle = themeKey !== "heritage" ? themeCssVars(themeKey) : null;

  return (
    <div
      className="flex min-h-screen flex-row-reverse"
      data-tenant-theme={themeKey}
      style={themeStyle ? ({ cssText: themeStyle } as any) : undefined}
    >
      {viewAsTenantData ? (
        <ViewAsBanner
          tenantName={viewAsTenantData.name}
          tenantSlug={viewAsTenantData.slug}
          themeName={THEME_PRESETS[themeKey].nameEn}
          locale={locale}
        />
      ) : null}
      {/* BUG-A — WorkspaceBanner ("Exit to all companies" tan strip)
          removed system-wide. The sidebar "Group Companies" link
          (/companies) is the single navigation-back path. */}
      <TimeMachineBanner locale={locale} />
      {/* Phase 1 (Claude Design Restore) — the old Heritage Sidebar + mobile
          SidebarDrawer are REMOVED. They were the "old interface" that leaked
          through on any page without .dl-page (workflow studio, loading/error
          states, un-ported pages). Navigation is now exclusively the Orrery
          hub (/orrery) + the global ↺ Orbit return pill below. One removal =
          no page can ever show the old chrome again. */}
      <LivingAtmosphere />
      <OrbitReturn locale={locale} userName={dbUser.name} />
      <FabRail locale={locale} />
      <div className="flex min-h-screen flex-1 flex-col nerve-bg">
        <ConstellationRail locale={locale} />
        <main className="flex-1"><DiveReveal>{children}</DiveReveal></main>
        <Footer />
      </div>
      <ToastProvider initialFlash={initialFlash} />
      <QuickAddFAB locale={locale} />
      <Conversational locale={locale} />
      <TimeScrubber
        initialAsOf={asOfState.asOf ? asOfState.asOf.getTime() : null}
        locale={locale}
      />
      {/* Phase 26.8 — deferred, non-critical overlays (lazy client-side). */}
      <DeferredOverlays
        locale={locale}
        userId={dbUser.id}
        userName={dbUser.name ?? (locale === "ar" ? "أ. الحوراني" : "A. Al-Hourani")}
      />
      {/* Phase 28 — The Companion (الشرارة). Ambient photon, dismissible,
          prefers-reduced-motion aware. */}
      <Companion />
    </div>
  );
}
