import { Leaf, Wind, Droplet, ShieldCheck, BarChart3, Sparkles, Download, TreePine } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageContainer } from "@/components/PageContainer";
import { HeroPanel } from "@/components/exec/HeroPanel";
import { MetricTile } from "@/components/exec/MetricTile";
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
        <HeroPanel
          gradient="linear-gradient(135deg, #022c22 0%, #064e3b 35%, #15803d 70%, #84cc16 110%)"
          accent="#84cc16"
          height={250}
        >
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 hn-anim-rise">
              <div className="hn-anim-zoom-bounce relative">
                <span className="hn-anim-pulse-ring absolute -inset-2 rounded-3xl" aria-hidden />
                <div
                  className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl ring-2 ring-white/40"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <TreePine className="h-12 w-12 text-white hn-anim-bob" />
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(6px)",
                    color: "white",
                  }}
                >
                  <Leaf className="h-3 w-3" />
                  {ar ? "بصمة المجموعة" : "Group footprint"}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-black leading-[1.05] tracking-[-0.02em] hn-anim-rise md:text-[34px]"
                  style={{ animationDelay: "0.08s" }}
                >
                  {ar ? "الاستدامة و ESG" : "Sustainability & ESG"}
                </h2>
                <p
                  className="mt-1 max-w-xl text-[12.5px] font-bold opacity-90 hn-anim-rise"
                  style={{ animationDelay: "0.16s" }}
                >
                  {ar
                    ? "كل قرار توسعي يدخل في حسابنا الأخضر — نقيس ما لا يقاس عادة."
                    : "Every expansion enters our green ledger — we measure the unmeasured."}
                </p>
                <div
                  className="mt-3 flex flex-wrap gap-2 hn-anim-fall"
                  style={{ animationDelay: "0.24s" }}
                >
                  <div
                    className="inline-flex rounded-xl p-0.5"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.28)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    {(["3M", "6M", "12M"] as const).map((r) => (
                      <a
                        key={r}
                        href={`/sustainability?range=${r}`}
                        className="rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition"
                        style={
                          range === r
                            ? { background: "white", color: "#15803d" }
                            : { color: "white" }
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

            <div className="grid gap-2 hn-stagger sm:grid-cols-2">
              <EsgHeroStat label={ar ? "ESG العام" : "Group ESG"} value={groupOverall.toFixed(1)} icon={ShieldCheck} />
              <EsgHeroStat label={ar ? "كربون (طن)" : "Carbon (t)"} value={formatNumber(groupCarbon)} icon={Wind} />
              <EsgHeroStat label={ar ? "مياه (م³)" : "Water (m³)"} value={formatNumber(groupWater)} icon={Droplet} />
              <EsgHeroStat label={ar ? "متجدد %" : "Renewable %"} value={`${groupRenew.toFixed(1)}%`} icon={Leaf} />
            </div>
          </div>
        </HeroPanel>

        <section className="grid gap-3 hn-stagger sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label={ar ? "متوسط ESG" : "Group ESG"}
            value={groupOverall.toFixed(1)}
            icon={ShieldCheck}
            tone="emerald"
            hint={ar ? "من 100" : "out of 100"}
          />
          <MetricTile
            label={ar ? "انبعاثات كربون" : "Carbon"}
            value={`${formatNumber(groupCarbon)} t`}
            icon={Wind}
            tone="brand"
            hint={ar ? `نافذة ${range}` : `Window ${range}`}
          />
          <MetricTile
            label={ar ? "استهلاك المياه" : "Water usage"}
            value={`${formatNumber(groupWater)} m³`}
            icon={Droplet}
            tone="blue"
            hint={ar ? "إجمالي تراكمي" : "cumulative"}
          />
          <MetricTile
            label={ar ? "متجدد %" : "Renewable mix"}
            value={`${groupRenew.toFixed(1)}%`}
            icon={Leaf}
            tone="emerald"
            hint={
              groupRenew >= 25
                ? ar ? "ضمن الهدف" : "On target"
                : ar ? "تحت الهدف" : "Below target"
            }
          />
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
            <BarChart3 className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
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
                    <td className="font-extrabold" style={{ color: "var(--text)" }}>{row.company.name}</td>
                    <td><SectorPill sector={row.company.sector} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold" style={{ color: "var(--text)" }}>{row.avg.toFixed(1)}</span>
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
        <section className="grid gap-4 stagger lg:grid-cols-2 xl:grid-cols-3">
          {byCompany.map((row) => (
            <div key={row.company.id} className="card card-hover card-pad">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold" style={{ color: "var(--text)" }}>{row.company.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{row.company.nameEn}</div>
                </div>
                <span className="badge-emerald">{row.avg.toFixed(1)} / 100</span>
              </div>
              <div className="mt-3 space-y-2">
                <PillarBar label={ar ? "بيئي (E)" : "Environmental"} value={row.env} icon={Wind} />
                <PillarBar label={ar ? "اجتماعي (S)" : "Social"} value={row.soc} icon={Sparkles} />
                <PillarBar label={ar ? "حوكمة (G)" : "Governance"} value={row.gov} icon={ShieldCheck} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-[11px]"
                   style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <div><span className="font-bold" style={{ color: "var(--text)" }}>{formatNumber(row.carbon)}t</span> {ar ? "كربون" : "carbon"}</div>
                <div><span className="font-bold" style={{ color: "var(--text)" }}>{formatNumber(row.water)}</span> m³ {ar ? "ماء" : "water"}</div>
                <div><span className="font-bold" style={{ color: "var(--accent)" }}>{row.renew.toFixed(1)}٪</span> {ar ? "متجدد" : "renew."}</div>
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
      className="hn-anim-rise rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.24)",
        backdropFilter: "blur(8px)",
        minWidth: 110,
      }}
    >
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] opacity-85">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="exec-num mt-0.5 text-xl font-black leading-none tracking-[-0.012em]">
        {value}
      </div>
    </div>
  );
}

function PillarBar({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 font-bold" style={{ color: "var(--text)" }}>
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className="font-mono" style={{ color: "var(--text-muted)" }}>{value.toFixed(1)}</span>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  );
}
