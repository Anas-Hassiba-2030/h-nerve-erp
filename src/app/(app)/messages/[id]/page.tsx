// Thread detail — full conversation view with composer.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/i18n.server";
import { markThreadRead } from "@/lib/utils/messages";
import { prisma } from "@/lib/db/db";
import { sendMessage } from "../actions";
import { MessageComposer } from "./MessageComposer";
import { ScrollToBottom } from "./ScrollToBottom";
import "../../daylight.css";

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

export default async function ThreadPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getCurrentUser();
  if (!session) return null;
  const locale = await getLocale();
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
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "رسائل" : "Messages"}
        title={main ? main.name : (ar ? "محادثة" : "Conversation")}
        subtitle={
          main
            ? main.title ?? (ar ? "محادثة مباشرة" : "Direct conversation")
            : ""
        }
      />
      {/* Thread header card */}
      <section
        className="flex items-center gap-4 p-4 panel reveal"
        data-tone="blue"
      >
        <Link
          href="/messages"
          className="rounded-md p-1.5 transition"
          style={{ color: "var(--ink-muted)" }}
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
                style={{ color: "var(--ink)" }}
              >
                {main.name}
              </div>
              <div
                className="line-clamp-1 text-[13px] font-bold"
                style={{ color: "var(--ink-muted)" }}
              >
                {main.title ?? main.role} · {main.email}
              </div>
            </div>
            <span className="tag gold">
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
        className="flex flex-col overflow-hidden p-0 panel reveal"
        data-tone="brand"
        style={{ height: "calc(100dvh - 15rem)", minHeight: 460 }}
      >
        <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--cream)", color: "var(--gold)" }}
            >
              <MessageSquare className="h-7 w-7" />
            </span>
            <div
              className="text-[14px] font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {ar ? "لم تبدأ المحادثة بعد" : "Conversation hasn't started"}
            </div>
            <p
              className="max-w-sm text-[12px]"
              style={{ color: "var(--ink-muted)" }}
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
                    style={{ background: "var(--line)" }}
                  />
                  <span
                    className="text-[12px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(day))}
                  </span>
                  <span
                    className="h-px flex-1"
                    style={{ background: "var(--line)" }}
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
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
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
                                  "linear-gradient(135deg, var(--gold) 0%, var(--emerald) 100%)",
                                color: "white",
                                boxShadow: "0 6px 14px -8px var(--gold)",
                              }
                            : {
                                background: "var(--cream)",
                                color: "var(--ink)",
                                border: "1px solid var(--line)",
                              }
                        }
                      >
                        {/* Phase NS-2 — inline image render when
                            the message has a data URI attached. */}
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          (<img
                            src={m.imageUrl}
                            alt=""
                            style={{
                              display: "block",
                              maxWidth: "100%",
                              maxHeight: 320,
                              borderRadius: 10,
                              marginBottom: m.body ? 6 : 0,
                            }}
                          />)
                        ) : null}
                        {m.body ? (
                          <div
                            className="whitespace-pre-line text-[12.5px] leading-relaxed"
                          >
                            {m.body}
                          </div>
                        ) : null}
                        <div
                          className={`mt-1 text-[12px] font-bold ${mine ? "opacity-80" : ""}`}
                          style={{ color: mine ? "white" : "var(--ink-muted)" }}
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
    </DaylightShell>
  );
}
