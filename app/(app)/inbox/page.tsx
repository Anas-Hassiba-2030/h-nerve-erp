import { Inbox as InboxIcon, Mail, MailOpen } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatRelative, formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق · صندوق الوارد" : "Team · Inbox"}
        title={ar ? "الإشعارات" : "Notifications"}
        subtitle={ar ? "كل التحديثات والإشعارات في مكان واحد." : "All your updates and notifications in one place."}
        status={`${formatNumber(unread.length)} ${ar ? "غير مقروءة" : "unread"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "غير مقروءة" : "Unread"} value={formatNumber(unread.length)} hint={ar ? "جديدة" : "new"} delta={unread.length > 0 ? { dir: "down", text: formatNumber(unread.length) } : undefined} />
        <DaylightKpi label={ar ? "الكل" : "Total"} value={formatNumber(notifications.length)} hint={ar ? "آخر ٥٠" : "last 50"} />
        <DaylightKpi label={ar ? "مقروءة" : "Read"} value={formatNumber(read.length)} hint={ar ? "تمت" : "done"} />
        <DaylightKpi label={ar ? "المعدل" : "Read rate"} value={`${notifications.length ? Math.round(100 * read.length / notifications.length) : 0}%`} hint={ar ? "متابعة" : "follow-up"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الوارد" : "Inbox"} aside={ar ? "أحدث أولاً" : "Newest first"}>
        {notifications.length === 0 ? (
          <EmptyState icon={InboxIcon} title={ar ? "صندوقك فارغ" : "Inbox empty"} description={ar ? "لا إشعارات جديدة." : "No new notifications."} />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="prop-card" style={{ borderInlineStart: n.read ? "3px solid transparent" : "3px solid var(--gold)", opacity: n.read ? 0.72 : 1, padding: 14 }}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {n.read ? <MailOpen className="h-4 w-4" style={{ color: "var(--ink-muted)" }} /> : <Mail className="h-4 w-4" style={{ color: "var(--gold)" }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{ar ? n.title : (n.titleEn ?? n.title)}</p>
                    <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>{ar ? n.body : (n.bodyEn ?? n.body)}</p>
                    <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatRelative(n.createdAt, lc)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
