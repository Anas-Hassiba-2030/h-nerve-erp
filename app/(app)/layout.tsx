import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Sidebar } from "@/components/Sidebar";
import { SidebarDrawer } from "@/components/SidebarDrawer";
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
// CROSS-TENANT INTENT: the (app) layout looks up the workspace Company
// for the WorkspaceBanner. The lookup must succeed for any companyId
// the cookie points at, including from a superadmin "view as" context.
import { prisma, prismaUnscoped } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { readFlash } from "@/lib/toast";
import { SIDEBAR_COOKIE } from "@/lib/sidebarPref";
import { unreadCountFor } from "@/lib/messages";
import { getViewAsTenant, getTenantThemeCookie } from "@/lib/tenancy";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { WorkspaceBanner, shouldShowWorkspaceBanner } from "@/components/WorkspaceBanner";
import { THEME_PRESETS, themeCssVars, type ThemeKey } from "@/lib/brand/themes";
import { permsEnforced, effectiveCanAccess } from "@/lib/permissions";

// Phase V3-P1+P2 — banner visibility moved into the WorkspaceBanner
// component itself (single source of truth: SHOW_ON_PREFIXES). The
// allowlist is documented as a const at the top of that file so it
// can't drift. Here we just import the predicate.

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

  // Phase C — active company workspace (cookie-driven). The banner gives a
  // one-click exit so the user is never trapped inside a workspace.
  const activeWorkspaceId = getActiveWorkspaceId();
  const activeCompany = activeWorkspaceId
    ? await prismaUnscoped.company.findUnique({
        where: { id: activeWorkspaceId },
        select: { name: true, nameEn: true },
      })
    : null;

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
      {/*
        WorkspaceBanner visibility rule (Phase P1 — final form):
        Shown ONLY on routes that are tenant-scoped operational pages.
        On group-level pages (/dashboard, /companies, /search, /pinned,
        /showcase, /compare, /analytics, /admin/users, /admin/system,
        /admin/tenants, /admin/empire, /brain/*, /insights, /alerts,
        /finance, /reports, /markets, /sustainability, etc.) the banner
        is HIDDEN because the user is no longer scoped to a single
        tenant's operations — they're roaming the group.
        Allowlist below. Path comes from middleware.ts x-pathname header.
      */}
      {activeCompany && shouldShowWorkspaceBanner(headers().get("x-pathname")) ? (
        <WorkspaceBanner
          companyName={locale === "ar" ? activeCompany.name : activeCompany.nameEn}
          locale={locale}
        />
      ) : null}
      <TimeMachineBanner locale={locale} />
      <Sidebar
        user={fullUser}
        locale={locale}
        messages={messages as any}
        collapsed={sidebarCollapsed}
        unreadMessages={unreadMessages}
        enforcePerms={enforcePerms}
      />
      <div className="flex min-h-screen flex-1 flex-col nerve-bg">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <SidebarDrawer user={fullUser} locale={locale} messages={messages as any} unreadMessages={unreadMessages} enforcePerms={enforcePerms} />
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
