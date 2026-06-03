// /brain/council — convene a new council, browse past sessions.
//
// Aesthetic: the ORIGINAL "Claude Design" cosmic-orbit look. The hero frames
// the question on a night-emerald field (the same co-intro / co-question
// treatment the transcript uses); KPIs, shared threads, and the archive sit on
// the cream Daylight surface below.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import {
  DaylightShell,
  DaylightKpiGrid,
  DaylightKpi,
  DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber } from "@/lib/utils";
import { llmConfig } from "@/lib/brain/llm";
import { Users2, ChevronLeft, MessagesSquare, ArrowRight } from "lucide-react";
import { convene } from "./actions";
import { CouncilStage } from "./CouncilStage";
import { TrustChip } from "@/components/brain/TrustChip";
import "../../daylight.css";
import "./council-design.css";

export const dynamic = "force-dynamic";

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
      {/* ── Hero — the live cosmic debate stage (verbatim from council.html) ── */}
      <div className="co-wrap reveal">
        <div className="co-ribbon">
          <div className="co-title-box">
            <span className="eb">
              <span className="tick" />
              {ar ? "الذكاء التشغيلي" : "Operational intelligence"}
            </span>
            <h1>{ar ? "المجلس" : "Council"}</h1>
          </div>
          <div className="co-intro">
            {ar
              ? "خمسة مستشارين متخصّصين يتناظرون حول قرار حيّ. يستمع الدماغ، يوازن الحجج، ثم يصوغ التوصية النهائية."
              : "Five specialists debate a live decision. The brain listens, weighs, then frames the recommendation."}
          </div>
        </div>

        <CouncilStage ar={ar} />
      </div>

      {/* ── Pose a new question ─────────────────────────────────────────── */}
      <div className="co-wrap reveal" style={{ marginTop: 22 }}>
        <div className="co-question">
          <div className="q-glow" />
          <div className="lbl">{ar ? "ابدأ من هنا" : "Start here"}</div>
          <h2>{ar ? "اطرح قراراً جديداً على المجلس." : "Pose a new decision to the council."}</h2>
        </div>

        <form
          action={convene}
          style={{ maxWidth: 760, margin: "0 auto" }}
        >
          <label
            htmlFor="topic"
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--gold-soft)",
              marginBottom: 8,
            }}
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
            style={{
              width: "100%",
              background: "rgba(13,31,26,.45)",
              border: "1px solid rgba(194,163,90,.3)",
              borderRadius: 14,
              padding: "13px 16px",
              fontFamily:
                "'Inter Tight','Inter','IBM Plex Sans Arabic',system-ui,sans-serif",
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "rgba(246,241,231,.95)",
              resize: "vertical",
            }}
          />
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 14,
            }}
          >
            <button type="submit" className="dl-btn dl-btn-primary">
              <Users2 className="h-4 w-4" strokeWidth={1.5} />
              {ar ? "اجتمع المجلس" : "Convene the council"}
            </button>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "rgba(246,241,231,.6)",
              }}
            >
              <MessagesSquare className="h-3 w-3" strokeWidth={1.5} />
              {llmEnabled
                ? (ar ? (<>حالة المحرك: مُتصِل بـ <bdi dir="ltr">Claude</bdi></>) : "Engine: live · Claude")
                : (ar ? "حالة المحرك: تحليلي محلي" : "Engine: on-device reasoning")}
            </span>
            {openCount > 0 ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  padding: "3px 11px",
                  borderRadius: 999,
                  color: "var(--gold-soft)",
                  background: "rgba(194,163,90,.18)",
                  border: "1px solid rgba(194,163,90,.3)",
                }}
              >
                {openCount} {ar ? "جلسة قيد التشغيل" : "running"}
              </span>
            ) : null}
          </div>
        </form>

        {/* Suggested topics — single-click prefills, on the night field */}
        <div style={{ maxWidth: 760, margin: "26px auto 0" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--gold-soft)",
              marginBottom: 12,
            }}
          >
            {ar ? "اقتراحات" : "Suggestions"}
          </div>
          <ul
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            {topics.map((t) => (
              <li key={t}>
                <form action={convene}>
                  <input type="hidden" name="topic" value={t} />
                  <button
                    type="submit"
                    className="group"
                    style={{
                      display: "flex",
                      width: "100%",
                      textAlign: "start",
                      gap: 8,
                      alignItems: "flex-start",
                      background: "rgba(20,46,38,.5)",
                      border: "1px solid rgba(194,163,90,.18)",
                      borderRadius: 12,
                      padding: "11px 14px",
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      color: "rgba(246,241,231,.82)",
                      cursor: "pointer",
                    }}
                  >
                    <ArrowRight
                      className="h-3 w-3 mt-1 shrink-0 rtl:rotate-180 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                      style={{ color: "var(--gold-soft)" }}
                      strokeWidth={1.5}
                    />
                    <span style={{ fontStyle: ar ? "normal" : "italic" }}>{t}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── KPI strip — the council's footprint at a glance ────────────── */}
      <DaylightKpiGrid>
        <DaylightKpi
          label={ar ? "مجموع الجلسات" : "Total sessions"}
          value={formatNumber(totalSessions)}
          hint={ar ? "كل الجلسات" : "all-time"}
        />
        <DaylightKpi
          label={ar ? "جلسات قيد التشغيل" : "Running"}
          value={formatNumber(openCount)}
          hint={ar ? "تتداول الآن" : "live now"}
        />
        <DaylightKpi
          label={ar ? "متوسط الثقة" : "Avg confidence"}
          value={`${Math.round(avgConfidence * 100)}%`}
          hint={ar ? "عبر التوصيات" : "across recs"}
        />
        <DaylightKpi
          label={ar ? "خيوط مفتوحة" : "Open threads"}
          value={formatNumber(openSharedCount)}
          hint={ar ? "مشاركات المدراء" : "operator shares"}
        />
      </DaylightKpiGrid>

      {/* ── Operator-shared threads (Phase V3-P5) ──────────────────────── */}
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
            style={{
              padding: "26px 0",
              textAlign: "center",
              color: "var(--ink-muted)",
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            {ar
              ? "لا توجد مشاركات بعد. اضغط على زر «للمجلس» في صفحة الرؤى لمشاركة أول رؤية."
              : "No shares yet. Click the “Council” button on any insight card to start a thread."}
          </div>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sharedDiscussions.map((d) => (
              <li
                key={d.id}
                style={{
                  background: "var(--ivory)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: ".04em",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {d.sharedBy?.name ?? (ar ? "—" : "unknown")} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString(ar ? "ar-JO" : "en-US")}
                  </span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`tag ${d._count.replies > 0 ? "ok" : "gold"}`}>
                      {d._count.replies} {ar ? "رد" : d._count.replies === 1 ? "reply" : "replies"}
                    </span>
                    <span className={`tag ${d.status === "OPEN" ? "gold" : "ok"}`}>
                      {d.status === "OPEN"
                        ? ar ? "مفتوح" : "OPEN"
                        : ar ? "مغلق" : "CLOSED"}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--dl-display)",
                    fontWeight: 600,
                    fontSize: 17,
                    color: "var(--emerald)",
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
                    marginBottom: 10,
                  }}
                >
                  {d.body}
                </div>
                <Link
                  href={`/brain/council/discussion/${d.id}`}
                  className="dl-btn dl-btn-secondary"
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  {ar ? "فتح النقاش" : "Open discussion"}
                  <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DaylightPanel>

      {/* ── Past sessions ──────────────────────────────────────────────── */}
      <DaylightPanel
        title={ar ? "جلسات سابقة" : "Past sessions"}
        aside={
          ar
            ? "كل جلسة محفوظة بالكامل بنصوصها وتوصيتها."
            : "Every session is preserved in full — voices, recommendation, dissent."
        }
      >
        {recentSessions.length === 0 ? (
          <div
            style={{
              padding: "26px 0",
              textAlign: "center",
              color: "var(--ink-muted)",
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            {ar ? "لم تُعقد جلسات بعد." : "No sessions yet."}
          </div>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentSessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/brain/council/${s.id}`}
                  className="group"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "13px 16px",
                    background: "var(--ivory)",
                    border: "1px solid var(--line)",
                    borderRadius: 14,
                    borderInlineStart:
                      s.status === "FAILED"
                        ? "2px solid var(--brick)"
                        : s.status === "RUNNING"
                          ? "2px solid var(--gold)"
                          : "2px solid var(--sage)",
                    textDecoration: "none",
                    color: "var(--ink)",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="line-clamp-2"
                      style={{
                        fontFamily: "var(--dl-display)",
                        fontSize: 17,
                        fontWeight: 600,
                        color: "var(--emerald)",
                        lineHeight: 1.25,
                      }}
                    >
                      {s.topic}
                    </div>
                    <div
                      style={{
                        marginTop: 7,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        letterSpacing: ".04em",
                        color: "var(--ink-muted)",
                        fontVariantNumeric: "tabular-nums",
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
                          {/* Phase 22 — trust-coded recommendation chip */}
                          <TrustChip score={s.confidence} locale={ar ? "ar" : "en"} />
                        </>
                      ) : null}
                      {s.usedLiveLlm ? (
                        <>
                          <span style={{ color: "var(--line)" }}>·</span>
                          <span style={{ color: "var(--gold)", fontWeight: 700 }}>LIVE</span>
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
