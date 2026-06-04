// app/m/activity — Mobile activity feed.
//
// The "Activity" bottom-nav tab. A calm, read-only stream of the most
// recent audit-log entries, rendered in the same Calm Clinical card
// vocabulary as the Today screen. No filters, no chrome — the manager
// glances at "what changed" and moves on.

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatDate } from "@/lib/utils/utils";
import { MobileTopbar } from "@/components/mobile/MobileTopbar";
import { MobileNav } from "@/components/mobile/MobileNav";

export const dynamic = "force-dynamic";

const ACTION_AR: Record<string, string> = {
  CREATE: "إنشاء", UPDATE: "تحديث", DELETE: "حذف", RESTORE: "استعادة",
  LOGIN: "دخول", LOGOUT: "خروج", EXPORT: "تصدير", FORECAST: "تنبؤ",
  INSIGHT: "إشارة", APPROVE: "اعتماد", REJECT: "رفض", ASSIGN: "إسناد",
};
const ACTION_EN: Record<string, string> = {
  CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted", RESTORE: "Restored",
  LOGIN: "Login", LOGOUT: "Logout", EXPORT: "Export", FORECAST: "Forecast",
  INSIGHT: "Insight", APPROVE: "Approved", REJECT: "Rejected", ASSIGN: "Assigned",
};
// Map an action to one of the five Calm Clinical tone bands (OpsTone).
const ACTION_TONE: Record<string, string> = {
  CREATE: "sage", APPROVE: "sage", RESTORE: "sage",
  DELETE: "blush", REJECT: "blush",
  UPDATE: "sky", LOGIN: "sky", EXPORT: "sky", FORECAST: "sky", ASSIGN: "sky",
  INSIGHT: "ochre",
  LOGOUT: "ink",
};

function relativeTime(date: Date, ar: boolean): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return ar ? "الآن" : "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return ar ? `منذ ${m} د` : `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return ar ? `منذ ${h} س` : `${h}h ago`;
  }
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return ar ? `منذ ${d} ي` : `${d}d ago`;
  }
  return formatDate(date);
}

export default async function MobileActivityPage() {
  await requireUser();
  const ar = getLocale() === "ar";
  const rows = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="m-screen">
      <MobileTopbar
        greeting={ar ? "النشاط" : "Activity"}
        dateline={ar ? "آخر ما جرى في النظام" : "Recent system events"}
        ar={ar}
      />

      <main className="m-main">
        <section className="m-section">
          <div className="m-section-head">
            <div className="m-section-title-row">
              <h2 className="m-section-title">{ar ? "سجلّ النشاط" : "Activity log"}</h2>
              <span className="m-section-count">{rows.length}</span>
            </div>
            <p className="m-section-hint">
              {ar ? "ما تغيّر مؤخراً، الأحدث أولاً." : "What changed recently, newest first."}
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="m-card m-card-empty" data-tone="ink">
              <span aria-hidden className="m-card-band" />
              <div className="m-card-body">
                <h3 className="m-card-title m-card-title-empty">
                  {ar ? "لا نشاط بعد." : "No activity yet."}
                </h3>
                <p className="m-card-text">
                  {ar ? "ستظهر هنا كل حركة في النظام." : "Every change shows up here."}
                </p>
              </div>
            </div>
          ) : (
            <div className="m-cards">
              {rows.map((r) => (
                <div key={r.id} className="m-card" data-tone={ACTION_TONE[r.action] ?? "sky"}>
                  <span aria-hidden className="m-card-band" />
                  <div className="m-card-body">
                    <div className="m-card-eyebrow-row">
                      <span className="m-card-eyebrow">
                        {ar ? ACTION_AR[r.action] ?? r.action : ACTION_EN[r.action] ?? r.action}
                      </span>
                    </div>
                    <h3 className="m-card-title">{ar ? r.summary : r.summaryEn ?? r.summary}</h3>
                    <p className="m-card-text">
                      {[r.actorName, relativeTime(r.createdAt, ar)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="m-foot">
          {ar ? "هذا كل شيء. ارجع إذا احتجت." : "That's all. Come back when you need to."}
        </p>
      </main>

      <MobileNav ar={ar} />
    </div>
  );
}
