import Link from "next/link";
import {
  Wallet,
  Brain,
  FlaskConical,
  Leaf,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  formatNumber,
  formatMoney,
  formatShortDate,
  localizeUnit,
} from "@/lib/utils/utils";
import type { CompanyDetail } from "../data";

const PROJECT_STAGE_AR: Record<string, string> = {
  IDEA: "فكرة",
  RESEARCH: "بحث",
  PLANNED: "مخططة",
  APPROVED: "معتمدة",
  IN_PROGRESS: "قيد التنفيذ",
  ON_HOLD: "متوقفة",
  DONE: "منجزة",
};

const PROJECT_STAGE_TONE: Record<string, string> = {
  IDEA: "badge-slate",
  RESEARCH: "badge-blue",
  PLANNED: "badge-blue",
  APPROVED: "badge-emerald",
  IN_PROGRESS: "badge-amber",
  ON_HOLD: "badge-slate",
  DONE: "badge-emerald",
};

export function SignalsColumn({
  company,
  latestEsg,
  en,
}: {
  company: CompanyDetail["company"];
  latestEsg: CompanyDetail["latestEsg"];
  en: boolean;
}) {
  return (
    <aside className="space-y-6">
      {/* Forecasts */}
      {company.forecastsOut.length > 0 || company.forecastsIn.length > 0 ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <Brain className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Supply-chain signals" : "إشارات السلسلة"}                  </h3>
            <Link href="/supply-chain" className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>
              {en ? "View all →" : "عرض الكل ←"}
            </Link>
          </header>

          {company.forecastsOut.length > 0 ? (
            <div className="mb-3">
              <div className="mb-1 text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                {en ? "Outbound" : "صادرة منها"}                    </div>
              <ul className="space-y-1.5">
                {company.forecastsOut.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                    style={{ background: "color-mix(in srgb, var(--gold) 6%, transparent)" }}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <ArrowUpRight className="h-3 w-3 shrink-0" style={{ color: "#0a8e54" }} />
                      <span className="truncate font-bold" style={{ color: "var(--ink)" }}>
                        {en ? (f.productLabelEn || f.productLabel) : f.productLabel}
                      </span>
                      <span style={{ color: "var(--ink-muted)" }}>→ {f.target.code}</span>
                    </div>
                    <span className="font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>
                      {formatNumber(f.predictedDemand)} {localizeUnit(f.unit, !en)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {company.forecastsIn.length > 0 ? (
            <div>
              <div className="mb-1 text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                {en ? "Inbound" : "واردة إليها"}                    </div>
              <ul className="space-y-1.5">
                {company.forecastsIn.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                    style={{ background: "color-mix(in srgb, var(--gold) 6%, transparent)" }}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <ArrowDownRight className="h-3 w-3 shrink-0" style={{ color: "#c0392b" }} />
                      <span className="truncate font-bold" style={{ color: "var(--ink)" }}>
                        {en ? (f.productLabelEn || f.productLabel) : f.productLabel}
                      </span>
                      <span style={{ color: "var(--ink-muted)" }}>← {f.source.code}</span>
                    </div>
                    <span className="font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>
                      {formatNumber(f.predictedDemand)} {localizeUnit(f.unit, !en)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Recent transactions */}
      {company.transactions.length > 0 ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <Wallet className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Recent transactions" : "حركات مالية أخيرة"}                  </h3>
            <Link href="/finance" className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>
              {en ? "View all →" : "عرض الكل ←"}
            </Link>
          </header>
          <ul className="space-y-1.5">
            {company.transactions.map((t) => {
              const isIncome = t.kind === "INCOME" || t.kind === "REVENUE";
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold" style={{ color: "var(--ink)" }}>
                      {t.description ?? t.category}
                    </div>
                    <div className="font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>
                      {t.reference} • {formatShortDate(t.occurredAt)}
                    </div>
                  </div>
                  <span
                    className="shrink-0 font-mono text-xs font-bold"
                    style={{ color: isIncome ? "#0a8e54" : "#c0392b" }}
                  >
                    {isIncome ? "+" : "−"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Future projects */}
      {company.futureProjects.length > 0 ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <FlaskConical className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Future projects" : "المشاريع المستقبلية"}                  </h3>
            <Link href="/projects" className="text-[13px] font-bold" style={{ color: "var(--gold)" }}>
              {en ? "View all →" : "عرض الكل ←"}
            </Link>
          </header>
          <ul className="space-y-2">
            {company.futureProjects.map((p) => (
              <li
                key={p.id}
                className="rounded-lg px-2 py-2"
                style={{ background: "color-mix(in srgb, var(--gold) 5%, transparent)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold" style={{ color: "var(--ink)" }}>
                      {p.title}
                    </div>
                    <div className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                      {p.startQuarter ?? "—"} → {p.targetQuarter ?? "—"}
                    </div>
                  </div>
                  <span className={PROJECT_STAGE_TONE[p.stage] ?? "badge-slate"}>
                    {PROJECT_STAGE_AR[p.stage] ?? p.stage}
                  </span>
                </div>
                {p.budgetJod > 0 ? (
                  <div className="mt-1 text-[12px] font-mono" style={{ color: "var(--ink-muted)" }}>
                    {en ? "Budget" : "ميزانية"} {formatMoney(p.budgetJod)}
                  </div>
                ) : null}
                {p.progressPct > 0 ? (
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                    style={{ background: "color-mix(in srgb, var(--ink-muted) 14%, transparent)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, p.progressPct)}%`,
                        background: "linear-gradient(90deg, var(--gold) 0%, var(--gold) 100%)",
                        transition: "width .6s ease",
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ESG */}
      {latestEsg ? (
        <section className="card card-pad anim-fade-up">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ink)" }}>
              <Leaf className="h-4 w-4" style={{ color: "var(--gold)" }} />
              {en ? "Sustainability (ESG)" : "الاستدامة (ESG)"}                  </h3>
            <span className="text-[12px] font-mono" style={{ color: "var(--ink-muted)" }}>
              {latestEsg.period} {latestEsg.year}
            </span>
          </header>
          <div className="space-y-2">
            {[
              { label: "بيئي", v: latestEsg.environmentalScore, color: "#0a8e54" },
              { label: "اجتماعي", v: latestEsg.socialScore, color: "#1c5fbe" },
              { label: "حوكمة", v: latestEsg.governanceScore, color: "#6d28d9" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-[12px] font-bold" style={{ color: "var(--ink-muted)" }}>
                  <span>{row.label}</span>
                  <span style={{ color: "var(--ink)" }}>{Math.round(row.v)}/100</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: "color-mix(in srgb, var(--ink-muted) 14%, transparent)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, row.v)}%`,
                      background: row.color,
                      transition: "width .6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {latestEsg.carbonTons > 0 || latestEsg.renewablePct > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]" style={{ color: "var(--ink-muted)" }}>
              {latestEsg.carbonTons > 0 ? (
                <div>
                  {en ? "Carbon:" : "كربون:"} <span className="font-mono font-bold" style={{ color: "var(--ink)" }}>
                    {formatNumber(latestEsg.carbonTons)} {en ? "t" : "طن"}
                  </span>
                </div>
              ) : null}
              {latestEsg.renewablePct > 0 ? (
                <div>
                  {en ? "Renewable:" : "طاقة متجددة:"} <span className="font-mono font-bold" style={{ color: "var(--ink)" }}>
                    {Math.round(latestEsg.renewablePct)}{en ? "%" : "٪"}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
