import Link from "next/link";
import { FlaskConical, Plus, Trash2, Calendar, User2, Target, Download, Rocket, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { HeriKpi } from "@/components/HeriKpi";
import { KpiCard } from "@/components/KpiCard";
import { CompanyCover } from "@/components/CompanyCover";
import { DeleteButton } from "@/components/DeleteButton";
import { SectorPill } from "@/components/SectorPill";
import { EmptyState } from "@/components/EmptyState";
import { ExportMenu } from "@/components/ExportMenu";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";
import { getCompanyBrand } from "@/lib/companyBrand";
import { deleteProject, setProjectStage } from "./actions";

const STAGE_ORDER = ["IDEA", "RESEARCH", "PLANNED", "APPROVED", "IN_PROGRESS", "ON_HOLD", "DONE"] as const;
const STAGE_AR: Record<string, string> = {
  IDEA: "فكرة",
  RESEARCH: "أبحاث",
  PLANNED: "مخطط",
  APPROVED: "معتمد",
  IN_PROGRESS: "قيد التنفيذ",
  ON_HOLD: "معلّق",
  DONE: "مكتمل",
};
const STAGE_TONE: Record<string, string> = {
  IDEA: "badge-slate",
  RESEARCH: "badge-blue",
  PLANNED: "badge-amber",
  APPROVED: "badge-violet",
  IN_PROGRESS: "badge-emerald",
  ON_HOLD: "badge-slate",
  DONE: "badge-emerald",
};
const PRIORITY_TONE: Record<string, string> = {
  LOW: "badge-slate",
  MEDIUM: "badge-blue",
  HIGH: "badge-amber",
  URGENT: "badge-red",
};
const PRIORITY_AR: Record<string, string> = { LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", URGENT: "عاجل" };

export default async function ProjectsPage() {
  const ar = getLocale() === "ar";
  const [projects, companies] = await Promise.all([
    prisma.futureProject.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, include: { company: true } }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalBudget = projects.reduce((a, p) => a + p.budgetJod, 0);
  const inProgress = projects.filter((p) => p.stage === "IN_PROGRESS").length;
  const urgent = projects.filter((p) => p.priority === "URGENT").length;
  const avgProgress = projects.length ? projects.reduce((a, p) => a + p.progressPct, 0) / projects.length : 0;

  // Group by company
  const byCompany = companies.map((c) => ({
    company: c,
    projects: projects.filter((p) => p.companyId === c.id),
  }));

  return (
    <>
      <PageHeader
        eyebrow={ar ? "النمو والاستثمار" : "Growth & Capital"}
        title={ar ? "خط الأنابيب — المشاريع المستقبلية" : "Future Projects Pipeline"}
        subtitle={
          ar
            ? "كل توسعة، استثمار، أو منتج جديد قيد التخطيط — منظّمة حسب الشركة المالكة."
            : "Every planned expansion, investment, or new product — grouped by owning company."
        }
      />

      <PageContainer>
        <HeritageSection
          eyebrow={ar ? "خط الأنابيب" : "Pipeline"}
          title={ar ? "ميزانية الطموح" : "The ambition pipeline"}
          rtl={ar}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div>
                <FlaskConical className="h-12 w-12" style={{ color: "var(--heri-ochre)" }} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[12.5px] font-semibold"
                  style={{ color: "var(--heri-ink-2)" }}
                >
                  {ar
                    ? "ما لا يدخل الأنابيب لا يصبح حقيقة. هنا تعيش خطط 2026–2028 في حركة."
                    : "What doesn't enter the pipeline never becomes reality. Here lives 2026–2028 in motion."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/projects/new"
                    className="heri-btn heri-btn-primary inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {ar ? "مشروع جديد" : "New project"}
                  </Link>
                  <ExportMenu type="projects" locale={ar ? "ar" : "en"} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 heri-stagger sm:grid-cols-2">
              <ProjHeroStat label={ar ? "مشاريع" : "Projects"} value={formatNumber(projects.length)} icon={FlaskConical} />
              <ProjHeroStat label={ar ? "ميزانية" : "Budget"} value={formatMoney(totalBudget)} icon={Wallet} />
              <ProjHeroStat label={ar ? "قيد التنفيذ" : "In progress"} value={formatNumber(inProgress)} icon={TrendingUp} />
              <ProjHeroStat label={ar ? "إنجاز" : "Avg progress"} value={`${avgProgress.toFixed(0)}%`} icon={Target} />
            </div>
          </div>
        </HeritageSection>

        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi label={ar ? "المشاريع" : "Projects"} raw={projects.length} kind="number" hint={ar ? "كل المراحل" : "all stages"} />
          <HeriKpi label={ar ? "قيد التنفيذ" : "In progress"} raw={inProgress} kind="number" accent="var(--heri-teal)" hint={ar ? "نشطة الآن" : "active now"} />
          <HeriKpi label={ar ? "عاجلة" : "Urgent"} raw={urgent} kind="number" accent={urgent > 0 ? "var(--heri-terracotta)" : undefined} hint={ar ? "أولوية قصوى" : "top priority"} />
          <HeriKpi label={ar ? "ميزانية إجمالية" : "Total budget"} raw={totalBudget} kind="money" hint={`${avgProgress.toFixed(0)}% ${ar ? "متوسط" : "avg"}`} />
        </section>

        {projects.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title={ar ? "لا توجد مشاريع مستقبلية بعد" : "No future projects yet"}
            action={
              <Link href="/projects/new" className="heri-btn heri-btn-primary">
                <Plus className="h-4 w-4" />
                {ar ? "أضف أول مشروع" : "Add first project"}
              </Link>
            }
          />
        ) : (
          <section className="space-y-6">
            {byCompany.map(({ company, projects }) => {
              if (projects.length === 0) return null;
              const brand = getCompanyBrand(company.code);
              return (
                <div key={company.id} className="space-y-3">
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: brand.gradient, color: "white" }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center ring-1 ring-white/30 backdrop-blur"
                         style={{ background: "rgba(255,255,255,0.16)" }}>
                      <span className="text-xl font-bold">{brand.emblem}</span>
                    </div>
                    <div>
                      <div className="text-base font-bold">{company.name}</div>
                      <div className="text-[11px] opacity-80">{brand.motto}</div>
                    </div>
                    <span className="ms-auto text-[11px] font-bold opacity-80">
                      {projects.length} {ar ? "مشروع" : "project(s)"}
                    </span>
                  </div>

                  <div className="grid gap-4 heri-stagger md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((p) => (
                      <div key={p.id} className="heri-card p-4 relative">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-base font-bold" style={{ color: "var(--heri-ink)" }}>{p.title}</h3>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className={STAGE_TONE[p.stage]}>{ar ? STAGE_AR[p.stage] : p.stage}</span>
                              <span className={PRIORITY_TONE[p.priority]}>{ar ? PRIORITY_AR[p.priority] : p.priority}</span>
                            </div>
                          </div>
                          <DeleteButton softDelete action={deleteProject} payload={{ id: p.id }} label={ar ? `حذف مشروع "${p.title}"` : `Delete project "${p.title}"`} />
                        </div>
                        {p.description ? (
                          <p className="mt-2 line-clamp-3 text-sm" style={{ color: "var(--heri-ink-3)" }}>{p.description}</p>
                        ) : null}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>
                              {ar ? "ميزانية" : "Budget"}
                            </div>
                            <div className="font-bold" style={{ color: "var(--heri-ink)" }}>{formatMoney(p.budgetJod)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>
                              {ar ? "الجدول الزمني" : "Timeline"}
                            </div>
                            <div className="font-mono" style={{ color: "var(--heri-ink)" }}>
                              {p.startQuarter ?? "—"} → {p.targetQuarter ?? "—"}
                            </div>
                          </div>
                          {p.ownerName ? (
                            <div className="col-span-2">
                              <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>
                                {ar ? "المسؤول" : "Owner"}
                              </div>
                              <div style={{ color: "var(--heri-ink)" }}>{p.ownerName}</div>
                            </div>
                          ) : null}
                          {p.kpis ? (
                            <div className="col-span-2">
                              <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--heri-ink-3)" }}>KPIs</div>
                              <div className="line-clamp-2" style={{ color: "var(--heri-ink)" }}>{p.kpis}</div>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span style={{ color: "var(--heri-ink-3)" }}>{ar ? "نسبة الإنجاز" : "Progress"}</span>
                            <span className="heri-number-mono font-bold" style={{ color: "var(--heri-ochre)" }}>{p.progressPct.toFixed(0)}٪</span>
                          </div>
                          <div className="bar"><div className="bar-fill" style={{ width: `${p.progressPct}%` }} /></div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1 border-t pt-3" style={{ borderColor: "var(--heri-rule)" }}>
                          {STAGE_ORDER.filter((s) => s !== p.stage).map((s) => (
                            <form key={s} action={setProjectStage}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="stage" value={s} />
                              <button type="submit" className="heri-btn heri-btn-ghost">{ar ? STAGE_AR[s] : s}</button>
                            </form>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </PageContainer>
    </>
  );
}

function ProjHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div
      className="px-3 py-2"
      style={{
        background: "var(--heri-cream)",
        border: "1px solid var(--heri-rule)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--heri-ink-3)" }}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="heri-number-mono mt-0.5 text-base font-bold leading-none tracking-[-0.012em]" style={{ color: "var(--heri-ink)" }}>
        {value}
      </div>
    </div>
  );
}
