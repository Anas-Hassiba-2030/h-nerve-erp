import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox as InboxIcon, Brain, Sparkles, ListChecks, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { getInboxItems, type InboxItem } from "@/lib/inbox";
import { formatNumber, formatRelative } from "@/lib/utils";
import "../daylight.css";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<InboxItem["kind"], any> = { brain: Brain, insight: Sparkles, task: ListChecks, message: MessageSquare };
const KIND_AR: Record<InboxItem["kind"], string> = { brain: "العقل", insight: "إشارة", task: "مهمة", message: "رسائل" };
const SEV_COLOR: Record<InboxItem["severity"], string> = { CRITICAL: "var(--brick)", WARNING: "var(--gold)", OPPORTUNITY: "var(--emerald)", INFO: "var(--sage)" };

export default async function InboxPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await getInboxItems(user.id);
  const by = (k: InboxItem["kind"]) => items.filter((i) => i.kind === k).length;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق · صندوق الوارد" : "Team · Inbox"}
        title={ar ? "صندوق الوارد" : "Inbox"}
        subtitle={ar ? "كل ما يحتاج انتباهك — إشارات العقل، التنبيهات، المهام، والرسائل في مكان واحد." : "Everything needing your attention — brain signals, alerts, tasks, messages in one place."}
        status={`${formatNumber(items.length)} ${ar ? "عنصر" : "items"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "الكل" : "Total"} value={formatNumber(items.length)} hint={ar ? "يحتاج انتباه" : "need attention"} />
        <DaylightKpi label={ar ? "العقل" : "Brain"} value={formatNumber(by("brain"))} hint={ar ? "إشارات" : "signals"} />
        <DaylightKpi label={ar ? "إشارات" : "Insights"} value={formatNumber(by("insight"))} hint={ar ? "فرص" : "opportunities"} />
        <DaylightKpi label={ar ? "مهامي" : "My tasks"} value={formatNumber(by("task"))} hint={ar ? "معلّقة" : "pending"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الوارد" : "Inbox"} aside={ar ? "أحدث أولاً" : "Newest first"}>
        {items.length === 0 ? (
          <EmptyState icon={InboxIcon} title={ar ? "لا شيء يحتاج انتباهك الآن" : "Nothing needs your attention"} description={ar ? "كل شيء هادئ هنا." : "All clear here."} />
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const Icon = KIND_ICON[it.kind];
              const color = SEV_COLOR[it.severity];
              return (
                <Link key={it.id} href={it.href} className="prop-card block" style={{ borderInlineStart: `3px solid ${color}`, padding: 14 }}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5"><Icon className="h-4 w-4" style={{ color }} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{it.title}</span>
                        <span className="tag gold">{ar ? KIND_AR[it.kind] : it.kind}</span>
                      </div>
                      <p className="mt-0.5" style={{ fontSize: 12, color: "var(--ink-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.body}</p>
                      <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{formatRelative(it.at, lc)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
