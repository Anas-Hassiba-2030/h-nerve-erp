// Thread detail — full conversation view with composer.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Send, MessageSquare, MoreVertical } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { markThreadRead } from "@/lib/messages";
import { prisma } from "@/lib/db";
import { sendMessage } from "../actions";
import { MessageComposer } from "./MessageComposer";
import { ScrollToBottom } from "./ScrollToBottom";

const AVATAR_COLOR: Record<string, string> = {
  emerald: "#10b981", amber: "#f59e0b", blue: "#3b82f6",
  violet: "#8b5cf6", rose: "#f43f5e", slate: "#64748b",
  red: "#ef4444", green: "#22c55e", indigo: "#6366f1",
  pink: "#ec4899", sky: "#0ea5e9", teal: "#14b8a6",
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function formatTime(d: Date, ar: boolean) {
  return new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) return null;
  const locale = getLocale();
  const ar = locale === "ar";

  // Verify access
  const part = await prisma.threadParticipant.findFirst({
    where: { threadId: params.id, userId: session.id },
  });
  if (!part) notFound();

  const [thread, messages] = await Promise.all([
    prisma.messageThread.findUnique({
      where: { id: params.id },
      include: { participants: { include: { user: true } } },
    }),
    prisma.message.findMany({
      where: { threadId: params.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: true },
      take: 200,
    }),
  ]);

  if (!thread) notFound();

  await markThreadRead(params.id, session.id);

  const others = thread.participants
    .filter((p) => p.user.id !== session.id)
    .map((p) => p.user);
  const main = others[0];
  const mainColor = main
    ? AVATAR_COLOR[main.avatarColor?.toLowerCase() ?? ""] ?? AVATAR_COLOR.emerald
    : AVATAR_COLOR.emerald;

  // Group messages by day for date dividers
  const byDay = new Map<string, typeof messages>();
  for (const m of messages) {
    const day = m.createdAt.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(m);
  }

  return (
    <>
      <PageHeader
        eyebrow={ar ? "رسائل" : "Messages"}
        title={main ? main.name : (ar ? "محادثة" : "Conversation")}
        subtitle={
          main
            ? main.title ?? (ar ? "محادثة مباشرة" : "Direct conversation")
            : ""
        }
      />

      <PageContainer width="narrow">
        {/* Thread header card */}
        <section
          className="flex items-center gap-4 p-4" style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)" }}
          data-tone="blue"
        >
          <Link
            href="/messages"
            className="rounded-md p-1.5 transition hover:bg-[var(--heri-cream-2)]"
            style={{ color: "var(--heri-ink-3)" }}
            aria-label={ar ? "العودة" : "Back"}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          {main ? (
            <>
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white ring-1 ring-white/30"
                style={{ background: mainColor }}
              >
                {initials(main.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className="line-clamp-1 text-[15px] font-bold"
                  style={{ color: "var(--heri-ink)" }}
                >
                  {main.name}
                </div>
                <div
                  className="line-clamp-1 text-[11px] font-bold"
                  style={{ color: "var(--heri-ink-3)" }}
                >
                  {main.title ?? main.role} · {main.email}
                </div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider"
                style={{
                  background: "var(--heri-cream-2)",
                  color: "var(--heri-ochre)",
                }}
              >
                {ar ? "مباشر" : "Direct"}
              </span>
            </>
          ) : null}
        </section>

        {/* Messages canvas — BUG-B: full-height chat column. The card
            fills the viewport (header on top, list scrolls in the middle,
            composer pinned at the bottom) so there's no dead whitespace
            below the input. */}
        <section
          className="flex flex-col overflow-hidden p-0"
          data-tone="brand"
          style={{ background: "var(--heri-cream)", border: "1px solid var(--heri-rule)", height: "calc(100dvh - 15rem)", minHeight: 460 }}
        >
          <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "var(--heri-cream-2)", color: "var(--heri-ochre)" }}
              >
                <MessageSquare className="h-7 w-7" />
              </span>
              <div
                className="text-[14px] font-semibold"
                style={{ color: "var(--heri-ink)" }}
              >
                {ar ? "لم تبدأ المحادثة بعد" : "Conversation hasn't started"}
              </div>
              <p
                className="max-w-sm text-[12px]"
                style={{ color: "var(--heri-ink-3)" }}
              >
                {ar
                  ? "اكتب أول رسالة لكسر الجليد. ستظهر هنا فوراً."
                  : "Write the first message to break the ice. It will appear here instantly."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              {Array.from(byDay.entries()).map(([day, msgs]) => (
                <div key={day} className="space-y-2">
                  {/* Day divider */}
                  <div className="flex items-center gap-3">
                    <span
                      className="h-px flex-1"
                      style={{ background: "var(--heri-rule)" }}
                    />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(day))}
                    </span>
                    <span
                      className="h-px flex-1"
                      style={{ background: "var(--heri-rule)" }}
                    />
                  </div>

                  {msgs.map((m) => {
                    const mine = m.authorId === session.id;
                    const color =
                      AVATAR_COLOR[m.author.avatarColor?.toLowerCase() ?? ""] ??
                      AVATAR_COLOR.emerald;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: color }}
                        >
                          {initials(m.author.name)}
                        </span>
                        <div
                          className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? "rounded-br-sm" : "rounded-bl-sm"}`}
                          style={
                            mine
                              ? {
                                  background:
                                    "linear-gradient(135deg, var(--heri-ochre) 0%, var(--heri-copper) 100%)",
                                  color: "white",
                                  boxShadow: "0 6px 14px -8px var(--heri-ochre)",
                                }
                              : {
                                  background: "var(--heri-cream)",
                                  color: "var(--heri-ink)",
                                  border: "1px solid var(--heri-rule)",
                                }
                          }
                        >
                          {/* Phase NS-2 — inline image render when
                              the message has a data URI attached. */}
                          {m.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.imageUrl}
                              alt=""
                              style={{
                                display: "block",
                                maxWidth: "100%",
                                maxHeight: 320,
                                borderRadius: 10,
                                marginBottom: m.body ? 6 : 0,
                              }}
                            />
                          ) : null}
                          {m.body ? (
                            <div
                              className="whitespace-pre-line text-[12.5px] leading-relaxed"
                            >
                              {m.body}
                            </div>
                          ) : null}
                          <div
                            className={`mt-1 text-[9.5px] font-bold ${mine ? "opacity-80" : ""}`}
                            style={{ color: mine ? "white" : "var(--heri-ink-3)" }}
                          >
                            {formatTime(m.createdAt, ar)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* BUG-B — keep the latest message in view on load + send. */}
              <ScrollToBottom />
            </div>
          )}
          </div>

          {/* Phase V3-P12 — client composer (clears on send, Enter to send). */}
          <MessageComposer
            threadId={thread.id}
            recipientName={main?.name ?? ""}
            ar={ar}
          />
        </section>
      </PageContainer>
    </>
  );
}
