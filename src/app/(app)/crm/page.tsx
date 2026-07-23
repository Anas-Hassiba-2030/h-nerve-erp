// /crm — CRM pipeline (Phase 27, P1). Lead → Opportunity → stage pipeline.
// Fully server-rendered (forms post to server actions) so it works without
// client hydration. Heritage Modern via the Daylight shell. Tenant-scoped:
// the scoped prisma client filters Lead/Opportunity by the active tenant.

import { redirect } from "next/navigation";
import { Users, UserPlus, Trophy } from "lucide-react";
import { getLocale } from "@/lib/i18n/i18n.server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/db";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { formatMoney, formatNumber } from "@/lib/utils/utils";
import { SalesPipelineExpert } from "@/lib/brain/agents/SalesPipelineExpert";
import { createLead, convertLead, moveStage, closeOpportunity } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "NEW", ar: "جديدة", en: "New", badge: "badge-slate" },
  { key: "QUALIFYING", ar: "تأهيل", en: "Qualifying", badge: "badge-sky" },
  { key: "PROPOSAL", ar: "عرض", en: "Proposal", badge: "badge-violet" },
  { key: "NEGOTIATION", ar: "تفاوض", en: "Negotiation", badge: "badge-amber" },
  { key: "WON", ar: "رابحة", en: "Won", badge: "badge-emerald" },
  { key: "LOST", ar: "خاسرة", en: "Lost", badge: "badge-red" },
] as const;
const OPEN = new Set(["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION"]);

export default async function CrmPage() {
  const ar = (await getLocale()) === "ar";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [opps, leads] = await Promise.all([
    prisma.opportunity.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 400,
    }),
    prisma.lead.findMany({
      where: { deletedAt: null, status: { in: ["NEW", "QUALIFIED"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const open = opps.filter((o) => OPEN.has(o.stage));
  const pipelineValue = open.reduce((s, o) => s + o.amount, 0);
  const won = opps.filter((o) => o.stage === "WON");
  const lost = opps.filter((o) => o.stage === "LOST");
  const winRate = won.length + lost.length > 0
    ? Math.round((won.length / (won.length + lost.length)) * 100)
    : 0;
  const wonValue = won.reduce((s, o) => s + o.amount, 0);

  const read = SalesPipelineExpert.stubVoice({
    topic: ar ? "صحة قمع المبيعات" : "Sales pipeline health",
    context: {
      summary: "",
      metrics: { openOpps: open.length, pipelineValue: Math.round(pipelineValue), winRate },
      relevantNodes: [],
    },
    locale: ar ? "ar" : "en",
  });

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "إدارة العلاقات" : "Customer relations"}
        title={ar ? "إدارة علاقات العملاء" : "CRM Pipeline"}
        subtitle={
          ar
            ? "من عميل محتمل إلى صفقة رابحة — مع قراءة الدماغ لصحة الخط."
            : "From lead to won deal — with the Brain's read on pipeline health."
        }
        status={ar ? `${formatNumber(open.length)} فرصة مفتوحة` : `${formatNumber(open.length)} open`}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "قيمة الخط" : "Pipeline value"} value={formatMoney(pipelineValue)} hint={ar ? "فرص مفتوحة" : "open opps"} />
        <DaylightKpi label={ar ? "فرص مفتوحة" : "Open opportunities"} value={formatNumber(open.length)} hint={ar ? "قيد التفاوض" : "in flight"} />
        <DaylightKpi label={ar ? "معدل الإغلاق" : "Win rate"} value={`${winRate}%`} hint={ar ? `${won.length} ربح / ${lost.length} خسارة` : `${won.length}W / ${lost.length}L`} delta={winRate >= 30 ? { dir: "up", text: ar ? "صحي" : "healthy" } : undefined} />
        <DaylightKpi label={ar ? "عملاء محتملون" : "Open leads"} value={formatNumber(leads.length)} hint={ar ? "بانتظار التأهيل" : "to qualify"} />
      </DaylightKpiGrid>

      {/* Brain read */}
      <DaylightPanel
        title={ar ? "قراءة الدماغ" : "Pipeline read"}
        aside={ar ? SalesPipelineExpert.speakerLabelAr : SalesPipelineExpert.speakerLabelEn}
      >
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>{read.thesis}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(read.evidence ?? []).map((e) => (
            <span key={e.ref} className="badge-emerald">{e.label}</span>
          ))}
        </div>
      </DaylightPanel>

      {/* New lead */}
      <DaylightPanel title={ar ? "عميل محتمل جديد" : "New lead"} aside={ar ? "أضِف ثم حوّله إلى فرصة" : "Add, then convert to an opportunity"}>
        <form action={createLead} className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <input name="name" required maxLength={200} className="input text-xs" placeholder={ar ? "الاسم *" : "Name *"} aria-label={ar ? "الاسم" : "Name"} />
          <input name="company" maxLength={200} className="input text-xs" placeholder={ar ? "الشركة" : "Company"} aria-label={ar ? "الشركة" : "Company"} />
          <input name="email" type="email" maxLength={200} className="input text-xs" placeholder={ar ? "البريد" : "Email"} aria-label={ar ? "البريد" : "Email"} />
          <input name="phone" maxLength={60} className="input text-xs" placeholder={ar ? "الهاتف" : "Phone"} aria-label={ar ? "الهاتف" : "Phone"} />
          <input name="expectedValue" type="number" min={0} step="any" className="input text-xs" placeholder={ar ? "القيمة المتوقعة (دينار)" : "Expected value (JOD)"} aria-label={ar ? "القيمة المتوقعة" : "Expected value"} />
          <select name="source" className="input text-xs" aria-label={ar ? "المصدر" : "Source"} defaultValue="">
            <option value="">{ar ? "المصدر…" : "Source…"}</option>
            <option value="WEB">{ar ? "الموقع" : "Web"}</option>
            <option value="REFERRAL">{ar ? "إحالة" : "Referral"}</option>
            <option value="EVENT">{ar ? "فعالية" : "Event"}</option>
            <option value="COLD">{ar ? "تواصل بارد" : "Cold"}</option>
          </select>
          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="dl-btn dl-btn-primary"><UserPlus className="h-4 w-4" strokeWidth={1.5} />{ar ? "إضافة عميل محتمل" : "Add lead"}</button>
          </div>
        </form>
      </DaylightPanel>

      {/* Lead inbox */}
      {leads.length > 0 ? (
        <DaylightPanel title={ar ? "العملاء المحتملون" : "Leads"} aside={ar ? "حوّل إلى فرصة لبدء الخط" : "Convert to start the pipeline"}>
          <div className="flex flex-col gap-2">
            {leads.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                <span className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>{l.name}</span>
                {l.company ? <span className="text-xs" style={{ color: "var(--ink-muted)" }}>{l.company}</span> : null}
                {l.source ? <span className="badge-slate">{l.source}</span> : null}
                {l.expectedValue ? <span className="font-mono text-xs" style={{ color: "var(--ink-muted)" }}>{formatMoney(l.expectedValue)}</span> : null}
                <form action={convertLead} className="ms-auto">
                  <input type="hidden" name="id" value={l.id} />
                  <button type="submit" className="btn-secondary btn-sm">{ar ? "تحويل إلى فرصة" : "Convert"}</button>
                </form>
              </div>
            ))}
          </div>
        </DaylightPanel>
      ) : null}

      {/* Pipeline board */}
      <DaylightPanel title={ar ? "خط الصفقات" : "Pipeline"} aside={ar ? `قيمة الفوز: ${formatMoney(wonValue)}` : `Won value: ${formatMoney(wonValue)}`}>
        {opps.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10" style={{ color: "var(--ink-muted)" }} />
            <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{ar ? "لا فرص بعد — حوّل عميلاً محتملاً للبدء." : "No opportunities yet — convert a lead to start."}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px, 1fr))`, gap: 10, overflowX: "auto" }}>
            {STAGES.map((st) => {
              const col = opps.filter((o) => o.stage === st.key);
              const colValue = col.reduce((s, o) => s + o.amount, 0);
              return (
                <div key={st.key} className="panel" style={{ padding: 10, background: "var(--surface, #fff)" }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={st.badge}>{ar ? st.ar : st.en}</span>
                    <span className="text-[13px] font-mono" style={{ color: "var(--ink-muted)" }}>{col.length} · {formatMoney(colValue)}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {col.map((o) => (
                      <div key={o.id} className="card-tight" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 8 }}>
                        <div className="text-xs font-extrabold" style={{ color: "var(--ink)" }}>{o.title}</div>
                        <div className="mt-1 font-mono text-xs" style={{ color: "var(--brand-deep, #0a5)" }}>{formatMoney(o.amount)}</div>
                        <div className="mt-1 h-1 w-full" style={{ background: "var(--line)", borderRadius: 4 }}>
                          <div style={{ width: `${o.probability}%`, height: "100%", background: "var(--brand-deep, #0a5)", borderRadius: 4 }} />
                        </div>
                        {OPEN.has(o.stage) ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <form action={moveStage}>
                              <input type="hidden" name="id" value={o.id} />
                              <button name="dir" value="prev" className="btn-ghost btn-sm" type="submit" aria-label={ar ? "رجوع" : "Back"}>‹</button>
                            </form>
                            <form action={moveStage}>
                              <input type="hidden" name="id" value={o.id} />
                              <button name="dir" value="next" className="btn-secondary btn-sm" type="submit" aria-label={ar ? "تقدّم" : "Advance"}>›</button>
                            </form>
                            <form action={closeOpportunity} className="ms-auto">
                              <input type="hidden" name="id" value={o.id} />
                              <button name="outcome" value="WON" className="btn-sm" type="submit" style={{ color: "var(--ok, #0a7)" }} aria-label={ar ? "ربح" : "Won"}>✓</button>
                            </form>
                            <form action={closeOpportunity}>
                              <input type="hidden" name="id" value={o.id} />
                              <button name="outcome" value="LOST" className="btn-sm" type="submit" style={{ color: "var(--danger, #c33)" }} aria-label={ar ? "خسارة" : "Lost"}>✕</button>
                            </form>
                          </div>
                        ) : st.key === "WON" ? (
                          <div className="mt-1 flex items-center gap-1 text-[13px]" style={{ color: "var(--ok, #0a7)" }}><Trophy className="h-3 w-3" />{ar ? "رابحة" : "Won"}</div>
                        ) : o.lostReason ? (
                          <div className="mt-1 text-[13px]" style={{ color: "var(--ink-muted)" }}>{o.lostReason}</div>
                        ) : null}
                      </div>
                    ))}
                    {col.length === 0 ? <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>—</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
