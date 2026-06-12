import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import "../../daylight.css";
import { ROLES_AR, ROLES_EN, loc } from "@/lib/utils/utils";
import { getUserDetail } from "./data";
import { UserHero } from "./_components/UserHero";
import { UserKpis } from "./_components/UserKpis";
import { UserActivityColumn } from "./_components/UserActivityColumn";
import { UserSidebar } from "./_components/UserSidebar";

export default async function UserDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const data = await getUserDetail(params.id);
  if (!data) notFound();

  const {
    user,
    achievements,
    earnedAchievements,
    recentTasks,
    transactions,
    forecasts,
    insights,
    xp,
    currentRank,
    next,
    progress,
    earnedIds,
    earnedCount,
    totalCount,
    tasksByStatus,
    totalTasks,
    doneTasks,
    completionRate,
    brand,
  } = data;

  const locale = await getLocale();
  const en = locale === "en";

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Employee Profile" : "ملف الموظف"}
        title={user.name}
        subtitle={user.title ?? loc(ROLES_AR, ROLES_EN, locale, user.role)}
        actions={
          <Link href="/users" className="dl-btn dl-btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            {en ? "Team" : "الفريق"}
          </Link>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Hero */}
        <UserHero
          user={user}
          brand={brand}
          currentRank={currentRank}
          next={next}
          progress={progress}
          xp={xp}
          en={en}
        />

        {/* KPIs */}
        <UserKpis
          user={user}
          xp={xp}
          currentRank={currentRank}
          earnedCount={earnedCount}
          totalCount={totalCount}
          completionRate={completionRate}
          doneTasks={doneTasks}
          totalTasks={totalTasks}
          en={en}
        />

        {/* Two columns */}
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 360px" }}>
          <UserActivityColumn
            recentTasks={recentTasks}
            insights={insights}
            tasksByStatus={tasksByStatus}
            totalTasks={totalTasks}
            en={en}
          />

          <UserSidebar
            user={user}
            achievements={achievements}
            earnedAchievements={earnedAchievements}
            forecasts={forecasts}
            transactions={transactions}
            earnedIds={earnedIds}
            earnedCount={earnedCount}
            totalCount={totalCount}
            en={en}
          />
        </div>
      </div>
    </DaylightShell>
  );
}
