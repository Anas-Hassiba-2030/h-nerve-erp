// /brain/council/discussion/[id] — Phase V3-NEW-5.
// Threaded view of a single shared CouncilDiscussion: the original
// shared insight + every CouncilReply in chronological order +
// a composer for ADMIN/EXECUTIVE to add a new reply.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MessagesSquare } from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import "../../../../daylight.css";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { replyToDiscussion } from "@/app/actions/council";
import { CouncilReplyComposer } from "./CouncilReplyComposer";

export const dynamic = "force-dynamic";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase();
}

export default async function DiscussionPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const locale = getLocale();
  const ar = locale === "ar";

  const d = await prisma.councilDiscussion.findUnique({
    where: { id: params.id },
    include: {
      sharedBy: { select: { name: true } },
      replies: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!d) notFound();

  const canReply = me.role === "ADMIN" || me.role === "EXECUTIVE";
  const fmt = new Intl.DateTimeFormat(ar ? "ar-JO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "المجلس · نقاش" : "Council · discussion"}
        title={d.title}
        subtitle={
          ar
            ? `${d.replies.length} رد · مشاركة من ${d.sharedBy?.name ?? "—"}`
            : `${d.replies.length} replies · shared by ${d.sharedBy?.name ?? "—"}`
        }
      />

      {/* Original shared insight body */}
      <DaylightPanel
        title={d.title}
        aside={fmt.format(d.createdAt)}
      >
        <div className="flex items-center justify-between mb-3">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
            {d.status === "OPEN" ? (ar ? "مفتوح" : "OPEN") : ar ? "مغلق" : "CLOSED"}
          </span>
          <Link
            href="/brain/council"
            style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)", textDecoration: "none" }}
          >
            <ChevronLeft className="h-3 w-3 inline rtl:rotate-180" />
            {ar ? "كل المجلس" : "Back to Council"}
          </Link>
        </div>
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--ink)",
          }}
        >
          {d.body}
        </p>
      </DaylightPanel>

      {/* Reply thread */}
      <DaylightPanel
        title={ar ? `${d.replies.length} رد` : `${d.replies.length} ${d.replies.length === 1 ? "reply" : "replies"}`}
        aside={ar ? "ترتيب زمني" : "Chronological"}
      >
        {d.replies.length === 0 ? (
          <div
            className="py-8 text-center"
            style={{
              color: "var(--ink-muted)",
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            {ar ? "لا توجد ردود بعد. كن أول من يبدأ النقاش." : "No replies yet. Be the first to start the debate."}
          </div>
        ) : (
          <ul className="space-y-3">
            {d.replies.map((r) => {
              const name = r.author?.name ?? (ar ? "مجهول" : "Unknown");
              return (
                <li
                  key={r.id}
                  className="flex gap-3"
                  style={{
                    padding: "10px 12px",
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--emerald)",
                      color: "var(--cream)",
                      fontWeight: 700,
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {initialsFor(name)}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "baseline",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "var(--ink)",
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".1em",
                          color: "var(--ink-muted)",
                        }}
                      >
                        {fmt.format(r.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: "var(--ink-muted)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {r.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DaylightPanel>

      {/* Composer — Phase V3-NEW-6 — controlled (clears on send). */}
      {canReply ? (
        <DaylightPanel
          title={ar ? "أضف تعليقاً" : "Add a reply"}
        >
          <CouncilReplyComposer discussionId={d.id} ar={ar} />
        </DaylightPanel>
      ) : (
        <div
          className="py-4 text-center"
          style={{
            color: "var(--ink-muted)",
            fontStyle: "italic",
            fontSize: 12.5,
          }}
        >
          {ar
            ? "الردود متاحة لدور ADMIN وEXECUTIVE فقط."
            : "Only ADMIN + EXECUTIVE roles can post replies."}
        </div>
      )}
    </DaylightShell>
  );
}
