import { cookies } from "next/headers";
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
import { prisma, prismaUnscoped } from "@/lib/db";
import { getLocale, getMessages } from "@/lib/i18n.server";
import { readFlash } from "@/lib/toast";
import { SIDEBAR_COOKIE } from "@/lib/sidebarPref";
import { unreadCountFor } from "@/lib/messages";
import { getViewAsTenant, getTenantThemeCookie } from "@/lib/tenancy";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { WorkspaceBanner } from "@/components/WorkspaceBanner";
import { THEME_PRESETS, themeCssVars, type ThemeKey } from "@/lib/brand/themes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: session.id } });
  // Stale session (e.g. DB reset since login). Force a fresh sign-in.
  if (!dbUser) redirect("/logout");

  const fullUser = {
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    title: dbUser.title ?? null,
    rank: dbUser.rank ?? "PAWN",
    xp: dbUser.xp ?? 0,
    bonusPercent: dbUser.bonusPercent ?? 0,
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
  const themeKey: ThemeKey =
    viewAsTheme && THEME_PRESETS[viewAsTheme] ? viewAsTheme : "heritage";
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
      {activeCompany ? (
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
      />
      <div className="flex min-h-screen flex-1 flex-col nerve-bg">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <SidebarDrawer user={fullUser} locale={locale} messages={messages as any} unreadMessages={unreadMessages} />
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
