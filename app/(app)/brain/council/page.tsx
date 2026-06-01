// /brain/council -- convene a new council, browse past sessions.
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import "../../daylight.css";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { llmConfig } from "@/lib/brain/llm";
import { Users2, ChevronLeft, MessagesSquare, ArrowRight } from "lucide-react";
import { convene } from "./actions";

const SUGGESTED_TOPICS_EN = [
  "Should we ramp Maha cheese production for Q3 to capture the Arena conference uplift?",
  "Arena Sofia occupancy is forecast to drop 15% next month -- what should we pre-empt?",
  "Two labneh batches are 3 days from expiry. Hold, discount, or redirect?",
  "The Tank's 2026-S1 cohort is 80% allocated -- should we open a side cohort?",
  "Loran greenhouse moisture has been below 35% for 72 hours. Triage plan?",
];
const SUGGESTED_TOPICS_AR = [
  "هل نزيد إنتاج جبنة المها في الربع الثالث لاستيعاب ارتفاع مؤتمرات أرينا؟",
  "إشغال أرينا صوفيا متوقع أن ينخفض 15% الشهر القادم -- ما الإجراء الاستباقي؟",
  "دفعتا لبنة على بُعد 3 أيام من الانتهاء. تأجيل، خصم، أم تحويل وجهة؟",
  "كوهورت 2026-S1 في حاضنة The Tank ممتلئ 80%. هل نفتح كوهورت موازياً؟",
  "رطوبة دفيئة لوران أقل من 35% منذ 72 ساعة. خطة طوارئ؟",
];

export default async function BrainCouncilIndex() {
  const locale = getLocale();
  const ar = locale === "ar";

  // Phase V3-P5 -- operator-shared CouncilDiscussion threads render
  // above the system CouncilSession deliberations. Tenant-scoped via
  // workspaceScope middleware.
  const [recentSessions, openCount, llmEnabled, sharedDiscussions, totalSessions, avgConfRaw] = await Promise.all([
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
    prisma.councilSession.count(),
    prisma.councilSession.aggregate({
      _avg: { confidence: true },
      where: { confidence: { not: null } },
    }),
  ]);
  const avgConfidence = avgConfRaw._avg.confidence ?? 0;
  const openSharedCount = sharedDiscussions.filter((d) => d.status === "OPEN").length;

  const topics = ar ? SUGGESTED_TOPICS_AR : SUGGESTED_TOPICS_EN;

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الدماغ · المجلس" : "Brain · Council"}
        title={ar ? "اجتمع المجلس" : "Convene the council"}
        subtitle={
          ar
            ? "خمسة متخصصين يتداولون في سؤال واحد. مُيَسّر يُجمّع. توصية مع نسبة ثقة وملاحظة معارضة."
            : "Five specialists deliberate on one question. A moderator synthesizes. One recommendation with confidence and dissent."
        }
      />

      {/* Hero -- the question form */}
      <div className="panel reveal">
          <div
            className="px-6 py-7 md:px-9 md:py-9"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--gold)" }}>
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
                color: "var(--ink)",
                textWrap: "balance" as any,
              }}
            >
              {ar ? "اطرح القرار. اسمع الصوت كاملاً." : "Pose the decision. Hear the whole voice."}
            </h2>

            <form action={convene} className="mt-6">
              <label
                htmlFor="topic"
                style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)", marginBottom: 8 }}
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
                className="w-full"
                style={{
                  background: "var(--ivory)",
                  border: "1px solid var(--line)",
                  padding: "12px 14px",
                  fontFamily:
                    "'Inter Tight','Inter','IBM Plex Sans Arabic',system-ui,sans-serif",
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  color: "var(--ink)",
                  borderRadius: 8,
                  resize: "vertical",
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="submit" className="dl-btn dl-btn-primary">
                  <Users2 className="h-4 w-4" strokeWidth={1.5} />
                  {ar ? "اجتمع المجلس" : "Convene the council"}
                </button>
                <span
                  style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}
                >
                  {llmEnabled
                    ? (ar ? (<>حالة المحرك: مُتصِل بـ <bdi dir="ltr">Claude</bdi></>) : "Engine: live · Claude")
                    : (ar ? "حالة المحرك: تحليلي محلي" : "Engine: on-device reasoning")}
                </span>
                {openCount > 0 ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
                    {openCount} {ar ? "جلسة قيد التشغيل" : "running"}
                  </span>
                ) : null}
              </div>
            </form>
          </div>

          {/* Suggested topics -- single-click prefills */}
          <div className="px-6 py-5 md:px-9">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)", marginBottom: 12 }}>
              {ar ? "اقتراحات" : "Suggestions"}
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {topics.map((t) => (
                <li key={t}>
                  <form action={convene}>
                    <input type="hidden" name="topic" value={t} />
                    <button
                      type="submit"
                      className="group block w-full text-start transition"
                      style={{
                        background: "var(--ivory)",
                        border: "1px solid var(--line)",
                        padding: "10px 14px",
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: "var(--ink-muted)",
                        cursor: "pointer",
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "start", gap: 8 }}>
                        <ArrowRight
                          className="h-3 w-3 mt-1 shrink-0 rtl:rotate-180 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                          style={{ color: "var(--gold)" }}
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
        </div>

        {/* KPI strip -- the council's footprint at a glance. */}
        <DaylightKpiGrid>
          <DaylightKpi
            label={ar ? "مجموع الجلسات" : "Total sessions"}
            value={String(totalSessions)}
            hint={ar ? "كل الجلسات" : "all-time"}
          />
          <DaylightKpi
            label={ar ? "جلسات قيد التشغيل" : "Running"}
            value={String(openCount)}
            hint={ar ? "تتداول الآن" : "live now"}
          />
          <DaylightKpi
            label={ar ? "متوسط الثقة" : "Avg confidence"}
            value={`${(avgConfidence * 100).toFixed(0)}%`}
            hint={ar ? "عبر التوصيات" : "across recs"}
          />
          <DaylightKpi
            label={ar ? "خيوط مفتوحة" : "Open threads"}
            value={String(openSharedCount)}
            hint={ar ? "مشاركات المدراء" : "operator shares"}
          />
        </DaylightKpiGrid>

        {/* Phase V3-P5 -- operator-shared threads */}
        <DaylightPanel
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
                color: "var(--ink-muted)",
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              {ar
                ? "لا توجد مشاركات بعد. اضغط على زر «للمجلس» في صفحة الرؤى لمشاركة أول رؤية."
                : 'No shares yet. Click the "Council" button on any insight card to start a thread.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {sharedDiscussions.map((d) => (
                <li
                  key={d.id}
                  className="panel reveal"
                  style={{
                    padding: "14px 16px",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span
                      style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}
                    >
                      {d.sharedBy?.name ?? (ar ? "--" : "unknown")} ·{" "}
                      {new Date(d.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                    </span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
                        {d._count.replies} {ar ? "رد" : d._count.replies === 1 ? "reply" : "replies"}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", background: "rgba(100,90,80,.1)" }}>
                        {d.status === "OPEN"
                          ? ar ? "مفتوح" : "OPEN"
                          : ar ? "مغلق" : "CLOSED"}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--ink)",
                      marginBottom: 4,
                    }}
                  >
                    {d.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "var(--ink-muted)",
                      marginBottom: 8,
                    }}
                  >
                    {d.body}
                  </div>
                  {/* Phase V3-NEW-5 -- clear Open discussion CTA. */}
                  <Link
                    href={`/brain/council/discussion/${d.id}`}
                    className="dl-btn dl-btn-secondary"
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {ar ? "فتح النقاش" : "Open discussion"}
                    <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DaylightPanel>

        {/* Past sessions */}
        <DaylightPanel
          title={ar ? "جلسات سابقة" : "Past sessions"}
          aside={
            ar
              ? "كل جلسة محفوظة بالكامل بنصوصها وتوصيتها."
              : "Every session is preserved in full -- voices, recommendation, dissent."
          }
        >
          {recentSessions.length === 0 ? (
            <div
              className="py-8 text-center"
              style={{
                color: "var(--ink-muted)",
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
                    className="group flex items-start gap-3 px-4 py-3 transition"
                    style={{
                      background: "var(--cream)",
                      border: "1px solid var(--line)",
                      borderInlineStart:
                        s.status === "FAILED"
                          ? "2px solid var(--brick)"
                          : s.status === "RUNNING"
                            ? "2px solid var(--gold)"
                            : "2px solid var(--emerald)",
                      textDecoration: "none",
                      color: "var(--ink)",
                      borderRadius: 12,
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
                          color: "var(--ink)",
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
                          color: "var(--ink-muted)",
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
                        <span style={{ color: "var(--line)" }}>·</span>
                        <span>{s._count.voices} {ar ? "صوت" : "voices"}</span>
                        {typeof s.confidence === "number" ? (
                          <>
                            <span style={{ color: "var(--line)" }}>·</span>
                            <span>
                              {ar ? "ثقة" : "conf"} {(s.confidence * 100).toFixed(0)}%
                            </span>
                          </>
                        ) : null}
                        {s.usedLiveLlm ? (
                          <>
                            <span style={{ color: "var(--line)" }}>·</span>
                            <span style={{ color: "var(--gold)" }}>LIVE</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <ChevronLeft
                      className="mt-1 h-4 w-4 shrink-0 transition rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                      style={{ color: "var(--gold)" }}
                      strokeWidth={1.5}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DaylightPanel>
    </DaylightShell>
  );
}
