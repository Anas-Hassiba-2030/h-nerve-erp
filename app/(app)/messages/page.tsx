// /messages — internal peer-to-peer messaging between officials.
// Index view: composer to start a new chat + list of active threads.

import Link from "next/link";
import {
  MessageSquare, Plus, Send, Users2, ArrowRight, MessageCircle, Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
import { EmptyState } from "@/components/EmptyState";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { listThreadsFor, unreadCountFor } from "@/lib/messages";
import { prisma } from "@/lib/db";
import { formatNumber, formatRelative } from "@/lib/utils";
import { startDirectThread } from "./actions";

const AVATAR_COLOR: Record<string, string> = {
  emerald: "#10b981", amber: "#f59e0b", blue: "#3b82f6",
  violet: "#8b5cf6", rose: "#f43f5e", slate: "#64748b",
  red: "#ef4444", green: "#22c55e", indigo: "#6366f1",
  pink: "#ec4899", sky: "#0ea5e9", teal: "#14b8a6",
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default async function MessagesPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const session = await getCurrentUser();
  if (!session) return null;

  const [threads, unread, allUsers] = await Promise.all([
    listThreadsFor(session.id),
    unreadCountFor(session.id),
    prisma.user.findMany({
      where: { id: { not: session.id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, title: true, avatarColor: true, rank: true },
    }),
  ]);

  const totalThreads = threads.length;
  const activeToday = threads.filter((t) => {
    const last = t.last?.createdAt;
    if (!last) return false;
    return Date.now() - last.getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <>
      <PageHeader
        eyebrow={ar ? "التواصل الداخلي" : "Internal communication"}
        title={ar ? "الرسائل" : "Messages"}
        subtitle={
          ar
            ? "تواصل مباشر بين مسؤولي المجموعة — ملاحظات على الأسعار، الجودة، أو أي قرار."
            : "Direct chat between Hourani officials — pricing, quality, or any decision."
        }
      />

      <PageContainer>
        <HeroPanel
          gradient="linear-gradient(135deg, #0c1f3d 0%, #0e7490 40%, #06b6d4 75%, #67e8f9 110%)"
          accent="#06b6d4"
          height={230}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <div
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl ring-2 ring-white/40"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <MessageSquare className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <MessageCircle className="h-3 w-3 hn-anim-pulse-soft" />
                  {ar ? "تواصل مباشر" : "Live chat"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "الرسائل الداخلية" : "Internal messages"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "اتصل بزملائك حول الأسعار، الجودة، الحجوزات، أو أي قرار يحتاج نقاشاً."
                    : "Reach colleagues about pricing, quality, bookings, or any decision needing discussion."}
                </p>
              </div>
            </div>

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <MsgHeroStat label={ar ? "محادثات" : "Threads"} value={formatNumber(totalThreads)} icon={Inbox} />
              <MsgHeroStat label={ar ? "غير مقروء" : "Unread"} value={formatNumber(unread)} icon={MessageCircle} />
              <MsgHeroStat label={ar ? "نشطة اليوم" : "Active today"} value={formatNumber(activeToday)} icon={Send} />
              <MsgHeroStat label={ar ? "زملاء" : "Colleagues"} value={formatNumber(allUsers.length)} icon={Users2} />
            </div>
          </div>
        </HeroPanel>

        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "إجمالي محادثاتي" : "My threads"}
            value={formatNumber(totalThreads)}
            icon={Inbox}
            tone="blue"
            hint={ar ? "كل المحادثات" : "all conversations"}
          />
          <MetricTile
            label={ar ? "غير مقروءة" : "Unread"}
            value={formatNumber(unread)}
            icon={MessageCircle}
            tone={unread > 0 ? "rose" : "brand"}
            hint={ar ? "تنتظر ردك" : "awaiting reply"}
          />
          <MetricTile
            label={ar ? "نشطة اليوم" : "Active today"}
            value={formatNumber(activeToday)}
            icon={Send}
            tone="emerald"
            hint={ar ? "آخر 24 ساعة" : "last 24h"}
          />
          <MetricTile
            label={ar ? "زملاء متاحون" : "Available peers"}
            value={formatNumber(allUsers.length)}
            icon={Users2}
            tone="violet"
            hint={ar ? "في الفريق" : "in the team"}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          {/* Thread list */}
          <section className="exec-card overflow-hidden p-0" data-tone="blue">
            <div
              className="px-5 py-3.5"
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--brand-soft)",
              }}
            >
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4" style={{ color: "var(--brand)" }} />
                <h3 className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>
                  {ar ? "صندوق الوارد" : "Inbox"}
                </h3>
              </div>
            </div>
            {threads.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={MessageSquare}
                  title={ar ? "لا توجد محادثات بعد" : "No conversations yet"}
                  description={
                    ar
                      ? "ابدأ محادثة جديدة من اللوحة الجانبية لمراسلة أي زميل في المجموعة."
                      : "Start a new conversation from the side panel to reach any colleague."
                  }
                />
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {threads.map((t) => {
                  const others = t.thread.participants
                    .filter((p) => p.user.id !== session.id)
                    .map((p) => p.user);
                  const main = others[0];
                  if (!main) return null;
                  const color =
                    AVATAR_COLOR[main.avatarColor?.toLowerCase() ?? ""] ?? AVATAR_COLOR.emerald;
                  return (
                    <li key={t.thread.id}>
                      <Link
                        href={`/messages/${t.thread.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition hover:bg-[var(--brand-soft)]"
                      >
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ring-1 ring-white/30"
                          style={{ background: color }}
                        >
                          {initials(main.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="line-clamp-1 text-[13px] font-extrabold"
                              style={{ color: "var(--text)" }}
                            >
                              {main.name}
                            </span>
                            {t.last ? (
                              <span
                                className="shrink-0 text-[10px] font-bold"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {formatRelative(t.last.createdAt)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="line-clamp-1 text-[11.5px] font-medium"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {t.last
                                ? t.last.authorId === session.id
                                  ? `${ar ? "أنت:" : "You:"} ${t.last.body}`
                                  : t.last.body
                                : ar
                                ? "لا رسائل بعد"
                                : "No messages yet"}
                            </span>
                            {t.unread > 0 ? (
                              <span
                                className="ms-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black text-white hn-anim-pop"
                                style={{
                                  background:
                                    "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
                                }}
                              >
                                {t.unread}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 transition rtl:rotate-180"
                          style={{ color: "var(--text-muted)" }}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Compose new */}
          <section className="exec-card overflow-hidden p-0" data-tone="brand">
            <div
              className="px-5 py-3.5"
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--brand-soft)",
              }}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" style={{ color: "var(--brand)" }} />
                <h3 className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>
                  {ar ? "محادثة جديدة" : "New conversation"}
                </h3>
              </div>
            </div>
            <form action={startDirectThread} className="space-y-3 p-5">
              <div>
                <label className="label">{ar ? "إلى" : "To"}</label>
                <select name="toUserId" required className="select w-full">
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.title ? `· ${u.title}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  {ar ? "رسالتك (اختياري)" : "Your message (optional)"}
                </label>
                <textarea
                  name="body"
                  rows={4}
                  className="textarea w-full"
                  placeholder={
                    ar
                      ? "اكتب رسالتك الأولى... ستفتح المحادثة فوراً."
                      : "Type your first message... we'll open the chat right away."
                  }
                />
              </div>
              <button type="submit" className="btn-primary hn-hover-shine w-full">
                <Send className="h-4 w-4" />
                {ar ? "ابدأ المحادثة" : "Start conversation"}
              </button>
            </form>

            {/* Peer suggestions */}
            <div
              className="px-5 py-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div
                className="mb-2 text-[10px] font-extrabold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {ar ? "زملاء سريعون" : "Quick peers"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allUsers.slice(0, 6).map((u) => {
                  const color =
                    AVATAR_COLOR[u.avatarColor?.toLowerCase() ?? ""] ?? AVATAR_COLOR.emerald;
                  return (
                    <form
                      key={u.id}
                      action={startDirectThread}
                      className="contents"
                    >
                      <input type="hidden" name="toUserId" value={u.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold transition hover:scale-105"
                        style={{
                          background: "var(--brand-soft)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[8.5px] font-black text-white"
                          style={{ background: color }}
                        >
                          {initials(u.name)}
                        </span>
                        {u.name.split(" ")[0]}
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </PageContainer>
    </>
  );
}

function MsgHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-xl font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}
