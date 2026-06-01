import Link from "next/link";
import {
  Network, Zap, Users, Heart, GraduationCap, Globe2, Trophy, ArrowRight,
  Sparkles, GitBranch, Activity, TrendingUp,
} from "lucide-react";
import { BrainStatusBadge } from "@/components/BrainStatusBadge";
import { DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db";
import { computeIQ } from "@/lib/brain/meta.reflector";
import { llmConfig } from "@/lib/brain/llm";
import { getLocale } from "@/lib/i18n.server";
import { formatNumber } from "@/lib/utils";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function BrainPage() {
  const ar = getLocale() === "ar";
  const cfg = llmConfig();

  const [iq, totalInsights, totalPlans, plansDone, totalMemories, totalSessions, drafts] = await Promise.all([
    computeIQ("default").catch(() => null),
    prisma.aIInsight.count({ where: { deletedAt: null } }),
    prisma.plan.count(),
    prisma.plan.count({ where: { status: "DONE" } }),
    prisma.memory.count(),
    prisma.councilSession.count({ where: { status: "DONE" } }),
    prisma.selfTuningReport.count({ where: { status: "DRAFT" } }),
  ]);

  const iqScore = iq ? Math.round(iq.score) : 50;
  const trendLabel = iq ? (ar ? (iq.trend === "rising" ? "صاعد" : iq.trend === "falling" ? "هابط" : "ثابت") : iq.trend) : (ar ? "لا بيانات" : "no data");

  const subsystems: Array<{ href: string; icon: any; ar: string; en: string; descAr: string; descEn: string; status: "live" | "hybrid"; hint?: string }> = [
    { href: "/brain/graph", icon: Network, ar: "الرسم السببي", en: "Causal graph", descAr: "شبكة تأثيرات الكيانات — كل قرار له ثقله وأثره.", descEn: "Entity impact network — every decision carries weight and downstream effect.", status: "live" },
    { href: "/brain/scenarios", icon: Zap, ar: "محاكي القرارات", en: "What-if simulator", descAr: "أدخل تغييراً وشاهد موجة الأثر تنتشر في ثوانٍ.", descEn: "Inject a change and watch the impact wave propagate in real time.", status: "live" },
    { href: "/brain/council", icon: Users, ar: "مجلس الخبراء", en: "Expert council", descAr: "خمسة وكلاء يناقشون — المشرف يُصنّع التوصية.", descEn: "Five specialist agents debate — the moderator synthesizes.", status: cfg.enabled ? "live" : "hybrid" },
    { href: "/brain/memory", icon: Heart, ar: "بحيرة الذاكرة", en: "Memory lake", descAr: "كل موقف يُحفظ ويُستحضر عند التشابه.", descEn: "Every situation is stored and recalled when analogous events arise.", status: "live", hint: formatNumber(totalMemories) + (ar ? " ذكرى" : " memories") },
    { href: "/insights", icon: Sparkles, ar: "الإشارات", en: "Insights", descAr: "تنبيهات وفرص يكتشفها النظام عبر الشركات.", descEn: "Alerts and opportunities auto-discovered across the group.", status: "live", hint: formatNumber(totalInsights) + (ar ? " إشارة" : " insights") },
    { href: "/brain/learning", icon: GraduationCap, ar: "ما تعلّمتُه", en: "What I've learned", descAr: "كيف يُحسّن النظام ذاته من ردود أفعال المستخدمين.", descEn: "How the system improves from user reactions over time.", status: "live" },
    { href: "/brain/self-tuning", icon: GitBranch, ar: "الضبط الذاتي", en: "Self-tuning", descAr: "تقارير ضبط الأوزان — تحتاج مراجعة قبل التطبيق.", descEn: "Proposed weight/prompt adjustments — require review before committing.", status: "live", hint: drafts > 0 ? (ar ? `${formatNumber(drafts)} قيد المراجعة` : `${formatNumber(drafts)} pending`) : undefined },
    { href: "/brain/iq", icon: Trophy, ar: "ذكاء الدماغ", en: "Brain IQ", descAr: "رقم واحد يلخّص الأداء. يصعد مع التحسّن.", descEn: "One number summarizing performance. Rises with accuracy.", status: "live", hint: `IQ ${iqScore}` },
    { href: "/brain/benchmarks", icon: Globe2, ar: "معايير النظراء", en: "Peer benchmarks", descAr: "مقارنة مجهولة الهوية عبر المستأجرين.", descEn: "Anonymized comparison across tenants.", status: "hybrid" },
  ];
  const liveCnt = subsystems.filter((s) => s.status === "live").length;

  const steps = [
    { n: "1", ar: "رسم الكيانات", en: "Entity mapping", bAr: "كل فندق ومزرعة وشركة ودفعة هي عقدة في الرسم السببي بأوزان للعلاقات.", bEn: "Every hotel, farm, company, and batch is a node in the causal graph; edges carry weights." },
    { n: "2", ar: "المحاكاة", en: "Simulation", bAr: "محرك BFS يضخ تغييراً ويتابع موجة الأثر على عمق ٥ خطوات.", bEn: "A BFS engine injects a change and tracks the impact wave up to 5 hops deep." },
    { n: "3", ar: "المجلس والراوي", en: "Council & narrator", bAr: "خمسة وكلاء يناقشون، المشرف يُصنّع، الراوي يُترجم لغةً راقية.", bEn: "Five agents debate, the moderator synthesizes, the narrator writes editorial prose." },
    { n: "4", ar: "التخطيط والتغذية الراجعة", en: "Planning & feedback", bAr: "الإشارات تتحوّل إلى خطط، وكل رد فعل يُسجَّل كإشارة تعلّم.", bEn: "Insights become plans; every reaction is logged as a learning signal." },
    { n: "5", ar: "الضبط الذاتي", en: "Self-tuning", bAr: "المنعكس يحسب IQ أسبوعياً ويقترح ضبط الأوزان بانتظار الموافقة.", bEn: "The meta-reflector computes IQ weekly and proposes weight tweaks pending approval." },
  ];

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "العقل · مركز التحكم" : "The Brain · Control center"}
        title={ar ? "طبقة ذكاء H-Nerve" : "H-Nerve Intelligence Layer"}
        subtitle={ar ? "رسم سببي، محاكاة، مجلس خبراء، ذاكرة، تخطيط، وتحسّن ذاتي — من مكان واحد." : "Causal graph, simulation, expert council, memory, planning, and self-improvement — all in one place."}
        status={<><BrainStatusBadge /></>}
      />

      {/* cosmic IQ hero */}
      <div className="reveal" style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "28px 30px", marginBottom: 22, background: "radial-gradient(120% 140% at 16% 10%, #143229 0%, #0D1F1A 55%, #0a1813 100%)", border: "1px solid rgba(194,163,90,.3)", boxShadow: "0 18px 50px -28px rgba(13,31,26,.8)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(40% 60% at 80% 30%, rgba(194,163,90,.18), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "rgba(246,241,231,.7)" }}><Activity className="h-3.5 w-3.5" />{ar ? "حالة الدماغ الحية" : "Live brain status"}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "rgba(246,241,231,.55)" }}>{ar ? "ذكاء الدماغ" : "Brain IQ"}</div>
                <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: "#F6F1E7", fontVariantNumeric: "tabular-nums" }}>{iqScore}</div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: "#DCC38A" }}><TrendingUp className="h-3.5 w-3.5" />{ar ? "الاتجاه" : "trend"}: {trendLabel}</span>
            </div>
          </div>
          <Link href="/brain/iq" style={{ borderRadius: 999, padding: "9px 18px", fontSize: 13, fontWeight: 700, color: "#F6F1E7", border: "1px solid rgba(194,163,90,.4)", background: "rgba(194,163,90,.14)" }}>{ar ? "تفاصيل الذكاء ←" : "IQ details →"}</Link>
        </div>
      </div>

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "أنظمة فرعية حية" : "Live subsystems"} value={formatNumber(liveCnt)} hint={`${formatNumber(subsystems.length)} ${ar ? "إجمالي" : "total"}`} />
        <DaylightKpi label={ar ? "جلسات المجلس" : "Council sessions"} value={formatNumber(totalSessions)} hint={ar ? "مكتملة" : "completed"} />
        <DaylightKpi label={ar ? "خطط العمل" : "Action plans"} value={formatNumber(totalPlans)} hint={`${formatNumber(plansDone)} ${ar ? "مكتملة" : "done"}`} />
        <DaylightKpi label={ar ? "ذكاء الدماغ" : "Brain IQ"} value={formatNumber(iqScore)} hint={`${ar ? "الاتجاه" : "trend"}: ${trendLabel}`} delta={iq && iq.trend === "rising" ? { dir: "up", text: ar ? "صاعد" : "rising" } : undefined} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "مكوّنات الدماغ" : "Brain subsystems"} aside={ar ? "كل نظام مستقل وقابل للاختبار" : "Each subsystem independent + testable"}>
        <div className="prop-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {subsystems.map((s) => (
            <Link key={s.href} href={s.href} className="prop-card" style={{ display: "block" }}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ borderRadius: 10, padding: 10, background: "rgba(46,107,87,.1)" }}><s.icon className="h-5 w-5" style={{ color: "var(--emerald)" }} /></div>
                <span className={`tag ${s.status === "live" ? "ok" : "gold"}`}>{s.status === "live" ? (ar ? "مباشر" : "LIVE") : (ar ? "جزئي" : "HYBRID")}</span>
              </div>
              <h3 style={{ marginTop: 12, fontWeight: 700, color: "var(--ink)" }}>{ar ? s.ar : s.en}</h3>
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>{ar ? s.descAr : s.descEn}</p>
              {s.hint ? <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-muted)" }}>{s.hint}</div> : null}
            </Link>
          ))}
        </div>
      </DaylightPanel>

      <DaylightPanel title={ar ? "كيف يعمل الدماغ" : "How the brain works"} aside={ar ? "من البيانات إلى القرار إلى التعلّم" : "From data to decision to learning"}>
        <div className="space-y-2">
          {steps.map((row) => (
            <div key={row.n} className="grid gap-4" style={{ gridTemplateColumns: "36px 1fr", padding: "12px 4px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 28, width: 28, borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "var(--emerald)", background: "var(--ivory)", border: "1px solid var(--line)" }}>{row.n}</div>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{ar ? row.ar : row.en}</h4>
                <p style={{ marginTop: 2, fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>{ar ? row.bAr : row.bEn}</p>
              </div>
            </div>
          ))}
        </div>
      </DaylightPanel>

      {drafts > 0 ? (
        <div className="panel reveal" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderInlineStart: "3px solid var(--gold)" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{ar ? `${formatNumber(drafts)} تقرير ضبط قيد المراجعة` : `${formatNumber(drafts)} self-tuning report(s) pending review`}</p>
            <p style={{ marginTop: 2, fontSize: 11, color: "var(--ink-muted)" }}>{ar ? "راجع التوصيات قبل التطبيق." : "Review proposals before they take effect."}</p>
          </div>
          <Link href="/brain/self-tuning" className="dl-btn dl-btn-primary">{ar ? "مراجعة" : "Review"}<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></Link>
        </div>
      ) : null}
    </DaylightShell>
  );
}
