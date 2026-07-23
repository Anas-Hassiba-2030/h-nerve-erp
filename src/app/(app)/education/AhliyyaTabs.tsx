"use client";

// Client island for the /education (الأهلية) section. Mirrors the three-tab
// structure of docs/design/system/sections/ahliyya.html + ahliyya-ops.js:
//   overview · programs (stage pipeline) · teams (founding-team tiles).
// The overview panel is rendered on the server and passed in as `overview`;
// programs & teams are interactive, so they live here. Real Prisma data is
// fed in via `programs`; advancing a stage posts the existing setProgramStage
// server action. Fully bilingual.

import { useState, useTransition } from "react";

const STAGE_COLOR: Record<string, string> = {
  GRADUATED: "var(--emerald)", ACCELERATING: "var(--gold)",
  INTAKE: "var(--ink-muted)", STALLED: "var(--brick)",
};
function StagePill({ stage, ar }: { stage: string; ar: boolean }) {
  const LABEL: Record<string, { ar: string; en: string }> = {
    GRADUATED:    { ar: "خريج",    en: "Graduated"    },
    ACCELERATING: { ar: "تسريع",   en: "Accelerating" },
    INTAKE:       { ar: "قبول",    en: "Intake"       },
    STALLED:      { ar: "متوقف",   en: "Stalled"      },
  };
  const lbl = LABEL[stage] ?? { ar: stage, en: stage };
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: STAGE_COLOR[stage] ?? "var(--ink-muted)", letterSpacing: "0.06em" }}>
      {ar ? lbl.ar : lbl.en}
    </span>
  );
}

export type AhliyyaProgram = {
  id: string;
  name: string;
  nameEn: string | null;
  founder: string;
  college: string;          // localized vertical label
  stage: string;            // INTAKE | ACCELERATING | GRADUATED | STALLED
  stageIndex: number;       // 0..3 position in the pipeline
};

// pipeline stage labels, reference order: idea · incubate · growth · exit
const STAGES_AR = ["فكرة", "احتضان", "نمو", "خروج"];
const STAGES_EN = ["Idea", "Incubate", "Growth", "Exit"];

// the healthy linear progression. STALLED is an off-pipeline exception
// (a "watch" state), NOT a forward step — advancing a stalled program
// resumes it into ACCELERATING. Deriving the next stage from `p.stage`
// (not the visual pipeline index) keeps INTAKE → ACCELERATING correct.
const STAGE_FLOW = ["INTAKE", "ACCELERATING", "GRADUATED"] as const;

function nextStage(stage: string): string | null {
  if (stage === "STALLED") return "ACCELERATING"; // un-stall = resume growth
  const i = STAGE_FLOW.indexOf(stage as (typeof STAGE_FLOW)[number]);
  if (i < 0 || i >= STAGE_FLOW.length - 1) return null; // unknown or terminal
  return STAGE_FLOW[i + 1];
}

export function AhliyyaTabs({
  ar,
  programs,
  overview,
  setProgramStage,
}: {
  ar: boolean;
  programs: AhliyyaProgram[];
  overview: React.ReactNode;
  setProgramStage: (formData: FormData) => Promise<void>;
}) {
  const [tab, setTab] = useState<"overview" | "programs" | "teams">("overview");
  const STAGES = ar ? STAGES_AR : STAGES_EN;

  return (
    <>
      <div className="ops-tabs">
        <button className={`ops-tab${tab === "overview" ? " on" : ""}`} onClick={() => setTab("overview")}>{ar ? "نظرة عامة" : "Overview"}</button>
        <button className={`ops-tab${tab === "programs" ? " on" : ""}`} onClick={() => setTab("programs")}>{ar ? "البرامج" : "Programs"}</button>
        <button className={`ops-tab${tab === "teams" ? " on" : ""}`} onClick={() => setTab("teams")}>{ar ? "الفرق المؤسِّسة" : "Founding teams"}</button>
      </div>

      <div className={`ops-panel${tab === "overview" ? " on" : ""}`} data-panel="overview">
        {overview}
      </div>

      <div className={`ops-panel${tab === "programs" ? " on" : ""}`} data-panel="programs">
        <ProgramsPanel ar={ar} programs={programs} stages={STAGES} setProgramStage={setProgramStage} />
      </div>

      <div className={`ops-panel${tab === "teams" ? " on" : ""}`} data-panel="teams">
        <TeamsPanel ar={ar} programs={programs} />
      </div>
    </>
  );
}

function ProgramsPanel({
  ar,
  programs,
  stages,
  setProgramStage,
}: {
  ar: boolean;
  programs: AhliyyaProgram[];
  stages: string[];
  setProgramStage: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function advance(p: AhliyyaProgram) {
    const next = nextStage(p.stage);
    if (!next) return;
    const fd = new FormData();
    fd.set("id", p.id);
    fd.set("stage", next);
    startTransition(() => { void setProgramStage(fd); });
  }

  return (
    <>
      <div className="ops-toolbar">
        <h2>{ar ? "البرامج" : "Programs"}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {programs.map((p) => {
          const atEnd = nextStage(p.stage) == null;
          return (
            <div key={p.id} className="panel" style={{ padding: "18px 20px", marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{ar ? p.name : (p.nameEn ?? p.name)}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{p.college}</div>
                </div>
                <button
                  className="ops-add"
                  onClick={() => advance(p)}
                  disabled={atEnd || pending}
                  style={atEnd ? { opacity: 0.4, pointerEvents: "none" } : undefined}
                >
                  {ar ? "تقديم المرحلة →" : "Advance stage →"}
                </button>
              </div>
              <Pipeline stageIndex={p.stageIndex} stages={stages} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function Pipeline({ stageIndex, stages }: { stageIndex: number; stages: string[] }) {
  return (
    <div className="stages">
      {stages.map((s, i) => {
        const cls = i < stageIndex ? "done" : i === stageIndex ? "active" : "";
        return (
          <div key={s} className={`stage ${cls}`.trim()}>
            <span className="dot" />
            <span className="sl">{s}</span>
          </div>
        );
      })}
    </div>
  );
}

function TeamsPanel({ ar, programs }: { ar: boolean; programs: AhliyyaProgram[] }) {
  return (
    <>
      <div className="ops-toolbar">
        <h2>{ar ? "الفرق المؤسِّسة" : "Founding teams"}</h2>
      </div>
      <div className="ops-portfolio">
        {programs.map((p) => (
          <div key={p.id} className="co-tile" style={{ cursor: "default" }}>
            <div className="co-logo">{(p.founder || "؟").charAt(0)}</div>
            <div className="co-nm">{ar ? p.name : (p.nameEn ?? p.name)}</div>
            <div className="co-sec">{p.college}</div>
            <div className="co-meta">
              <span>{p.founder}</span>
              <StagePill stage={p.stage} ar={ar} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
