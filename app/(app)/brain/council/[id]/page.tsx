// /brain/council/[id] — full transcript of a council session.
//
// Aesthetic: Refined Editorial (DESIGN-SKILL §1.A). This is the council's
// permanent record — every voice gets a tile in its agent accent, the
// moderator's synthesis sits in a larger plinth, and the dissent note is
// quoted in italic if present.
//
// Animation: each voice tile fades up with 80ms stagger (heri-stagger).
// The confidence number under the moderator ticks up from 0 → final on mount.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritagePill } from "@/components/heritage";
import { CouncilTranscript } from "@/components/brain/CouncilTranscript";
import { council } from "@/lib/brain/council.live";
import { getLocale } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { ArrowLeft, Target, ArrowRight, BookOpen } from "lucide-react";
import { deleteSession } from "../actions";
import { generateFromCouncil } from "@/app/(app)/plans/actions";

export default async function CouncilTranscriptPage({
  params,
}: {
  params: { id: string };
}) {
  const locale = getLocale();
  const ar = locale === "ar";

  const session = await council().replay(params.id);
  if (!session) notFound();

  return (
    <>
      <PageHeader
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
      />

      <PageContainer>
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/brain/council"
            className="heri-focusable inline-flex items-center gap-2"
            style={{
              fontFamily:
                "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--heri-copper)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft className="h-3 w-3 rtl:rotate-180" strokeWidth={1.5} />
            {ar ? "العودة إلى المجلس" : "Back to council"}
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/theater/council/${session.id}`}
              className="heri-btn heri-btn-secondary"
              style={{ padding: "8px 14px", fontSize: 12 }}
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
              {ar ? "افتح في المسرح" : "Open in Theater"}
            </Link>
            <form action={deleteSession}>
              <input type="hidden" name="id" value={session.id} />
              <button
                type="submit"
                className="heri-btn heri-btn-ghost"
                style={{ padding: "6px 12px", fontSize: 11 }}
              >
                {ar ? "حذف الجلسة" : "Delete session"}
              </button>
            </form>
          </div>
        </div>

        <CouncilTranscript session={session} ar={ar} />

        {/* Generate plan CTA — Phase 5 hook from PHASES-INTELLIGENCE.md */}
        <CouncilToPlanCta sessionId={session.id} ar={ar} />
      </PageContainer>
    </>
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
      <section
        className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center"
        style={{
          background: "var(--heri-cream-2)",
          border: "1px solid var(--heri-rule-strong)",
          padding: "14px 18px",
          borderInlineStart: "2px solid var(--heri-teal)",
        }}
      >
        <Target
          className="h-4 w-4"
          style={{ color: "var(--heri-teal)" }}
          strokeWidth={1.5}
        />
        <div className="min-w-0">
          <div className="heri-eyebrow heri-eyebrow-ink">
            {ar ? "خطة موجودة" : "Plan exists"}
          </div>
          <div
            className="line-clamp-1 mt-1"
            style={{
              fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--heri-ink)",
            }}
          >
            {existing.goal}
          </div>
        </div>
        <Link
          href={`/plans/${existing.id}`}
          className="heri-btn heri-btn-secondary"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          {ar ? "افتح الخطة" : "Open plan"}
          <ArrowRight
            className="h-3 w-3 transition rtl:rotate-180"
            strokeWidth={1.5}
          />
        </Link>
      </section>
    );
  }

  return (
    <section
      className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule-strong)",
        padding: "18px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        className="absolute"
        style={{
          top: 0,
          insetInline: 0,
          height: 2,
          background:
            "linear-gradient(90deg, var(--heri-terracotta) 0%, var(--heri-ochre) 50%, var(--heri-teal) 100%)",
        }}
      />
      <div className="min-w-0">
        <div className="heri-eyebrow inline-flex items-center gap-2">
          <Target className="h-3 w-3" strokeWidth={1.5} />
          {ar ? "الخطوة التالية" : "Next move"}
        </div>
        <h3
          className={ar ? "mt-2.5" : "font-display-latin mt-2.5"}
          style={{
            fontSize: "clamp(20px, 1.8vw, 26px)",
            lineHeight: 1.2,
            letterSpacing: ar ? "-0.005em" : "-0.014em",
            fontWeight: ar ? 600 : 500,
            color: "var(--heri-ink)",
          }}
        >
          {ar
            ? "حوّل التوصية إلى خطة قابلة للتنفيذ."
            : "Turn the recommendation into a committable plan."}
        </h3>
        <p
          className="mt-1.5 measure"
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--heri-ink-2)",
          }}
        >
          {ar
            ? "سيستخدم المُخطّط نص توصية المُيَسّر لإنتاج خطوات مُرتّبة، أصحاب أدوار، مهلة زمنية، وشرط تراجع — جاهزة للإصدار."
            : "The Planner will use the moderator's recommendation to produce ordered steps, owners, a deadline, and a rollback condition — ready to commit."}
        </p>
      </div>
      <form action={generateFromCouncil}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <button type="submit" className="heri-btn heri-btn-primary">
          <Target className="h-4 w-4" strokeWidth={1.5} />
          {ar ? "توليد خطة" : "Generate plan"}
        </button>
      </form>
    </section>
  );
}
