import { DaylightKpiGrid, DaylightKpi } from "@/components/orrery/daylight";
import { formatNumber } from "@/lib/utils";
import type { UserDetail } from "../data";

export function UserKpis({
  user,
  xp,
  currentRank,
  earnedCount,
  totalCount,
  completionRate,
  doneTasks,
  totalTasks,
  en,
}: {
  user: UserDetail["user"];
  xp: number;
  currentRank: UserDetail["currentRank"];
  earnedCount: number;
  totalCount: number;
  completionRate: number;
  doneTasks: number;
  totalTasks: number;
  en: boolean;
}) {
  return (
    <DaylightKpiGrid>
      <DaylightKpi
        label={en ? "Experience Points" : "نقاط الخبرة"}
        value={formatNumber(xp)}
        hint={en ? currentRank.en : currentRank.ar}
      />
      <DaylightKpi
        label={en ? "Rank Bonus" : "بونص الرتبة"}
        value={`+${user.bonusPercent}٪`}
      />
      <DaylightKpi
        label={en ? "Badges" : "الأوسمة"}
        value={`${earnedCount}/${totalCount}`}
        hint={totalCount > 0 ? `${Math.round((earnedCount / totalCount) * 100)}٪ ${en ? "complete" : "إكمال"}` : undefined}
      />
      <DaylightKpi
        label={en ? "Task Completion" : "إنجاز المهام"}
        value={`${completionRate}٪`}
        hint={`${formatNumber(doneTasks)} ${en ? "of" : "من"} ${formatNumber(totalTasks)}`}
      />
    </DaylightKpiGrid>
  );
}
