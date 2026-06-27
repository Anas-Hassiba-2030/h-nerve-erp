export const dynamic = "force-dynamic";
// /education — The Tank Incubator at Al-Ahliyya Amman University. Fully bilingual.
// Ported to the Claude Design "الأهلية" reference (docs/design/system/sections/
// ahliyya.html + ahliyya-ops.js): raw .dl-page markup, three ops tabs
// (overview · programs · teams). All Prisma fetching below is unchanged; real
// data is mapped onto the reference's HTML slots.

import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { ShareViewButton } from "@/components/brain/ShareViewButton";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLocale } from "@/lib/i18n/i18n.server";
import { prisma } from "@/lib/db/db";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { setProgramStage } from "./actions";
import { AhliyyaTabs, type AhliyyaProgram } from "./AhliyyaTabs";
import { DaylightShell } from "@/components/orrery/daylight";
import "../daylight.css";
import "./ahliyya.css";

const VERTICAL_LABEL: Record<string, { ar: string; en: string }> = {
  AI: { ar: "ذكاء اصطناعي", en: "AI" },
  FINTECH: { ar: "تقنية مالية", en: "Fintech" },
  ECOMMERCE: { ar: "تجارة إلكترونية", en: "E-commerce" },
  AGRITECH: { ar: "زراعة ذكية", en: "Agritech" },
  EDTECH: { ar: "تعليم تقني", en: "EdTech" },
  OTHER: { ar: "أخرى", en: "Other" },
};

// domain stage -> pipeline index (reference order: idea · incubate · growth · exit)
const STAGE_INDEX: Record<string, number> = {
  INTAKE: 0,
  STALLED: 1,
  ACCELERATING: 2,
  GRADUATED: 3,
};

// table status tag tone (matches the reference's ok / warn / crit tags)
const STAGE_TAG: Record<string, "ok" | "warn" | "crit"> = {
  GRADUATED: "ok",
  ACCELERATING: "ok",
  INTAKE: "warn",
  STALLED: "crit",
};

export default async function EducationPage() {
  const locale = await getLocale();
  const ar = locale === "ar";
  const lc: "ar" | "en" = ar ? "ar" : "en";

  const programs = await prisma.program.findMany({ orderBy: { createdAt: "desc" }, include: { company: true }, take: 200 });

  const accelerating = programs.filter((p) => p.stage === "ACCELERATING").length;
  const graduated = programs.filter((p) => p.stage === "GRADUATED").length;
  const totalFunding = programs.reduce((acc, p) => acc + p.fundingJod, 0);
  const totalTeam = programs.reduce((acc, p) => acc + p.teamSize, 0);

  const tagText: Record<string, { ar: string; en: string }> = {
    GRADUATED: { ar: "خروج", en: "Exit" },
    ACCELERATING: { ar: "نمو", en: "Growth" },
    INTAKE: { ar: "فكرة", en: "Idea" },
    STALLED: { ar: "مراقبة", en: "Watch" },
  };

  // data mapped onto the client tabs (programs pipeline + founding teams)
  const tabPrograms: AhliyyaProgram[] = programs.map((p) => {
    const vert = VERTICAL_LABEL[p.vertical] ?? VERTICAL_LABEL.OTHER;
    return {
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      founder: p.founder,
      college: ar ? vert.ar : vert.en,
      stage: p.stage,
      stageIndex: STAGE_INDEX[p.stage] ?? 0,
    };
  });

  // ── overview panel (server-rendered, handed to the tabs island) ──
  const overview = (
    <>
      <div className="kpi-grid reveal reveal-stagger">
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "مشاريع مسجلة" : "Programs"}</div>
          <div className="kpi-val">{formatNumber(programs.length)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{ar ? "كوهورت ٢٠٢٦" : "Cohort 2026"}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "في طور التسريع" : "Accelerating"}</div>
          <div className="kpi-val">{formatNumber(accelerating)}</div>
          <div className="kpi-foot">
            <span className="kpi-hint">{ar ? "مشاريع نشطة" : "active"}</span>
            {accelerating > 0 ? <span className="delta up">▲ {formatNumber(accelerating)}</span> : null}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "تمويل تراكمي" : "Total funding"}</div>
          <div className="kpi-val">{formatMoney(totalFunding)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{`${formatNumber(graduated)} ${ar ? "متخرج" : "graduated"}`}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{ar ? "المؤسسون والفرق" : "Founders & teams"}</div>
          <div className="kpi-val">{formatNumber(totalTeam)}</div>
          <div className="kpi-foot"><span className="kpi-hint">{ar ? "أفراد" : "members"}</span></div>
        </div>
      </div>

      <div className="panel reveal">
        <div className="panel-head">
          <span className="panel-title">{ar ? "البرامج" : "Programs"}</span>
          <span className="panel-aside">{`${formatNumber(programs.length)} · ${ar ? "حسب التسجيل" : "by registration"}`}</span>
        </div>
        {programs.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={ar ? "لا توجد مشاريع في الحاضنة بعد" : "No programs in the incubator yet"}
            action={<Link href="/education/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "تسجيل مشروع" : "Register program"}</Link>}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dl-table">
              <thead>
                <tr>
                  <th>{ar ? "البرنامج" : "Program"}</th>
                  <th>{ar ? "الكلية" : "College"}</th>
                  <th>{ar ? "المؤسس" : "Founder"}</th>
                  <th className="num">{ar ? "الفريق" : "Team"}</th>
                  <th className="num">{ar ? "تمويل" : "Funding"}</th>
                  <th>{ar ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => {
                  const vert = VERTICAL_LABEL[p.vertical] ?? VERTICAL_LABEL.OTHER;
                  const tone = STAGE_TAG[p.stage] ?? "warn";
                  const txt = tagText[p.stage] ?? { ar: p.stage, en: p.stage };
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: "var(--ink)" }}>{ar ? p.name : (p.nameEn ?? p.name)}</td>
                      <td>{ar ? vert.ar : vert.en}</td>
                      <td>{p.founder}</td>
                      <td className="num">{formatNumber(p.teamSize)}</td>
                      <td className="num">{formatMoney(p.fundingJod)}</td>
                      <td><span className={`tag ${tone}`}>{ar ? txt.ar : txt.en}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      {/* ── section header ── */}
      <header className="sec-head reveal">
        <div>
          <div className="sec-eyebrow"><span className="tick" />{ar ? "القطاعات · التعليم" : "Sectors · Education"}</div>
          <h1 className="sec-title">{ar ? "جامعة عمّان الأهلية" : "Al-Ahliyya Amman University"}</h1>
          <p className="sec-sub">
            {ar
              ? "«الخزّان» — حاضنة الشركات الناشئة لطلاب وخريجي الجامعة: القبول، البرامج، والفرق المؤسِّسة."
              : "The Tank — the incubator for student & alumni startups: intake, programs, and founding teams."}
          </p>
        </div>
        <div className="sec-head-aside">
          <span className="sec-status"><span className="dot" />{ar ? "كوهورت ٢٠٢٦" : "Cohort 2026"}</span>
          <ShareViewButton
            title={ar ? "التعليم — حاضنة The Tank" : "Education — The Tank"}
            body={ar ? "نظرة حية على البرامج: الشركات الناشئة، المراحل، والتمويل." : "Live programs view: startups, stages, and funding."}
            refType="view" refId="education" ar={ar} tone="light"
          />
          <div className="sec-actions">
            <Link href="/education/new" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "تسجيل مشروع" : "Register program"}</Link>
            <ExportMenu type="education" companyCode="AAU" locale={lc} variant="heritage" />
          </div>
        </div>
      </header>

      {/* ── three-tab work surface: overview · programs · teams ── */}
      <AhliyyaTabs ar={ar} programs={tabPrograms} overview={overview} setProgramStage={setProgramStage} />
    </DaylightShell>
  );
}
