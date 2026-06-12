import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { Trophy } from "lucide-react";
import { DaylightPanel } from "@/components/orrery/daylight";
import {
  formatMoney,
  formatNumber,
  formatRelative,
  formatShortDate,
  ROLES_AR,
  ROLES_EN,
  loc,
} from "@/lib/utils/utils";
import type { UserDetail } from "../data";

const TIER_TONE: Record<string, string> = {
  BRONZE: "ok",
  SILVER: "ok",
  GOLD: "gold",
  PLATINUM: "gold",
};

export async function UserSidebar({
  user,
  achievements,
  earnedAchievements,
  forecasts,
  transactions,
  earnedIds,
  earnedCount,
  totalCount,
  en,
}: {
  user: UserDetail["user"];
  achievements: UserDetail["achievements"];
  earnedAchievements: UserDetail["earnedAchievements"];
  forecasts: UserDetail["forecasts"];
  transactions: UserDetail["transactions"];
  earnedIds: Set<string>;
  earnedCount: number;
  totalCount: number;
  en: boolean;
}) {
  const locale = await getLocale();
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Achievements */}
      {achievements.length > 0 ? (
        <DaylightPanel title={en ? "Badges" : "الأوسمة"} aside={`${earnedCount}/${totalCount}`}>
          <div className="grid grid-cols-4 gap-2">
            {achievements.slice(0, 12).map((a) => {
              const earned = earnedIds.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-lg ${
                    earned ? "anim-pop" : ""
                  }`}
                  style={{
                    background: earned
                      ? "linear-gradient(135deg, var(--gold) 0%, var(--gold) 100%)"
                      : "color-mix(in srgb, var(--ink-muted) 12%, transparent)",
                    color: earned ? "white" : "var(--ink-muted)",
                    boxShadow: earned
                      ? "0 8px 24px -8px var(--gold)"
                      : undefined,
                    opacity: earned ? 1 : 0.5,
                  }}
                  title={`${a.name} (${a.tier})`}
                >
                  <Trophy className="h-4 w-4" />
                </div>
              );
            })}
          </div>
          {earnedAchievements.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {earnedAchievements.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span
                    className="truncate font-bold"
                    style={{ color: "var(--ink)" }}
                  >
                    {e.achievement.name}
                  </span>
                  <span
                    className={`tag ${TIER_TONE[e.achievement.tier] ?? "ok"}`}
                    style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}
                  >
                    {e.achievement.tier}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </DaylightPanel>
      ) : null}

      {/* Recent forecasts */}
      {forecasts.length > 0 ? (
        <DaylightPanel title={en ? "Published Forecasts" : "توقعات منشورة"}>
          <ul className="space-y-1.5">
            {forecasts.map((f) => (
              <li
                key={f.id}
                className="rounded-lg px-2 py-1.5 text-[11px]"
                style={{
                  background: "color-mix(in srgb, var(--gold) 5%, transparent)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="truncate font-bold"
                    style={{ color: "var(--ink)" }}
                  >
                    {en ? (f.productLabelEn || f.productLabel) : f.productLabel}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                    {Math.round(f.confidence * 100)}٪
                  </span>
                </div>
                <div
                  className="font-mono text-[10px]"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {f.source.code} → {f.target.code}
                </div>
              </li>
            ))}
          </ul>
        </DaylightPanel>
      ) : null}

      {/* Recent transactions created */}
      {transactions.length > 0 ? (
        <DaylightPanel title={en ? "Transactions" : "حركات مالية"}>
          <ul className="space-y-1.5">
            {transactions.map((t) => {
              const isIncome = t.kind === "INCOME" || t.kind === "REVENUE";
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <div
                      className="truncate font-bold"
                      style={{ color: "var(--ink)" }}
                    >
                      {t.description ?? t.category}
                    </div>
                    <div
                      className="font-mono text-[10px]"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {t.company.code} • {formatShortDate(t.occurredAt)}
                    </div>
                  </div>
                  <span
                    className="font-mono font-bold"
                    style={{ color: isIncome ? "#0a8e54" : "#c0392b" }}
                  >
                    {isIncome ? "+" : "−"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </DaylightPanel>
      ) : null}

      {/* Quick facts */}
      <DaylightPanel title={en ? "Employment Card" : "البطاقة الوظيفية"}>
        <dl style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <Fact label={en ? "Role" : "الدور"} value={loc(ROLES_AR, ROLES_EN, locale, user.role)} />
          {user.title ? (
            <Fact label={en ? "Job Title" : "المسمى الوظيفي"} value={user.title} />
          ) : null}
          {user.company ? (
            <Fact
              label={en ? "Company" : "الشركة"}
              value={user.company.name}
              link={`/companies/${user.company.id}`}
            />
          ) : null}
          <Fact label={en ? "Login Count" : "مرات الدخول"} value={formatNumber(user.loginCount)} />
          <Fact
            label={en ? "Last Login" : "آخر دخول"}
            value={
              user.lastLoginAt ? formatRelative(user.lastLoginAt) : "—"
            }
          />
          <Fact
            label={en ? "Member Since" : "منذ"}
            value={formatShortDate(user.createdAt)}
          />
        </dl>
      </DaylightPanel>
    </aside>
  );
}

function Fact({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--ink-muted)" }}>{label}</dt>
      <dd
        className="text-end font-bold"
        style={{ color: "var(--ink)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--gold)" }}
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
