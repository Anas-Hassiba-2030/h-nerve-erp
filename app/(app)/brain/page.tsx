// /brain — The Brain Intelligence Hub.
//
// Command center showing all subsystem status, Brain IQ, mode badge,
// and navigation to every brain sub-surface.
// Heritage Modern vocabulary throughout.

import Link from "next/link";
import {
  Brain, Network, Zap, Users, BookOpen, Heart, GraduationCap, Globe2,
  Trophy, ArrowRight, CheckCircle2, AlertCircle, Cpu, Sparkles,
  GitBranch, ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection } from "@/components/heritage";
import { BrainStatusBadge } from "@/components/BrainStatusBadge";
import { HeriKpi } from "@/components/HeriKpi";
import { prisma } from "@/lib/db";
import { computeIQ } from "@/lib/brain/meta.reflector";
import { llmConfig } from "@/lib/brain/llm";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber } from "@/lib/utils";

export default async function BrainPage() {
  const locale = getLocale();
  const ar = locale === "ar";
  const cfg = llmConfig();

  const [iq, totalInsights, totalPlans, totalMemories, totalSessions, drafts] = await Promise.all([
    computeIQ("default").catch(() => null),
    prisma.aIInsight.count({ where: { deletedAt: null } }),
    prisma.plan.count(),
    prisma.memory.count(),
    prisma.councilSession.count({ where: { status: "DONE" } }),
    prisma.selfTuningReport.count({ where: { status: "DRAFT" } }),
  ]);

  const subsystems: Array<{
    href: string;
    icon: any;
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    status: "live" | "hybrid" | "stub";
    hint?: string;
  }> = [
    {
      href: "/brain/graph",
      icon: Network,
      labelAr: "الرسم السببي",
      labelEn: "Causal graph",
      descAr: "شبكة تأثيرات الكيانات — كل قرار له ثقله وأثره.",
      descEn: "Entity impact network — every decision carries weight and downstream effect.",
      status: "live",
    },
    {
      href: "/brain/scenarios",
      icon: Zap,
      labelAr: "محاكي القرارات",
      labelEn: "What-if simulator",
      descAr: "أدخل تغييراً وشاهد موجة الأثر تنتشر في الرسم خلال ثوانٍ.",
      descEn: "Enter a perturbation and watch the impact wave propagate in real time.",
      status: "live",
    },
    {
      href: "/brain/council",
      icon: Users,
      labelAr: "مجلس الخبراء",
      labelEn: "Expert council",
      descAr: "خمسة وكلاء متخصصون يناقشون القرار — المشرف يُصنّع التوصية.",
      descEn: "Five specialist agents debate a decision — the moderator synthesizes a recommendation.",
      status: cfg.enabled ? "live" : "hybrid",
      hint: cfg.enabled ? undefined : ar ? "يعمل بنمط هيكلي" : "running in stub mode",
    },
    {
      href: "/brain/narrate",
      icon: ScrollText,
      labelAr: "الراوي",
      labelEn: "Narrator",
      descAr: "يحوّل الأرقام والبيانات إلى نصوص تحريرية راقية بالعربية والإنجليزية.",
      descEn: "Turns raw numbers and data into bilingual editorial prose.",
      status: cfg.enabled ? "live" : "hybrid",
    },
    {
      href: "/brain/memory",
      icon: Heart,
      labelAr: "بحيرة الذاكرة",
      labelEn: "Memory lake",
      descAr: "كل موقف اجتاز النظام يُحفظ — يُستحضر لاحقاً عند التشابه.",
      descEn: "Every situation the system faced is stored and recalled when analogous events arise.",
      status: "live",
      hint: formatNumber(totalMemories) + (ar ? " ذكرى" : " memories"),
    },
    {
      href: "/insights",
      icon: Sparkles,
      labelAr: "الإشارات",
      labelEn: "Insights",
      descAr: "التنبيهات والفرص التي يكتشفها النظام تلقائياً عبر الشركات.",
      descEn: "Alerts and opportunities auto-discovered across the group.",
      status: "live",
      hint: formatNumber(totalInsights) + (ar ? " إشارة" : " insights"),
    },
    {
      href: "/brain/learning",
      icon: GraduationCap,
      labelAr: "ما تعلّمتُه",
      labelEn: "What I've learned",
      descAr: "سجل التغذية الراجعة — كيف يُحسّن النظام ذاته من ردود أفعال المستخدمين.",
      descEn: "Feedback log — how the system improves from user reactions over time.",
      status: "live",
    },
    {
      href: "/brain/self-tuning",
      icon: GitBranch,
      labelAr: "الضبط الذاتي",
      labelEn: "Self-tuning",
      descAr: "تقارير مقترحة لضبط الأوزان والتوجيهات — تحتاج مراجعة قبل التطبيق.",
      descEn: "Proposed weight and prompt adjustments — require human review before committing.",
      status: "live",
      hint: drafts > 0 ? (ar ? `${formatNumber(drafts)} قيد المراجعة` : `${formatNumber(drafts)} pending`) : undefined,
    },
    {
      href: "/brain/iq",
      icon: Trophy,
      labelAr: "ذكاء الدماغ",
      labelEn: "Brain IQ",
      descAr: "رقم واحد يلخّص الأداء. يصعد مع التحسّن، ينزل مع التراجع.",
      descEn: "One number summarizing performance. Rises with accuracy; falls with degradation.",
      status: "live",
      hint: iq ? `IQ ${Math.round(iq.score * 100)}` : undefined,
    },
    {
      href: "/brain/benchmarks",
      icon: Globe2,
      labelAr: "معايير النظراء",
      labelEn: "Peer benchmarks",
      descAr: "مقارنة مجهولة الهوية مع أنماط المجموعات المماثلة عبر المستأجرين.",
      descEn: "Anonymized comparison against patterns from similar groups across tenants.",
      status: "hybrid",
    },
  ];

  const STATUS_STYLE: Record<string, { label: string; labelAr: string; cls: string; dot: string }> = {
    live:   { label: "LIVE",   labelAr: "مباشر",     cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
    hybrid: { label: "HYBRID", labelAr: "جزئي",      cls: "bg-amber-50 text-amber-700 ring-amber-200",       dot: "bg-amber-400"   },
    stub:   { label: "STUB",   labelAr: "هيكلي",     cls: "bg-slate-50 text-slate-500 ring-slate-200",       dot: "bg-slate-400"   },
  };

  const liveCnt  = subsystems.filter((s) => s.status === "live").length;
  const plansDone = await prisma.plan.count({ where: { status: "DONE" } });

  return (
    <>
      <PageHeader
        eyebrow={ar ? "الدماغ · مركز التحكم" : "Brain · Control center"}
        title={ar ? "طبقة ذكاء H-Nerve" : "H-Nerve intelligence layer"}
        subtitle={
          ar
            ? "رسم سببي، محاكاة القرارات، مجلس الخبراء، الذاكرة، التخطيط، والتحسّن الذاتي — كل شيء من مكان واحد."
            : "Causal graph, decision simulation, expert council, memory, planning, and self-improvement — all in one place."
        }
      />

      <PageContainer>
        {/* Mode banner */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          style={{ background: "var(--heri-cream-2)", border: "1px solid var(--heri-rule-strong)" }}
        >
          <div className="flex items-center gap-3">
            <Brain className="h-4 w-4" style={{ color: "var(--heri-ochre)" }} strokeWidth={1.5} />
            <span className="heri-eyebrow heri-eyebrow-ink">
              {ar ? "وضع التشغيل" : "Operating mode"}
            </span>
            <BrainStatusBadge />
          </div>
          {!cfg.enabled && (
            <p className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
              {ar
                ? "أضف ANTHROPIC_API_KEY إلى .env لتفعيل النمط الحي مع Claude."
                : "Set ANTHROPIC_API_KEY in .env to enable live mode with Claude."}
            </p>
          )}
        </div>

        {/* KPI band */}
        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi
            label={ar ? "أنظمة فرعية حية" : "Live subsystems"}
            raw={liveCnt}
            kind="number"
            hint={`${formatNumber(subsystems.length)} ${ar ? "إجمالي" : "total"}`}
          />
          <HeriKpi
            label={ar ? "جلسات المجلس" : "Council sessions"}
            raw={totalSessions}
            kind="number"
            hint={ar ? "جلسة مكتملة" : "completed"}
          />
          <HeriKpi
            label={ar ? "خطط العمل" : "Action plans"}
            raw={totalPlans}
            kind="number"
            hint={`${formatNumber(plansDone)} ${ar ? "مكتملة" : "done"}`}
          />
          <HeriKpi
            label={ar ? "ذكاء الدماغ" : "Brain IQ"}
            raw={iq ? Math.round(iq.score * 100) : 50}
            kind="number"
            hint={iq ? (ar ? `اتجاه: ${iq.trend === "rising" ? "صاعد" : iq.trend === "falling" ? "هابط" : "ثابت"}` : `trend: ${iq.trend}`) : (ar ? "لا بيانات" : "no data")}
            accent={iq && iq.trend === "rising" ? "var(--heri-teal)" : undefined}
          />
        </section>

        {/* Subsystem grid */}
        <HeritageSection
          eyebrow={ar ? "الأنظمة الفرعية" : "Subsystems"}
          title={ar ? "مكوّنات الدماغ" : "Brain components"}
          aside={
            ar
              ? "كل نظام فرعي مستقل وقابل للاختبار. انقر للدخول."
              : "Each subsystem is independent and testable. Click to explore."
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subsystems.map((s) => {
              const Icon = s.icon;
              const style = STATUS_STYLE[s.status];
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group block"
                  style={{
                    background: "var(--heri-cream)",
                    border: "1px solid var(--heri-rule)",
                    padding: "18px 20px",
                    transition: "border-color 150ms, box-shadow 150ms",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center"
                      style={{
                        border: "1px solid var(--heri-rule)",
                        background: "var(--heri-cream-2)",
                        color: "var(--heri-ochre)",
                      }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-widest ring-1 ${style.cls}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {ar ? style.labelAr : style.label}
                    </span>
                  </div>
                  <h3
                    className="mt-3 text-[14px] font-semibold leading-tight"
                    style={{ color: "var(--heri-ink)" }}
                  >
                    {ar ? s.labelAr : s.labelEn}
                  </h3>
                  <p
                    className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed"
                    style={{ color: "var(--heri-ink-2)" }}
                  >
                    {ar ? s.descAr : s.descEn}
                  </p>
                  {s.hint ? (
                    <div
                      className="mt-2.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--heri-ink-3)" }}
                    >
                      {s.hint}
                    </div>
                  ) : null}
                  <div
                    className="mt-3 flex items-center gap-1 text-[10.5px] font-semibold"
                    style={{ color: "var(--heri-ochre-2)" }}
                  >
                    {ar ? "استكشاف" : "Explore"}
                    <ArrowRight className="h-3 w-3 rtl:rotate-180" strokeWidth={2} />
                  </div>
                </Link>
              );
            })}
          </div>
        </HeritageSection>

        {/* How the brain works */}
        <HeritageSection
          eyebrow={ar ? "البنية" : "Architecture"}
          title={ar ? "كيف يعمل الدماغ" : "How the brain works"}
          aside={
            ar
              ? "دورة حياة كاملة: من البيانات إلى القرار إلى التعلّم."
              : "A full lifecycle: from data to decision to learning."
          }
        >
          <div className="grid gap-px" style={{ background: "var(--heri-rule)" }}>
            {[
              {
                step: "1",
                titleAr: "رسم الكيانات",
                titleEn: "Entity mapping",
                bodyAr: "كل فندق ومزرعة وشركة ودفعة إنتاج هي عقدة في الرسم السببي. العلاقات تحمل أوزاناً (مثلاً: إشغال الفندق → الإيراد بوزن 0.7).",
                bodyEn: "Every hotel, farm, company, and batch is a node in the causal graph. Edges carry weights (e.g. hotel occupancy → revenue at weight 0.7).",
              },
              {
                step: "2",
                titleAr: "المحاكاة",
                titleEn: "Simulation",
                bodyAr: "محرك BFS يضخ تغييراً في عقدة ويتابع موجة الأثر على عمق 5 خطوات مع تخفيف بـ 0.92 لكل مستوى.",
                bodyEn: "A BFS engine injects a change at a node and tracks the impact wave up to 5 hops deep, attenuating by 0.92 per level.",
              },
              {
                step: "3",
                titleAr: "المجلس والراوي",
                titleEn: "Council & narrator",
                bodyAr: "خمسة وكلاء (ضيافة، ألبان، زراعة، مالية، مخاطر) يناقشون — المشرف يُصنّع — الراوي يُترجم لغةً راقية.",
                bodyEn: "Five agents (hospitality, dairy, agri, finance, risk) debate — the moderator synthesizes — the narrator produces editorial prose.",
              },
              {
                step: "4",
                titleAr: "التخطيط والتغذية الراجعة",
                titleEn: "Planning & feedback",
                bodyAr: "الإشارات تتحوّل إلى خطط قابلة للتنفيذ. كل رد فعل من المستخدم (حلّ، رفض، تجاهل) يُسجَّل كإشارة تعلّم.",
                bodyEn: "Insights become committable plans. Every user reaction (resolve, dismiss, override) is logged as a learning signal.",
              },
              {
                step: "5",
                titleAr: "الضبط الذاتي",
                titleEn: "Self-tuning",
                bodyAr: "المنعكس الأعلى يحسب درجة IQ أسبوعياً، يقترح ضبط الأوزان، ينتظر موافقة المستخدم قبل التطبيق.",
                bodyEn: "The meta-reflector computes the IQ score weekly, proposes weight adjustments, and waits for human approval before committing.",
              },
            ].map((row) => (
              <div
                key={row.step}
                className="grid gap-4 p-5 sm:grid-cols-[40px_1fr]"
                style={{ background: "var(--heri-cream)" }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-[11px] font-black"
                  style={{
                    border: "1px solid var(--heri-rule-strong)",
                    color: "var(--heri-ochre-2)",
                    background: "var(--heri-cream-2)",
                    fontFamily: "'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace",
                    letterSpacing: "0.04em",
                  }}
                >
                  {row.step}
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold" style={{ color: "var(--heri-ink)" }}>
                    {ar ? row.titleAr : row.titleEn}
                  </h4>
                  <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--heri-ink-2)" }}>
                    {ar ? row.bodyAr : row.bodyEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </HeritageSection>

        {drafts > 0 && (
          <div
            className="flex items-center justify-between gap-4 px-5 py-4"
            style={{ background: "var(--heri-cream-2)", border: "1px solid var(--heri-ochre-2)", borderInlineStart: "3px solid var(--heri-ochre)" }}
          >
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--heri-ink)" }}>
                {ar ? `${formatNumber(drafts)} تقرير ضبط قيد المراجعة` : `${formatNumber(drafts)} self-tuning report${drafts > 1 ? "s" : ""} pending review`}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--heri-ink-3)" }}>
                {ar ? "راجع التوصيات قبل التطبيق." : "Review proposals before they take effect."}
              </p>
            </div>
            <Link href="/brain/self-tuning" className="heri-btn heri-btn-primary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              {ar ? "مراجعة" : "Review"}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
        )}
      </PageContainer>
    </>
  );
}
