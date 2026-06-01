import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import { OnboardingTour } from "@/components/OnboardingTour";
import { QuickAddFAB } from "@/components/QuickAddFAB";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { Conversational } from "@/components/Conversational";
import { TimeScrubber } from "@/components/TimeScrubber";
import { TimeMachineBanner } from "@/components/TimeMachineBanner";
import { getAsOf } from "@/lib/timemachine";
import { RealtimePresence } from "@/components/realtime/RealtimePresence";
import { DocumentDropZone } from "@/components/DocumentDropZone";
// CROSS-TENANT INTENT: the (app) layout reads role permissions unscoped
// (must resolve for any companyId the cookie points at, including a
// superadmin "view as" context).
import { prisma, prismaUnscoped } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { readFlash } from "@/lib/toast";
import { SIDEBAR_COOKIE } from "@/lib/sidebarPref";
import { unreadCountFor } from "@/lib/messages";
import { getViewAsTenant, getTenantThemeCookie } from "@/lib/tenancy";
import { THEME_PRESETS, themeCssVars, type ThemeKey } from "@/lib/brand/themes";
import { permsEnforced, effectiveCanAccess } from "@/lib/permissions";
import { LivingAtmosphere } from "@/components/orrery/LivingAtmosphere";
import { OrbitReturn } from "@/components/orrery/OrbitReturn";
import { DiveReveal } from "@/components/orrery/DiveReveal";
import { ConstellationRail } from "@/components/orrery/ConstellationRail";
import "./living.css";

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
    const pathname = headers().get("x-pathname") ?? "";
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

  const fullUser = {
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    title: dbUser.title ?? null,
    rank: dbUser.rank ?? "PAWN",
    xp: dbUser.xp ?? 0,
    bonusPercent: dbUser.bonusPercent ?? 0,
    // Phase F5 — drives Sidebar.filterOpsForTenant. Sourced from the
    // session cookie written at login (lib/session.ts SessionUser).
    tenantSlug: session.tenantSlug ?? null,
  };

  const locale = getLocale();
  const messages = getMessages(locale);
  const initialFlash = readFlash();
  const sidebarCollapsed =
    cookies().get(SIDEBAR_COOKIE)?.value === "collapsed";
  const unreadMessages = await unreadCountFor(session.id).catch(() => 0);

  // Phase 16 — Time Machine cursor (cookie-driven). Banner surfaces only
  // when traveling; pill is always visible.
  const asOfState = getAsOf();

  // Phase 11 — when a superadmin is "viewing as" a tenant, swap the
  // Heritage palette for the tenant's theme via inline style overrides
  // and surface a banner that lets them exit the preview.
  const viewAsSlug = getViewAsTenant();
  const viewAsTheme = getTenantThemeCookie();
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

  // Phase 5 — flag-gated UI hiding. OFF by default = zero change.
  const enforcePerms = permsEnforced();

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
      <OrbitReturn locale={locale} />
      <div className="flex min-h-screen flex-1 flex-col nerve-bg">
        <ConstellationRail locale={locale} />
        <main className="flex-1"><DiveReveal>{children}</DiveReveal></main>
        <Footer />
      </div>
      <ToastProvider initialFlash={initialFlash} />
      <OnboardingTour locale={locale} />
      <QuickAddFAB locale={locale} />
      <WelcomeSplash locale={locale} />
      <Conversational locale={locale} />
      <TimeScrubber
        initialAsOf={asOfState.asOf ? asOfState.asOf.getTime() : null}
        locale={locale}
      />
      <RealtimePresence
        user={{ id: dbUser.id, name: dbUser.name }}
        locale={locale}
      />
      <DocumentDropZone locale={locale} />
    </div>
  );
}
