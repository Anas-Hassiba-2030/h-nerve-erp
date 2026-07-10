// /brain/council — convene a new council, browse past sessions.
//
// Aesthetic: the ORIGINAL "Claude Design" cosmic-orbit look. The hero frames
// the question on a night-emerald field (the same co-intro / co-question
// treatment the transcript uses); KPIs, shared threads, and the archive sit on
// the cream Daylight surface below.
//
// Phase 3 of docs/governance/PHASES-INTELLIGENCE.md.

import Link from "next/link";
import {
  DaylightShell,
  DaylightKpiGrid,
  DaylightKpi,
  DaylightPanel,
} from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { formatNumber } from "@/lib/utils/utils";
import { llmConfig } from "@/lib/brain/llm";
import { ChevronLeft, Bookmark, BookmarkCheck, BookOpen } from "lucide-react";
import { convene, togglePin } from "./actions";
import { conveneFromDiscussion } from "@/app/actions/council";
import { CouncilStage } from "./CouncilStage";
import { CouncilBrief } from "@/components/brain/CouncilBrief";
import { ConveneSubmit } from "@/components/brain/ConveneSubmit";
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

type SessionRowData = {
  id: string;
  topic: string;
  ranAt: Date;
  status: string;
  confidence: number | null;
  usedLiveLlm: boolean;
  pinned: boolean;
  _count: { voices: number };
};

// One archive row. The whole card is NOT a single <Link> — the title is the
// link, and Save / Theater are separate controls on their own action row. A
// button/form/anchor nested inside an <a> is invalid markup and throws a
// hydration error, so they live as siblings, not children.
function SessionRow({ s, ar }: { s: SessionRowData; ar: boolean }) {
  const when = new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(s.ranAt);

  return (
    <li>
      <div
        style={{
          background: "var(--ivory)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          borderInlineStart:
            s.status === "FAILED"
              ? "2px solid var(--brick)"
              : s.status === "RUNNING"
                ? "2px solid var(--gold)"
                : "2px solid var(--sage)",
          padding: "13px 16px",
        }}
      >
        <Link
          href={`/brain/council/${s.id}`}
          className="group"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
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
              {s.pinned ? (
                <>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--gold)", fontWeight: 700 }}>
                    <BookmarkCheck className="h-3 w-3" strokeWidth={2} />
                    {ar ? "محفوظة" : "Saved"}
                  </span>
                  <span style={{ color: "var(--line)" }}>·</span>
                </>
              ) : null}
              <span>{when}</span>
              <span style={{ color: "var(--line)" }}>·</span>
              <span>{s._count.voices} {ar ? "صوت" : "voices"}</span>
              {typeof s.confidence === "number" ? (
                <>
                  <span style={{ color: "var(--line)" }}>·</span>
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

        {/* action row — Save (pin) + Open in Theater, siblings of the link */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 11,
            paddingTop: 11,
            borderTop: "1px solid var(--line)",
          }}
        >
          <form action={togglePin}>
            <input type="hidden" name="id" value={s.id} />
            <button
              type="submit"
              className="dl-btn dl-btn-secondary"
              style={{
                fontSize: 12,
                padding: "5px 11px",
                ...(s.pinned ? { borderColor: "var(--gold)", color: "#fff" } : {}),
              }}
            >
              {s.pinned ? <BookmarkCheck className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {s.pinned ? (ar ? "محفوظة" : "Saved") : (ar ? "احفظ" : "Save")}
            </button>
          </form>
          <Link
            href={`/theater/council/${s.id}`}
            className="dl-btn dl-btn-secondary"
            style={{ fontSize: 12, padding: "5px 11px", textDecoration: "none" }}
          >
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
            {ar ? "افتح في المسرح" : "Open in Theater"}
          </Link>
        </div>
      </div>
    </li>
  );
}

export default async function BrainCouncilIndex() {
  const locale = await getLocale();
  const ar = locale === "ar";

  // Phase V3-P5 — operator-shared CouncilDiscussion threads render
  // above the system CouncilSession deliberations. Tenant-scoped via
  // workspaceScope middleware.
  const [recentSessions, openCount, llmEnabled, sharedDiscussions, totalSessions, avgConfRaw] = await Promise.all([
    prisma.councilSession.findMany({
      orderBy: [{ pinned: "desc" }, { ranAt: "desc" }],
      take: 20,
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

  // Subject choices for the "what should the council debate?" picker. Choosing a
  // company fences the sub-agents to that unit only (no cross-contamination).
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, nameEn: true },
    orderBy: { name: "asc" },
  });

  const topics = ar ? SUGGESTED_TOPICS_AR : SUGGESTED_TOPICS_EN;

  // Saved (pinned) sessions get their own home so "where did my save go?" has a
  // clear answer; the rest fall under "Past sessions" (filtered out of here so a
  // saved session never lists twice).
  const savedSessions = recentSessions.filter((s) => s.pinned);
  const pastSessions = recentSessions.filter((s) => !s.pinned);

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

        <CouncilBrief
          convene={convene}
          companies={companies}
          ar={ar}
          llmEnabled={llmEnabled}
          runningCount={openCount}
          suggestions={topics}
        />
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    href={`/brain/council/discussion/${d.id}`}
                    className="dl-btn dl-btn-secondary"
                    style={{ fontSize: 12, padding: "6px 12px" }}
                  >
                    {ar ? "فتح النقاش" : "Open discussion"}
                    <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                  </Link>
                  {/* Context-isolated debate — convene the specialist sub-agents
                      fenced on JUST this shared subject. */}
                  <form action={conveneFromDiscussion}>
                    <input type="hidden" name="discussionId" value={d.id} />
                    <ConveneSubmit
                      className="dl-btn dl-btn-primary"
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      label={ar ? "✦ ناقش بالوكلاء" : "✦ Debate with sub-agents"}
                      pendingLabel={ar ? "…يجمع الوكلاء" : "Convening agents…"}
                    />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DaylightPanel>

      {/* ── Saved ──────────────────────────────────────────────────────── */}
      {savedSessions.length > 0 ? (
        <DaylightPanel
          title={ar ? "★ المحفوظة" : "★ Saved"}
          aside={
            ar
              ? "الجلسات التي حفظتها — تظهر هنا أولاً. اضغط «احفظ» على أي جلسة لتضيفها."
              : "Sessions you saved land here first. Hit Save on any session to add it."
          }
        >
          <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {savedSessions.map((s) => (
              <SessionRow key={s.id} s={s} ar={ar} />
            ))}
          </ul>
        </DaylightPanel>
      ) : null}

      {/* ── Past sessions ──────────────────────────────────────────────── */}
      <DaylightPanel
        title={ar ? "جلسات سابقة" : "Past sessions"}
        aside={
          ar
            ? "كل جلسة محفوظة بالكامل بنصوصها وتوصيتها."
            : "Every session is preserved in full — voices, recommendation, dissent."
        }
      >
        {pastSessions.length === 0 ? (
          <div
            style={{
              padding: "26px 0",
              textAlign: "center",
              color: "var(--ink-muted)",
              fontStyle: "italic",
              fontSize: 13,
            }}
          >
            {savedSessions.length > 0
              ? ar ? "كل الجلسات محفوظة." : "Every session is saved."
              : ar ? "لم تُعقد جلسات بعد." : "No sessions yet."}
          </div>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pastSessions.map((s) => (
              <SessionRow key={s.id} s={s} ar={ar} />
            ))}
          </ul>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
