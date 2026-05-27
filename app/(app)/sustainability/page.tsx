import { Leaf, Wind, Droplet, ShieldCheck, BarChart3, Sparkles, Download, TreePine } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeritageSection, HeritagePill } from "@/components/heritage";
import { HeriKpi } from "@/components/HeriKpi";
import { KpiCard } from "@/components/KpiCard";
import { CompanyCover } from "@/components/CompanyCover";
import { SectorPill } from "@/components/SectorPill";
import { ExportMenu } from "@/components/ExportMenu";
import { prisma } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/utils";
import { getLocale } from "@/lib/i18n.server";

const PERIODS = ["Q1", "Q2", "Q3", "Q4"] as const;

export default async function SustainabilityPage({
  searchParams,
}: {
  searchParams: { range?: "3M" | "6M" | "12M" };
}) {
  const ar = getLocale() === "ar";
  const range = (searchParams.range ?? "12M") as "3M" | "6M" | "12M";
  const limit = range === "3M" ? 1 : range === "6M" ? 2 : 4;

  const [companies, scores] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.sustainabilityScore.findMany({
      orderBy: [{ year: "asc" }, { period: "asc" }],
      include: { company: true },
    }),
  ]);

  // Build per-company rolling-window stats
  const byCompany = companies.map((c) => {
    const cs = scores.filter((s) => s.companyId === c.id).slice(-limit);
    if (cs.length === 0) {
      return { company: c, avg: 0, env: 0, soc: 0, gov: 0, carbon: 0, water: 0, renew: 0, trend: [] as number[], delta: 0 };
    }
    const avg = +(cs.reduce((a, s) => a + s.overall, 0) / cs.length).toFixed(1);
    const env = +(cs.reduce((a, s) => a + s.environmentalScore, 0) / cs.length).toFixed(1);
    const soc = +(cs.reduce((a, s) => a + s.socialScore, 0) / cs.length).toFixed(1);
    const gov = +(cs.reduce((a, s) => a + s.governanceScore, 0) / cs.length).toFixed(1);
    const carbon = +cs.reduce((a, s) => a + s.carbonTons, 0).toFixed(0);
    const water = +cs.reduce((a, s) => a + s.waterCubicM, 0).toFixed(0);
    const renew = +(cs.reduce((a, s) => a + s.renewablePct, 0) / cs.length).toFixed(1);
    const trend = cs.map((s) => s.overall);
    const delta = cs.length >= 2 ? +(cs[cs.length - 1].overall - cs[0].overall).toFixed(1) : 0;
    return { company: c, avg, env, soc, gov, carbon, water, renew, trend, delta };
  });

  const groupOverall =
    byCompany.reduce((a, x) => a + x.avg, 0) / Math.max(1, byCompany.filter((x) => x.avg > 0).length);
  const groupCarbon = byCompany.reduce((a, x) => a + x.carbon, 0);
  const groupWater = byCompany.reduce((a, x) => a + x.water, 0);
  const groupRenew = byCompany.reduce((a, x) => a + x.renew, 0) / Math.max(1, byCompany.length);

  return (
    <>
      <PageHeader
        eyebrow={ar ? "النمو والاستثمار" : "Growth & Capital"}
        title={ar ? "الاستدامة و ESG" : "Sustainability & ESG"}
        subtitle={
          ar
            ? "تقييم بيئي واجتماعي وحوكمي لكل شركة في المجموعة."
            : "ESG scoring across every Hourani business unit."
        }
      />

      <PageContainer>
        <HeritageSection
          eyebrow={ar ? "بصمة المجموعة" : "Group footprint"}
          title={ar ? "الاستدامة و ESG" : "Sustainability & ESG"}
          rtl={ar}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div>
                <TreePine className="h-12 w-12" style={{ color: "var(--heri-teal)" }} />
              </div>
              <div className="min-w-0">
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-semibold"
                  style={{ color: "var(--heri-ink-2)" }}
                >
                  {ar
                    ? "كل قرار توسعي يدخل في حسابنا الأخضر — نقيس ما لا يقاس عادة."
                    : "Every expansion enters our green ledger — we measure the unmeasured."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div
                    className="inline-flex p-0.5"
                    style={{
                      background: "var(--heri-cream-2)",
                      border: "1px solid var(--heri-rule)",
                    }}
                  >
                    {(["3M", "6M", "12M"] as const).map((r) => (
                      <a
                        key={r}
                        href={`/sustainability?range=${r}`}
                        className="px-2.5 py-1 text-[11px] font-semibold transition"
                        style={
                          range === r
                            ? { background: "var(--heri-ochre)", color: "var(--heri-cream)" }
                            : { color: "var(--heri-ink-3)" }
                        }
                      >
                        {r}
                      </a>
                    ))}
                  </div>
                  <ExportMenu type="sustainability" locale={ar ? "ar" : "en"} />
                </div>
              </div>
            </div>

            <div className="grid gap-2 heri-stagger sm:grid-cols-2">
              <EsgHeroStat label={ar ? "ESG العام" : "Group ESG"} value={groupOverall.toFixed(1)} icon={ShieldCheck} />
              <EsgHeroStat label={ar ? "كربون (طن)" : "Carbon (t)"} value={formatNumber(groupCarbon)} icon={Wind} />
              <EsgHeroStat label={ar ? "مياه (م³)" : "Water (m³)"} value={formatNumber(groupWater)} icon={Droplet} />
              <EsgHeroStat label={ar ? "متجدد %" : "Renewable %"} value={`${groupRenew.toFixed(1)}%`} icon={Leaf} />
            </div>
          </div>
        </HeritageSection>

        <section className="grid gap-4 heri-stagger sm:grid-cols-2 xl:grid-cols-4">
          <HeriKpi label={ar ? "متوسط ESG" : "Group ESG"} raw={parseFloat(groupOverall.toFixed(1))} kind="number" decimals={1} hint={ar ? "من 100" : "out of 100"} accent="var(--heri-teal)" />
          <HeriKpi label={ar ? "انبعاثات كربون" : "Carbon"} raw={groupCarbon} kind="number" hint={ar ? `نافذة ${range} · t CO₂` : `Window ${range} · t CO₂`} />
          <HeriKpi label={ar ? "استهلاك المياه" : "Water usage"} raw={groupWater} kind="number" hint={ar ? "م³ تراكمي" : "m³ cumulative"} />
          <HeriKpi label={ar ? "متجدد %" : "Renewable mix"} raw={parseFloat(groupRenew.toFixed(1))} kind="percent" decimals={1} accent="var(--heri-teal)" hint={groupRenew >= 25 ? (ar ? "ضمن الهدف" : "On target") : (ar ? "تحت الهدف" : "Below target")} />
        </section>

        {/* Per-company table */}
        <section className="card overflow-hidden">
          <div className="card-header">
            <div>
              <div className="card-title">{ar ? "نقاط ESG لكل شركة" : "Per-company ESG scoring"}</div>
              <div className="card-sub">
                {ar ? `نافذة ${range} — متوسط على ${limit} ربع.` : `${range} window — averaged over ${limit} quarter(s).`}
              </div>
            </div>
            <BarChart3 className="h-4 w-4" style={{ color: "var(--heri-ink-3)" }} />
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? "الشركة" : "Company"}</th>
                  <th>{ar ? "القطاع" : "Sector"}</th>
                  <th>ESG</th>
                  <th>E</th>
                  <th>S</th>
                  <th>G</th>
                  <th>{ar ? "كربون" : "Carbon"}</th>
                  <th>{ar ? "مياه" : "Water"}</th>
                  <th>{ar ? "متجدد" : "Renew."}</th>
                  <th>{ar ? "اتجاه" : "Trend"}</th>
                </tr>
              </thead>
              <tbody>
                {byCompany.map((row) => (
                  <tr key={row.company.id}>
                    <td className="font-bold" style={{ color: "var(--heri-ink)" }}>{row.company.name}</td>
                    <td><SectorPill sector={row.company.sector} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="heri-number-mono font-bold" style={{ color: "var(--heri-ink)" }}>{row.avg.toFixed(1)}</span>
                        <div className="bar w-24"><div className="bar-fill" style={{ width: `${row.avg}%` }} /></div>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{row.env.toFixed(1)}</td>
                    <td className="font-mono text-xs">{row.soc.toFixed(1)}</td>
                    <td className="font-mono text-xs">{row.gov.toFixed(1)}</td>
                    <td className="font-mono text-xs">{formatNumber(row.carbon)} t</td>
                    <td className="font-mono text-xs">{formatNumber(row.water)} m³</td>
                    <td className="font-mono text-xs">{row.renew.toFixed(1)}٪</td>
                    <td>
                      <span className={row.delta >= 0 ? "badge-emerald" : "badge-red"}>
                        {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cards per company with breakdown */}
        <section className="grid gap-4 heri-stagger lg:grid-cols-2 xl:grid-cols-3">
          {byCompany.map((row) => (
            <div key={row.company.id} className="heri-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold" style={{ color: "var(--heri-ink)" }}>{row.company.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--heri-ink-3)" }}>{row.company.nameEn}</div>
                </div>
                <span className="badge-emerald">{row.avg.toFixed(1)} / 100</span>
              </div>
              <div className="mt-3 space-y-2">
                <PillarBar label={ar ? "بيئي (E)" : "Environmental"} value={row.env} icon={Wind} />
                <PillarBar label={ar ? "اجتماعي (S)" : "Social"} value={row.soc} icon={Sparkles} />
                <PillarBar label={ar ? "حوكمة (G)" : "Governance"} value={row.gov} icon={ShieldCheck} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-[11px]"
                   style={{ borderColor: "var(--heri-rule)", color: "var(--heri-ink-3)" }}>
                <div><span className="font-bold" style={{ color: "var(--heri-ink)" }}>{formatNumber(row.carbon)}t</span> {ar ? "كربون" : "carbon"}</div>
                <div><span className="font-bold" style={{ color: "var(--heri-ink)" }}>{formatNumber(row.water)}</span> m³ {ar ? "ماء" : "water"}</div>
                <div><span className="font-bold" style={{ color: "var(--heri-teal)" }}>{row.renew.toFixed(1)}٪</span> {ar ? "متجدد" : "renew."}</div>
              </div>
            </div>
          ))}
        </section>
      </PageContainer>
    </>
  );
}

function EsgHeroStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
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
      <div className="heri-number-mono mt-0.5 text-xl font-bold leading-none tracking-[-0.012em]" style={{ color: "var(--heri-ink)" }}>
        {value}
      </div>
    </div>
  );
}

function PillarBar({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-bold" style={{ color: "var(--heri-ink)" }}>
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className="heri-number-mono" style={{ color: "var(--heri-ink-3)" }}>{value.toFixed(1)}</span>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  );
}
