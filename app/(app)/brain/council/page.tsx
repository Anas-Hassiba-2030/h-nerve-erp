// /brain/council — convene a new council, browse past sessions.
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { llmConfig } from "@/lib/brain/llm";
import { Users2, ChevronLeft, MessagesSquare, ArrowRight } from "lucide-react";
import { convene } from "./actions";

const SUGGESTED_TOPICS_EN = [
  "Should we ramp Maha cheese production for Q3 to capture the Arena conference uplift?",
  "Arena Sofia occupancy is forecast to drop 15% next month — what should we pre-empt?",
  "Two labneh batches are 3 days from expiry. Hold, discount, or redirect?",
  "The Tank's 2026-S1 cohort is 80% allocated — should we open a side cohort?",
  "Loran greenhouse moisture has been below 35% for 72 hours. Triage plan?",
];
const SUGGESTED_TOPICS_AR = [
  "هل نزيد إنتاج جبنة المها في الربع الثالث لاستيعاب ارتفاع مؤتمرات أرينا؟",
  "إشغال أرينا صوفيا متوقع أن ينخفض 15% الشهر القادم — ما الإجراء الاستباقي؟",
  "دفعتا لبنة على بُعد 3 أيام من الانتهاء. تأجيل، خصم، أم تحويل وجهة؟",
  "كوهورت 2026-S1 في حاضنة The Tank ممتلئ 80%. هل نفتح كوهورت موازياً؟",
  "رطوبة دفيئة لوران أقل من 35% منذ 72 ساعة. خطة طوارئ؟",
];

export default async function BrainCouncilIndex() {
  const locale = getLocale();
  const ar = locale === "ar";

  // Phase V3-P5 — operator-shared CouncilDiscussion threads render
  // above the system CouncilSession deliberations. Tenant-scoped via
  // workspaceScope middleware.
  const [recentSessions, openCount, llmEnabled, sharedDiscussions] = await Promise.all([
    prisma.councilSession.findMany({
      orderBy: { ranAt: "desc" },
      take: 12,
      include: { _count: { select: { voices: true } } },
    }),
    prisma.councilSession.count({ where: { status: "RUNNING" } }),
    Promise.resolve(llmConfig().enabled),
    prisma.councilDiscussion.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        sharedBy: { select: { name: true } },
        _count: { select: { replies: true } },
      },
    }),
  ]);

  const topics = ar ? SUGGESTED_TOPICS_AR : SUGGESTED_TOPICS_EN;

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · المجلس" : "Brain · Council"}
        title={ar ? "اجتمع المجلس" : "Convene the council"}
        subtitle={
          ar
            ? "خمسة متخصصين يتداولون في سؤال واحد. مُيَسّر يُجمّع. توصية مع نسبة ثقة وملاحظة معارضة."
            : "Five specialists deliberate on one question. A moderator synthesizes. One recommendation with confidence and dissent."
        }
      />

      <PageContainer>
        {/* Hero — the question form */}
        <section className="heri-hero">
          <div
            className="px-6 py-7 md:px-9 md:py-9"
            style={{ borderBottom: "1px solid var(--heri-rule-strong)" }}
          >
            <div className="heri-eyebrow inline-flex items-center gap-2">
              <MessagesSquare className="h-3 w-3" strokeWidth={1.5} />
              {ar ? "صياغة السؤال" : "Frame the question"}
            </div>
            <h2
              className={ar ? "mt-3" : "font-display-latin mt-3"}
              style={{
                fontSize: "clamp(26px, 3vw, 40px)",
                lineHeight: 1.05,
                letterSpacing: ar ? "-0.005em" : "-0.022em",
                fontWeight: ar ? 600 : 500,
                color: "var(--heri-ink)",
                textWrap: "balance" as any,
              }}
            >
              {ar ? "اطرح القرار. اسمع الصوت كاملاً." : "Pose the decision. Hear the whole voice."}
            </h2>

            <form action={convene} className="mt-6">
              <label
                htmlFor="topic"
                className="heri-eyebrow heri-eyebrow-ink mb-2 block"
              >
                {ar ? "الموضوع" : "Topic"}
              </label>
              <textarea
                id="topic"
                name="topic"
                rows={3}
                required
                minLength={6}
                placeholder={
                  ar
                    ? "مثال: هل نزيد إنتاج المها لاستيعاب موسم أرينا؟"
                    : "e.g. Should we ramp Maha production for the Arena season?"
                }
                className="heri-focusable w-full"
                style={{
                  background: "var(--heri-cream-2)",
                  border: "1px solid var(--heri-rule-strong)",
                  padding: "12px 14px",
                  fontFamily:
                    "'Inter Tight','Inter','IBM Plex Sans Arabic',system-ui,sans-serif",
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  color: "var(--heri-ink)",
                  borderRadius: 0,
                  resize: "vertical",
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="submit" className="heri-btn heri-btn-primary">
                  <Users2 className="h-4 w-4" strokeWidth={1.5} />
                  {ar ? "اجتمع المجلس" : "Convene the council"}
                </button>
                <span
                  className="heri-eyebrow heri-eyebrow-ink"
                  style={{ fontSize: 10 }}
                >
                  {llmEnabled
                    ? (ar ? (<>حالة المحرك: مُتصِل بـ <bdi dir="ltr">Claude</bdi></>) : "Engine: live · Claude")
                    : (ar ? "حالة المحرك: تحليلي محلي" : "Engine: on-device reasoning")}
                </span>
                {openCount > 0 ? (
                  <HeritagePill tone="warn">
                    {openCount} {ar ? "جلسة قيد التشغيل" : "running"}
                  </HeritagePill>
                ) : null}
              </div>
            </form>
          </div>

          {/* Suggested topics — single-click prefills */}
          <div className="px-6 py-5 md:px-9">
            <div className="heri-eyebrow heri-eyebrow-ink mb-3">
              {ar ? "اقتراحات" : "Suggestions"}
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {topics.map((t) => (
                <li key={t}>
                  <form action={convene}>
                    <input type="hidden" name="topic" value={t} />
                    <button
                      type="submit"
                      className="heri-focusable group block w-full text-start transition"
                      style={{
                        background: "var(--heri-cream-2)",
                        border: "1px solid var(--heri-rule)",
                        padding: "10px 14px",
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: "var(--heri-ink-2)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <ArrowRight
                          className="h-3 w-3 mt-1 shrink-0 rtl:rotate-180 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                          style={{ color: "var(--heri-copper)" }}
                          strokeWidth={1.5}
                        />
                        <span style={{ fontStyle: ar ? "normal" : "italic" }}>{t}</span>
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Phase V3-P5 — operator-shared threads */}
        <HeritageSection
          eyebrow={ar ? "مشاركات المدراء" : "Operator shares"}
          title={ar ? "خيوط المجلس المشتركة" : "Shared Council threads"}
          aside={
            ar
              ? "ما شاركه المدراء مع المجلس من رؤى وملاحظات."
              : "What admins have shared with the Council for group discussion."
          }
        >
          {sharedDiscussions.length === 0 ? (
            <div
              className="py-8 text-center"
              style={{
                color: "var(--heri-ink-3)",
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              {ar
                ? "لا توجد مشاركات بعد. اضغط على زر «للمجلس» في صفحة الرؤى لمشاركة أول رؤية."
                : "No shares yet. Click the “Council” button on any insight card to start a thread."}
            </div>
          ) : (
            <ul className="space-y-2">
              {sharedDiscussions.map((d) => (
                <li
                  key={d.id}
                  className="border p-3"
                  style={{
                    borderColor: "var(--heri-rule)",
                    background: "var(--heri-cream)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span
                      className="heri-eyebrow"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {d.sharedBy?.name ?? (ar ? "—" : "unknown")} ·{" "}
                      {new Date(d.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                    </span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <HeritagePill tone={d._count.replies > 0 ? "neutral" : "warn"}>
                        {d._count.replies} {ar ? "رد" : d._count.replies === 1 ? "reply" : "replies"}
                      </HeritagePill>
                      <HeritagePill tone={d.status === "OPEN" ? "warn" : "neutral"}>
                        {d.status === "OPEN"
                          ? ar ? "مفتوح" : "OPEN"
                          : ar ? "مغلق" : "CLOSED"}
                      </HeritagePill>
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--heri-ink)",
                      marginBottom: 4,
                    }}
                  >
                    {d.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "var(--heri-ink-2)",
                      marginBottom: 8,
                    }}
                  >
                    {d.body}
                  </div>
                  {/* Phase V3-NEW-5 — clear Open discussion CTA. */}
                  <Link
                    href={`/brain/council/discussion/${d.id}`}
                    className="heri-btn heri-btn-secondary"
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {ar ? "فتح النقاش" : "Open discussion"}
                    <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HeritageSection>

        {/* Past sessions */}
        <HeritageSection
          eyebrow={ar ? "الأرشيف" : "Archive"}
          title={ar ? "جلسات سابقة" : "Past sessions"}
          aside={
            ar
              ? "كل جلسة محفوظة بالكامل بنصوصها وتوصيتها."
              : "Every session is preserved in full — voices, recommendation, dissent."
          }
        >
          {recentSessions.length === 0 ? (
            <div
              className="py-8 text-center"
              style={{
                color: "var(--heri-ink-3)",
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              {ar ? "لم تُعقد جلسات بعد." : "No sessions yet."}
            </div>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/brain/council/${s.id}`}
                    className="heri-focusable group flex items-start gap-3 px-4 py-3 transition"
                    style={{
                      background: "var(--heri-cream)",
                      border: "1px solid var(--heri-rule)",
                      borderInlineStart:
                        s.status === "FAILED"
                          ? "2px solid var(--heri-terracotta)"
                          : s.status === "RUNNING"
                            ? "2px solid var(--heri-ochre)"
                            : "2px solid var(--heri-teal)",
                      textDecoration: "none",
                      color: "var(--heri-ink)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="line-clamp-2"
                        style={{
                          fontFamily: "'Fraunces','Tiempos Headline',Georgia,serif",
                          fontSize: 14.5,
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "var(--heri-ink)",
                          lineHeight: 1.3,
                        }}
                      >
                        {s.topic}
                      </div>
                      <div
                        className="mt-1.5 flex flex-wrap items-center gap-2"
                        style={{
                          fontFamily:
                            "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          color: "var(--heri-ink-3)",
                          textTransform: "uppercase",
                        }}
                      >
                        <span>
                          {new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(s.ranAt)}
                        </span>
                        <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                        <span>{s._count.voices} {ar ? "صوت" : "voices"}</span>
                        {typeof s.confidence === "number" ? (
                          <>
                            <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                            <span>
                              {ar ? "ثقة" : "conf"} {(s.confidence * 100).toFixed(0)}%
                            </span>
                          </>
                        ) : null}
                        {s.usedLiveLlm ? (
                          <>
                            <span style={{ color: "var(--heri-rule-strong)" }}>·</span>
                            <span style={{ color: "var(--heri-copper)" }}>LIVE</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <ChevronLeft
                      className="mt-1 h-4 w-4 shrink-0 transition rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                      style={{ color: "var(--heri-copper)" }}
                      strokeWidth={1.5}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HeritageSection>
      </PageContainer>
    </>
  );
}
