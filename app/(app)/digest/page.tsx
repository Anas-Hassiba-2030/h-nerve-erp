import Link from "next/link";
import { Newspaper, Brain, ArrowUpRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import {
  DaylightShell, DaylightHeader, DaylightKpiGrid, DaylightKpi, DaylightPanel,
} from "@/components/orrery/daylight";
import { getLocale } from "@/lib/i18n.server";
import { getCurrentUser } from "@/lib/session";
import { hasRole } from "@/lib/authz";
import { listDigests } from "@/lib/digest";
import { formatNumber } from "@/lib/utils";
import { generateNewDigest } from "./actions";
import "../daylight.css";

export const dynamic = "force-dynamic";

export default async function DigestListPage() {
  const ar = getLocale() === "ar";
  const session = await getCurrentUser();
  const canGenerate = hasRole(session, "MANAGER");

  const digests = await listDigests(50);
  const dateFmt = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
  const relativeFmt = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });
  const totalSignals = digests.reduce((a, d) => a + d.insightCount, 0);

  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الفريق · الموجز التنفيذي" : "Team · Executive Digest"}
        title={ar ? "الموجز التنفيذي" : "Executive Digest"}
        subtitle={ar ? "ملخّصات أسبوعية مولّدة آلياً تجمع نبض المجموعة في مكان واحد." : "Auto-generated weekly snapshots that compress the group's pulse into one read."}
        status={`${formatNumber(digests.length)} ${ar ? "موجز" : "digests"}`}
        actions={canGenerate ? (
          <form action={generateNewDigest}><button type="submit" className="dl-btn dl-btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />{ar ? "توليد موجز جديد" : "Generate new"}</button></form>
        ) : undefined}
      />

      <DaylightKpiGrid>
        <DaylightKpi label={ar ? "إجمالي الموجزات" : "Total digests"} value={formatNumber(digests.length)} hint={ar ? "محفوظة" : "stored"} />
        <DaylightKpi label={ar ? "إشارات ملخّصة" : "Signals digested"} value={formatNumber(totalSignals)} hint={ar ? "إجمالاً" : "total"} />
        <DaylightKpi label={ar ? "آخر موجز" : "Latest"} value={digests[0] ? relativeFmt.format(digests[0].weekStart) : "—"} hint={ar ? "أسبوع" : "week of"} />
        <DaylightKpi label={ar ? "التواتر" : "Cadence"} value={ar ? "أسبوعي" : "Weekly"} hint={ar ? "تلقائي" : "automatic"} />
      </DaylightKpiGrid>

      <DaylightPanel title={ar ? "الموجزات" : "Digests"} aside={ar ? "أحدث أولاً" : "Newest first"}>
        {digests.length === 0 ? (
          <EmptyState icon={Newspaper} title={ar ? "لا توجد موجزات بعد" : "No digests yet"} description={ar ? "ولّد أول موجز أسبوعي." : "Generate the first weekly digest."} />
        ) : (
          <div className="space-y-3">
            {digests.map((d) => (
              <Link key={d.id} href={`/digest/${d.id}`} className="prop-card block">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag gold">{relativeFmt.format(d.weekStart)} → {relativeFmt.format(d.weekEnd)}</span>
                  <span className="tag ok"><Brain className="h-3 w-3" />{formatNumber(d.insightCount)} {ar ? "إشارة" : "signals"}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{ar ? "صدر" : "Issued"} {dateFmt.format(d.createdAt)}</span>
                  <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" style={{ color: "var(--ink-muted)", marginInlineStart: "auto" }} />
                </div>
                <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{d.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </DaylightPanel>
    </DaylightShell>
  );
}
