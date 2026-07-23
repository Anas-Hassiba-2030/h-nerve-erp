// المراسلات · Messages — the ORIGINAL "Claude Design" night-register chat.
//
// Ported verbatim (structure + motion) from
// docs/design/system/sections/messages.html + messages.js. The look is the
// design; the data is real (threads, messages, users from Prisma). All scoped
// CSS lives in ./messages.css under .dl-page.
//
//   ┌ ms-ribbon ─────────────────────────────────────────────┐
//   │  title-box │ KPI mine · KPI 24h · KPI unread            │
//   ├ ms-chat ───────────────────────────────────────────────┤
//   │  ms-threads (real threads → /messages/[id])  │ ms-convo │
//   │                                              │ (latest) │
//   └────────────────────────────────────────────────────────┘
//
// The thread list links to the existing /messages/[id] detail view (full
// conversation + composer). The conversation column previews the most-recent
// thread's real messages and carries a working composer wired to the existing
// `sendMessage` server action.

import Link from "next/link";
import { prisma } from "@/lib/db/db";
import { formatNumber } from "@/lib/utils/utils";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { ConvoComposer } from "./ConvoComposer";
import { startDirectThread } from "./actions";
import "../daylight.css";
import "./messages.css";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function formatTime(d: Date, ar: boolean) {
  return new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const selectedId = (await searchParams)?.t;
  const locale = await getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();

  // Other users to start a direct conversation with (excludes me).
  const otherUsers = session
    ? await prisma.user.findMany({
        where: { id: { not: session.id } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 50,
      })
    : [];

  // ── existing Prisma data fetching (unchanged) ──
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
  const totalMessages = threads.reduce((a, t) => a + t._count.messages, 0);

  // ── real signals for the reference KPI ribbon + unread badges ──
  // Per-thread unread = messages authored by someone else after my lastReadAt.
  const myThreadIds = session
    ? threads.filter((t) => t.participants.some((p) => p.userId === session.id)).map((t) => t.id)
    : [];

  const myParts = session
    ? await prisma.threadParticipant.findMany({
        where: { userId: session.id, threadId: { in: myThreadIds } },
        select: { threadId: true, lastReadAt: true },
      })
    : [];
  const lastReadByThread = new Map(myParts.map((p) => [p.threadId, p.lastReadAt]));

  const unreadEntries = await Promise.all(
    (session ? myThreadIds : []).map(async (id) => {
      const since = lastReadByThread.get(id) ?? new Date(0);
      const n = await prisma.message.count({
        where: { threadId: id, authorId: { not: session!.id }, deletedAt: null, createdAt: { gt: since } },
      });
      return [id, n] as const;
    }),
  );
  const unreadByThread = new Map(unreadEntries);
  const totalUnread = unreadEntries.reduce((a, [, n]) => a + n, 0);

  const since24h = new Date(Date.now() - 864e5);
  const messages24h = await prisma.message.count({
    where: { deletedAt: null, createdAt: { gt: since24h } },
  });

  // ── open conversation: the thread picked in the list (?t=), else newest ──
  const activeThread =
    (selectedId ? threads.find((t) => t.id === selectedId) : null) ??
    threads.find((t) => t.messages.length > 0) ??
    threads[0] ??
    null;
  const activeMessages = activeThread
    ? await prisma.message.findMany({
        where: { threadId: activeThread.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { author: true },
        take: 60,
      })
    : [];
  const activeOther =
    activeThread?.participants.find((p) => p.userId !== session?.id)?.user ??
    activeThread?.participants[0]?.user ??
    null;
  const activeName =
    activeThread?.title ?? activeOther?.name ?? (ar ? "محادثة" : "Conversation");

  return (
    <div className="dl-page ms-scope" dir={ar ? "rtl" : "ltr"}>
      <div className="ms-wrap">
        <div className="ms-ribbon">
          <div className="ms-title-box">
            <span className="eb">
              <span className="tick" />
              {ar ? "الأفراد" : "People"}
            </span>
            <h1>{ar ? "المراسلات" : "Messages"}</h1>
          </div>
          <div className="ms-kpis">
            <div className="ms-kpi">
              <div className="v">{formatNumber(threads.length)}</div>
              <div className="k">{ar ? "محادثاتي" : "My conversations"}</div>
            </div>
            <div className="ms-kpi">
              <div className="v">{formatNumber(messages24h)}</div>
              <div className="k">{ar ? "رسائل آخر ٢٤ ساعة" : "Messages last 24h"}</div>
            </div>
            <div className="ms-kpi">
              <div className="v">{formatNumber(totalUnread)}</div>
              <div className="k">{ar ? "غير مقروء" : "Unread"}</div>
            </div>
          </div>
        </div>

        <div className="ms-chat">
          <div className="panel ms-threads">
            <div className="ms-threads-head">
              <h2>{ar ? "المحادثات" : "Conversations"}</h2>
              {/* New conversation — inline picker (was a broken /team link).
                  Pick a teammate → startDirectThread opens/creates the thread. */}
              <details className="ms-new-wrap">
                <summary className="ms-new">
                  ＋ {ar ? "محادثة جديدة" : "New conversation"}
                </summary>
                <form action={startDirectThread} className="ms-new-form">
                  <select name="toUserId" required defaultValue="" className="ms-new-select">
                    <option value="" disabled>
                      {ar ? "اختر زميلاً…" : "Pick a teammate…"}
                    </option>
                    {otherUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="ms-new-go">
                    {ar ? "ابدأ" : "Start"}
                  </button>
                </form>
              </details>
            </div>
            <div className="ms-thread-list">
              {threads.length === 0 ? (
                <div className="ms-empty">
                  <div className="ic">💬</div>
                  <div className="t">{ar ? "لا توجد محادثات" : "No conversations"}</div>
                  <div className="s">
                    {ar ? "ابدأ محادثة جديدة من زر «محادثة جديدة» بالأعلى." : "Start one with the New conversation button above."}
                  </div>
                </div>
              ) : (
                threads.map((thread) => {
                  const other =
                    thread.participants.find((p) => p.userId !== session?.id)?.user ??
                    thread.participants[0]?.user ??
                    null;
                  const name = thread.title ?? other?.name ?? (ar ? "محادثة" : "Conversation");
                  const role =
                    thread.kind === "GROUP"
                      ? `${ar ? "مجموعة · " : "Group · "}${formatNumber(thread.participants.length)} ${
                          ar ? "أعضاء" : "members"
                        }`
                      : other?.title ?? other?.role ?? "";
                  const last = thread.messages[0];
                  const preview = last
                    ? (last.authorId === session?.id ? (ar ? "أنت: " : "You: ") : "") +
                      (last.imageUrl && !last.body ? (ar ? "📷 صورة" : "📷 Photo") : last.body)
                    : ar
                      ? "لا رسائل"
                      : "No messages";
                  const unread = unreadByThread.get(thread.id) ?? 0;
                  return (
                    <Link
                      key={thread.id}
                      href={`/messages?t=${thread.id}`}
                      scroll={false}
                      className={`thr${thread.id === activeThread?.id ? " active" : ""}`}
                    >
                      <div className="av">
                        {thread.kind === "GROUP" ? "⬡" : initials(other?.name ?? "?").charAt(0)}
                      </div>
                      <div className="meta">
                        <div className="row1">
                          <span className="nm">{name}</span>
                          <span className="tm">{formatTime(thread.updatedAt, ar)}</span>
                        </div>
                        {role ? <div className="ro">{role}</div> : null}
                        <div className="prev">{preview}</div>
                      </div>
                      {unread > 0 ? <span className="unread">{formatNumber(unread)}</span> : null}
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="panel ms-convo">
            {activeThread ? (
              <>
                <div className="ms-convo-head">
                  <div className="av">
                    {activeThread.kind === "GROUP" ? "⬡" : initials(activeOther?.name ?? "?").charAt(0)}
                  </div>
                  <div className="who">
                    <Link
                      href={`/messages/${activeThread.id}`}
                      className="nm"
                      style={{ textDecoration: "none", color: "#fff" }}
                    >
                      {activeName}
                    </Link>
                    <div className="st">
                      {activeOther?.title ?? activeOther?.role ?? (ar ? "محادثة مباشرة" : "Direct conversation")}
                    </div>
                  </div>
                  <Link className="ms-brain-btn" href="/brain">
                    ✦ {ar ? "ناقش مع الدماغ" : "Discuss with brain"}
                  </Link>
                </div>

                <div className="ms-msgs">
                  {activeMessages.length === 0 ? (
                    <div className="ms-empty">
                      <div className="ic">✦</div>
                      <div className="t">{ar ? "لم تبدأ المحادثة بعد" : "Conversation hasn't started"}</div>
                      <div className="s">
                        {ar ? "اكتب أول رسالة في الأسفل." : "Write the first message below."}
                      </div>
                    </div>
                  ) : (
                    activeMessages.map((m) => {
                      const mine = m.authorId === session?.id;
                      return (
                        <div key={m.id} className={`msg ${mine ? "mine" : "theirs"}`}>
                          <div className="bub">
                            {m.body}
                            {m.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.imageUrl} alt={ar ? "صورة" : "image"} />
                            ) : null}
                          </div>
                          <div className="meta">{formatTime(m.createdAt, ar)}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <ConvoComposer threadId={activeThread.id} ar={ar} />
              </>
            ) : (
              <div className="ms-empty">
                <div className="ic">💬</div>
                <div className="t">{ar ? "اختر محادثة" : "Pick a conversation"}</div>
                <div className="s">
                  {ar
                    ? "ابدأ محادثة جديدة من زر «محادثة جديدة» بالأعلى."
                    : "Start one with the New conversation button above."}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
