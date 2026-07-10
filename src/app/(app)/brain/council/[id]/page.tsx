// /brain/council/[id] — full transcript of a council session.
//
// Aesthetic: the ORIGINAL "Claude Design" cosmic-orbit look. This is the
// council's permanent record — the voices orbit the Brain, the moderator's
// synthesis fills a confidence ring, and the dissent note is quoted in italic
// if present. The transcript itself is rendered by <CouncilTranscript/>, which
// runs the choreographed debate + confidence tick-up.
//
// Phase 3 of docs/governance/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import Link from "next/link";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { CouncilTranscript } from "@/components/brain/CouncilTranscript";
import { CouncilSourcesPanel } from "@/components/brain/CouncilSourcesPanel";
import { council } from "@/lib/brain/council.live";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { pickLocale } from "@/lib/utils/utils";
import { ArrowLeft, Target, ArrowRight, BookOpen, Bookmark, BookmarkCheck } from "lucide-react";
import { deleteSession, togglePin } from "../actions";
import { generateFromCouncil } from "@/app/(app)/plans/actions";
import "../../../daylight.css";
import "../council-design.css";

export const dynamic = "force-dynamic";

export default async function CouncilTranscriptPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const locale = await getLocale();
  const ar = locale === "ar";

  const session = await council().replay(params.id);
  if (!session) notFound();

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الدماغ · جلسة المجلس" : "Brain · Council session"}
        title={
          session.topic.length > 80
            ? session.topic.slice(0, 78) + "…"
            : session.topic
        }
        subtitle={
          ar
            ? `محفوظة بتاريخ ${new Intl.DateTimeFormat("ar-JO-u-nu-latn", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(session.ranAt)}`
            : `Recorded ${new Intl.DateTimeFormat("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(session.ranAt)}`
        }
        actions={
          <>
            <form action={togglePin}>
              <input type="hidden" name="id" value={session.id} />
              <button
                type="submit"
                className="dl-btn dl-btn-secondary"
                style={session.pinned ? { borderColor: "var(--gold)", color: "#fff" } : undefined}
              >
                {session.pinned ? <BookmarkCheck className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {session.pinned ? (ar ? "محفوظة" : "Saved") : (ar ? "احفظ" : "Save")}
              </button>
            </form>
            <Link
              href={`/theater/council/${session.id}`}
              className="dl-btn dl-btn-secondary"
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "افتح في المسرح" : "Open in Theater"}
            </Link>
            <form action={deleteSession}>
              <input type="hidden" name="id" value={session.id} />
              <button type="submit" className="dl-btn dl-btn-secondary">
                {ar ? "حذف الجلسة" : "Delete session"}
              </button>
            </form>
          </>
        }
      />

      <div className="reveal" style={{ marginBottom: 18 }}>
        <Link
          href="/brain/council"
          className="dl-btn dl-btn-secondary"
          style={{ textDecoration: "none" }}
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
          {ar ? "العودة إلى المجلس" : "Back to council"}
        </Link>
      </div>

      <CouncilTranscript session={session} ar={ar} />

      {/* The proof base — what the council actually reasoned over. Sessions run
          before evidence-capture shipped have no stored sources; rather than
          silently omit the section (and re-raise "where are the proofs?"), say
          so honestly and point at re-running. */}
      {session.sources ? (
        <CouncilSourcesPanel sources={session.sources} ar={ar} />
      ) : (
        <div className="co-wrap reveal" style={{ marginTop: 18 }}>
          <div className="co-question" style={{ margin: "0 0 14px" }}>
            <div className="lbl">{ar ? "الأدلة والمصادر" : "Evidence & sources"}</div>
            <h2 style={{ fontSize: "clamp(20px,2.4vw,28px)" }}>
              {ar ? "على ماذا استند المجلس" : "What the council reasoned on"}
            </h2>
          </div>
          <p
            style={{
              maxWidth: "62ch",
              margin: "0 auto",
              textAlign: "center",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "rgba(246,241,231,.62)",
            }}
          >
            {ar
              ? "عُقدت هذه الجلسة قبل تفعيل تسجيل الأدلة، لذا لم تُحفظ قاعدة الإثبات. اطرح القرار من جديد على المجلس لتسجيل الأرقام والمستندات والكيانات التي يستند إليها."
              : "This session ran before evidence-capture was enabled, so its proof base wasn’t recorded. Pose the decision to the council again to capture the metrics, documents, and entities behind it."}
          </p>
        </div>
      )}

      {/* Generate plan CTA — Phase 5 hook from PHASES-INTELLIGENCE.md */}
      <CouncilToPlanCta sessionId={session.id} ar={ar} />
    </DaylightShell>
  );
}

async function CouncilToPlanCta({
  sessionId,
  ar,
}: {
  sessionId: string;
  ar: boolean;
}) {
  // Has a plan already been generated from this council session?
  const existing = await prisma.plan.findFirst({
    where: { sourceCouncilSessionId: sessionId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return (
      <div
        className="panel reveal"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 14,
          borderInlineStart: "2px solid var(--sage)",
        }}
      >
        <Target
          className="h-4 w-4"
          style={{ color: "var(--emerald)" }}
          strokeWidth={1.5}
        />
        <div style={{ minWidth: 0 }}>
          <div className="kpi-label">{ar ? "خطة موجودة" : "Plan exists"}</div>
          <div
            className="line-clamp-1"
            style={{
              fontFamily: "var(--dl-display)",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--emerald)",
              marginTop: 4,
            }}
          >
            {pickLocale(ar, existing.goal, existing.goalEn)}
          </div>
        </div>
        <Link href={`/plans/${existing.id}`} className="dl-btn dl-btn-secondary">
          {ar ? "افتح الخطة" : "Open plan"}
          <ArrowRight className="h-3 w-3 transition rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="panel reveal"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="sec-eyebrow"
          style={{ marginBottom: 8 }}
        >
          <Target className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "الخطوة التالية" : "Next move"}
        </div>
        <h3
          style={{
            fontFamily: "var(--dl-display)",
            fontSize: "clamp(22px, 2vw, 28px)",
            lineHeight: 1.15,
            fontWeight: 600,
            color: "var(--emerald)",
          }}
        >
          {ar
            ? "حوّل التوصية إلى خطة قابلة للتنفيذ."
            : "Turn the recommendation into a committable plan."}
        </h3>
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--ink-muted)",
            marginTop: 8,
            maxWidth: "62ch",
          }}
        >
          {ar
            ? "سيستخدم المُخطّط نص توصية المُيَسّر لإنتاج خطوات مُرتّبة، أصحاب أدوار، مهلة زمنية، وشرط تراجع — جاهزة للإصدار."
            : "The Planner will use the moderator's recommendation to produce ordered steps, owners, a deadline, and a rollback condition — ready to commit."}
        </p>
      </div>
      <form action={generateFromCouncil}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <button type="submit" className="dl-btn dl-btn-primary">
          <Target className="h-4 w-4" strokeWidth={1.5} />
          {ar ? "توليد خطة" : "Generate plan"}
        </button>
      </form>
    </div>
  );
}
