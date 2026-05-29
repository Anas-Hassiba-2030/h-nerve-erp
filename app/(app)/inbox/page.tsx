// /inbox — Phase 9 unified notification inbox. The topbar bell's
// destination. Operator surface → Heritage Modern (Topbar + cards).
// Bilingual. Aggregates brain insights / AI insights / my tasks /
// unread messages via lib/inbox (fail-soft, reused by Phase 10).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox as InboxIcon, Brain, Sparkles, ListChecks, MessageSquare, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { getInboxItems, type InboxItem } from "@/lib/inbox";
import { Topbar } from "@/components/Topbar";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<InboxItem["kind"], any> = {
  brain: Brain, insight: Sparkles, task: ListChecks, message: MessageSquare,
};
const KIND_AR: Record<InboxItem["kind"], string> = {
  brain: "العقل", insight: "إشارة", task: "مهمة", message: "رسائل",
};
const SEV_BADGE: Record<InboxItem["severity"], string> = {
  CRITICAL: "badge-red", WARNING: "badge-amber",
  OPPORTUNITY: "badge-emerald", INFO: "badge-blue",
};

export default async function InboxPage() {
  const ar = getLocale() === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await getInboxItems(user.id);
  const by = (k: InboxItem["kind"]) => items.filter((i) => i.kind === k).length;

  return (
    <>
      <Topbar
        eyebrow={ar ? "الفريق" : "People"}
        title={ar ? "صندوق الوارد" : "Inbox"}
        subtitle={
          ar
            ? "كل ما يحتاج انتباهك — إشارات العقل، التنبيهات، المهام، والرسائل في مكان واحد"
            : "Everything needing your attention — brain signals, alerts, tasks, messages in one place"
        }
        actions={
          <Link href="/dashboard" className="btn-ghost btn-sm">
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {ar ? "اللوحة" : "Dashboard"}
          </Link>
        }
        metrics={[
          { label: ar ? "الكل" : "Total", value: String(items.length), tone: "blue" },
          { label: ar ? "العقل" : "Brain", value: String(by("brain")), tone: "violet" },
          { label: ar ? "إشارات" : "Insights", value: String(by("insight")), tone: "amber" },
          { label: ar ? "مهامي" : "My tasks", value: String(by("task")), tone: "emerald" },
        ]}
      />

      {items.length === 0 ? (
        <div className="card card-pad mt-3 flex flex-col items-center gap-3 py-16 text-center">
          <InboxIcon className="h-10 w-10" style={{ color: "var(--heri-ink-3)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--heri-ink)" }}>
            {ar ? "لا شيء يحتاج انتباهك الآن 🎉" : "Nothing needs your attention 🎉"}
          </p>
        </div>
      ) : (
        <section className="mt-3 flex flex-col gap-2">
          {items.map((it) => {
            const Icon = KIND_ICON[it.kind];
            return (
              <Link
                key={it.id}
                href={it.href}
                className="card card-pad flex items-start gap-3 transition hover:translate-x-[-2px] rtl:hover:translate-x-[2px]"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "var(--heri-cream-2)", color: "var(--brand-deep)" }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--heri-ink)" }}>
                      {it.title}
                    </span>
                    <span className={SEV_BADGE[it.severity]}>{it.severity}</span>
                    <span className="badge-slate">{ar ? KIND_AR[it.kind] : it.kind}</span>
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs" style={{ color: "var(--heri-ink-3)" }}>
                    {it.body}
                  </div>
                  <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--heri-ink-3)" }}>
                    {formatDateTime(it.at, ar ? "ar" : "en")}
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
