import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { formatRelative, formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const lc = ar ? "ar" : "en";
  const session = await getCurrentUser();

  const threads = await prisma.messageThread.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    take: 30,
  });

  const participants = new Set(threads.flatMap((t) => t.participants.map((p) => p.userId))).size;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق · المراسلات" : "Team · Messages"}
        title={ar ? "الرسائل" : "Messages"}
        subtitle={ar ? "تواصل مع فريقك عبر المجموعة." : "Communicate with your team across the group."}
        status={`${formatNumber(threads.length)} ${ar ? "محادثة" : "threads"}`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "المحادثات" : "Threads"} value={formatNumber(threads.length)} hint={ar ? "نشطة" : "active"} />
        <DaylightKpi label={ar ? "الرسائل" : "Messages"} value={formatNumber(threads.reduce((a, t) => a + t._count.messages, 0))} hint={ar ? "إجمالي" : "total"} />
        <DaylightKpi label={ar ? "المشاركون" : "Participants"} value={formatNumber(participants)} hint={ar ? "أشخاص" : "people"} />
        <DaylightKpi label={ar ? "اليوم" : "Today"} value={formatNumber(threads.filter((t) => Date.now() - new Date(t.updatedAt).getTime() < 864e5).length)} hint={ar ? "محدّثة" : "updated"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "المحادثات" : "Conversations"} aside={ar ? "أحدث نشاطاً" : "Most recent"}>
        {threads.length === 0 ? (
          <EmptyState icon={MessageSquare} title={ar ? "لا توجد محادثات" : "No conversations"} description={ar ? "ابدأ محادثة جديدة." : "Start a new conversation."} />
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => {
              const other = thread.participants.find((p) => p.userId !== session?.id);
              const lastMsg = thread.messages[0];
              return (
                <Link key={thread.id} href={`/messages/${thread.id}`} className="prop-card block" style={{ padding: 14 }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--emerald)" }}>
                      {(other?.user.name ?? "?").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{thread.subject ?? other?.user.name ?? (ar ? "محادثة" : "Conversation")}</h3>
                        <span style={{ fontSize: 10, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{formatRelative(thread.updatedAt, lc)}</span>
                      </div>
                      <p className="truncate" style={{ fontSize: 12, color: "var(--ink-muted)" }}>{lastMsg ? (ar ? lastMsg.body : (lastMsg.bodyEn ?? lastMsg.body)) : (ar ? "لا رسائل" : "No messages")}</p>
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
