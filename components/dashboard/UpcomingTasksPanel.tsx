import Link from "next/link";
import { RankBadge } from "@/components/ui/RankBadge";
import { DaylightPanel } from "@/components/orrery/daylight";
import { formatNumber } from "@/lib/utils/utils";
import type { DashboardData } from "@/app/(app)/dashboard/data";

export function UpcomingTasksPanel({
  ar,
  me,
  myTasksDue,
  myRank,
}: {
  ar: boolean;
  me: DashboardData["me"];
  myTasksDue: DashboardData["myTasksDue"];
  myRank: DashboardData["myRank"];
}) {
  return (
    <DaylightPanel
      title={ar ? "مهامي القادمة" : "My upcoming tasks"}
      aside={
        me ? (
          <span className="inline-flex items-center gap-2">
            <RankBadge rank={(me.rank ?? "PAWN") as any} size="sm" showLabel={false} />
            <span style={{ fontSize: 11, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums" }}>
              {ar ? `${myRank.ar} · ${formatNumber(me.xp)} XP` : `${myRank.en} · ${formatNumber(me.xp)} XP`}
            </span>
          </span>
        ) : undefined
      }
    >
      {myTasksDue.length === 0 ? (
        <div
          className="py-6 text-center"
          style={{ color: "var(--ink-muted)", fontSize: 12.5, fontStyle: "italic" }}
        >
          {ar ? "لا مهام معلقة" : "No pending tasks"}
        </div>
      ) : (
        <ul className="space-y-2">
          {myTasksDue.map((t) => {
            const isUrgent = t.priority === "URGENT" || t.priority === "HIGH";
            return (
              <li key={t.id}>
                <Link
                  href="/tasks"
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition"
                  style={{
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    textDecoration: "none",
                    borderRadius: 8,
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className="line-clamp-1"
                      style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}
                    >
                      {ar ? t.title : (t.titleEn || t.title)}
                    </div>
                    <div
                      className="mt-0.5"
                      style={{ fontSize: 10.5, color: "var(--ink-muted)" }}
                    >
                      {t.kind === "SIDE" ? "⚡ " : ""}+{Math.round(t.points * (t.kind === "SIDE" ? 1.5 : 1))} XP
                    </div>
                  </div>
                  <span className={`tag ${isUrgent ? "gold" : "ok"}`}>
                    {t.priority === "URGENT" ? (ar ? "عاجل" : "URG")
                      : t.priority === "HIGH" ? (ar ? "مهم" : "HI")
                      : t.priority === "MEDIUM" ? (ar ? "متوسط" : "MED")
                      : (ar ? "منخفض" : "LOW")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DaylightPanel>
  );
}
