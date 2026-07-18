// scripts/seed-v3-extras.ts
//
// Phase V3 — extends prisma/seed-demo.ts coverage:
//   - FutureProject rows per Company (was empty → /projects all zeros)
//   - One example CouncilDiscussion per tenant so /brain/council has
//     content above the system-generated CouncilSession list

import { makePrismaClient } from "../_prisma";
import { PrismaClient } from "@prisma/client";
const prisma = makePrismaClient();

function did(...parts: (string | number)[]) {
  return `demo-v3-${parts.join("-")}`;
}

const PROJECTS: Record<
  string,
  Array<{ title: string; description: string; stage: string; budget: number; priority: string; startQ: string; targetQ: string; progress: number; owner: string }>
> = {
  HOTELS: [
    { title: "Aqaba Wing Expansion",         description: "Adding 80 ocean-view rooms + spa. Phase 1 of three-year capex.", stage: "IN_PROGRESS", budget: 2_500_000, priority: "HIGH",   startQ: "2026-Q1", targetQ: "2027-Q2", progress: 38, owner: "Karim Hourani" },
    { title: "Dead Sea Spa Refit",            description: "Full renovation of the wellness wing — Thalasso pool + private cabanas.",         stage: "APPROVED",    budget: 880_000,   priority: "MEDIUM", startQ: "2026-Q3", targetQ: "2027-Q1", progress: 12, owner: "Sara Tarawneh" },
    { title: "Loyalty Program Relaunch",      description: "New Hourani Loyalty tier system + mobile app integration.",                       stage: "PLANNED",     budget: 220_000,   priority: "MEDIUM", startQ: "2026-Q4", targetQ: "2027-Q1", progress: 0,  owner: "Lina Saifi" },
    { title: "Solar Rooftop Phase 1",         description: "PV on Amman + Aqaba rooftops. Target 35% utility offset.",                        stage: "RESEARCH",    budget: 540_000,   priority: "MEDIUM", startQ: "2027-Q1", targetQ: "2027-Q4", progress: 0,  owner: "Omar Kilani" },
    { title: "Conference Wing AV Upgrade",    description: "Replace decade-old AV with hybrid-meeting kit + LED walls.",                      stage: "IDEA",        budget: 145_000,   priority: "LOW",    startQ: "2027-Q2", targetQ: "2027-Q3", progress: 0,  owner: "Reem Najjar" },
  ],
  MAHA: [
    { title: "Goat Milk Production Line",     description: "New SKU line: organic goat milk + labneh. Targets premium MENA retail.",          stage: "PLANNED",     budget: 850_000,   priority: "HIGH",   startQ: "2026-Q3", targetQ: "2027-Q2", progress: 8,  owner: "Hassan Maha"   },
    { title: "Cold-Chain Telemetry Rollout",  description: "IoT temp/humidity sensors across every refrigerated truck.",                       stage: "IN_PROGRESS", budget: 195_000,   priority: "MEDIUM", startQ: "2026-Q1", targetQ: "2026-Q4", progress: 55, owner: "Aisha Nasser"  },
    { title: "Lactose-Free Range",            description: "R&D for lactose-free milk + yogurt. 6-month lab + market test.",                  stage: "RESEARCH",    budget: 320_000,   priority: "MEDIUM", startQ: "2026-Q4", targetQ: "2027-Q3", progress: 0,  owner: "Rabia Al-Mansour" },
    { title: "Maha Cheese Cellar",            description: "Aged cheese cave for boutique distribution to hotels + airlines.",                 stage: "IDEA",        budget: 480_000,   priority: "LOW",    startQ: "2027-Q2", targetQ: "2028-Q2", progress: 0,  owner: "Ibrahim Sweidan"   },
  ],
  LORAN: [
    { title: "Hydroponic Greenhouse Phase 2", description: "Triple the greenhouse footprint. Year-round tomato + cucumber.",                  stage: "IN_PROGRESS", budget: 420_000,   priority: "URGENT", startQ: "2026-Q1", targetQ: "2026-Q4", progress: 67, owner: "Yusuf Mahmoud" },
    { title: "Olive Oil Cold Press",           description: "Replace hot-press line with stone-cold press. Sells premium.",                   stage: "APPROVED",    budget: 285_000,   priority: "HIGH",   startQ: "2026-Q3", targetQ: "2027-Q1", progress: 18, owner: "Layla Najjar"  },
    { title: "Drip Irrigation Phase 3",        description: "Final 200 dunums switched from flood to drip irrigation.",                        stage: "PLANNED",     budget: 140_000,   priority: "MEDIUM", startQ: "2027-Q1", targetQ: "2027-Q3", progress: 0,  owner: "Hassan El-Karim" },
    { title: "Organic Certification — EU",     description: "Pursue EU organic cert for export channel.",                                      stage: "RESEARCH",    budget: 95_000,    priority: "MEDIUM", startQ: "2027-Q2", targetQ: "2028-Q2", progress: 0,  owner: "Maria Garcia"  },
  ],
  TANK: [
    { title: "AI Cohort 2027",                description: "Next-gen incubator cohort focused on Jordanian AI startups.",                     stage: "PLANNED",     budget: 180_000,   priority: "HIGH",   startQ: "2026-Q4", targetQ: "2027-Q3", progress: 5,  owner: "Linda Marshall" },
    { title: "Mentor Network MENA Expansion", description: "Recruit 30+ MENA-region mentors. Cross-cohort sessions.",                          stage: "IN_PROGRESS", budget: 85_000,    priority: "MEDIUM", startQ: "2026-Q2", targetQ: "2027-Q1", progress: 42, owner: "Khaled Hourani" },
    { title: "Tank-Lab — Climate Tech",       description: "Sub-incubator for climate + clean energy ventures.",                              stage: "IDEA",        budget: 220_000,   priority: "LOW",    startQ: "2027-Q3", targetQ: "2028-Q3", progress: 0,  owner: "Sara Tarawneh" },
  ],
};

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, code: true } });
  const byCode = new Map(companies.map((c) => [c.code, c.id]));
  let writtenProjects = 0;

  for (const [code, projects] of Object.entries(PROJECTS)) {
    const cid = byCode.get(code);
    if (!cid) continue;
    let idx = 0;
    for (const p of projects) {
      idx++;
      const id = did("proj", code, idx);
      await prisma.futureProject.upsert({
        where: { id },
        create: {
          id,
          companyId: cid,
          title: p.title,
          description: p.description,
          stage: p.stage,
          budgetJod: p.budget,
          priority: p.priority,
          startQuarter: p.startQ,
          targetQuarter: p.targetQ,
          progressPct: p.progress,
          ownerName: p.owner,
        },
        update: {
          title: p.title,
          description: p.description,
          stage: p.stage,
          budgetJod: p.budget,
          priority: p.priority,
          startQuarter: p.startQ,
          targetQuarter: p.targetQ,
          progressPct: p.progress,
          ownerName: p.owner,
        },
      });
      writtenProjects++;
    }
  }

  // One example CouncilDiscussion per tenant so /brain/council isn't
  // empty on first visit.
  // Pitch-grade decision threads — each is a real strategic dilemma with a
  // quantified trade-off, written so the specialist sub-agents have something
  // meaty to debate. The owner/admin (no tenant cookie) sees the whole set.
  // `key` → the stable row id (so threads don't collide on upsert; the keys
  // that match the original slugs overwrite the pre-existing prod rows instead
  // of leaving stale orphans). `slug` → the opaque tenantId the council page
  // scopes by. They're ALL pinned to the demo-visible tenant ("maha-dairy")
  // so the panel is rich whether the demo session is tenant-scoped to that
  // slug OR runs as ADMIN (null slug = pass-through, sees everything). The
  // titles span sectors on purpose — this is the GROUP council feed.
  const discussions: Array<{ key: string; slug: string; title: string; body: string }> = [
    {
      key: "maha-dairy",
      slug: "maha-dairy",
      title: "Lactose-free range — 3-SKU pilot or 7-SKU full launch?",
      body: "Lactose-free is up 22% in MENA retail, but a 7-SKU launch needs JOD 180k of new packaging tooling and a second cold line. A 3-SKU pilot de-risks demand at a fraction of the cost — but cedes shelf presence to a competitor who is already moving. Council: weigh capital exposure against first-mover shelf share.",
    },
    {
      key: "maha-coldchain",
      slug: "maha-dairy",
      title: "Cold-chain breach at the Amman DC — 3,200L exposed for 90 min",
      body: "A loading-bay compressor failed; 3,200L of fresh milk sat at 9°C for ~90 minutes. Dump it all (≈JOD 4,100 write-off, zero risk), lab test-and-release (48h delay, retail contract pressure), or divert to processed cheese where the thermal exposure is moot? Council: balance brand-safety against recoverable value.",
    },
    {
      key: "hourani-hotels",
      slug: "maha-dairy",
      title: "Arena Sofia occupancy forecast down 15% next month — pre-empt or ride it out?",
      body: "The demand model projects a 15% occupancy dip driven by a soft corporate-travel month. We can launch a 3-night long-stay promo now (protects revenue, dilutes ADR ~6%) or hold rate and absorb the dip. Council: defend RevPAR vs. defend headline rate.",
    },
    {
      key: "hourani-hotels-gulf",
      slug: "maha-dairy",
      title: "Gulf group wants an exclusive annual rate — 600 room-nights, margin-dilutive",
      body: "A Gulf travel group offers a guaranteed 600 room-nights a year, but only at 18% below our shoulder-season floor. It fills the weakest weeks and smooths cash flow — yet anchors a discount that's hard to unwind. Council: lock predictable volume or protect the rate card?",
    },
    {
      key: "loran-agri",
      slug: "maha-dairy",
      title: "EU organic certification — worth the 24-month wait for a 9% premium?",
      body: "Certification costs are modest but the conversion window is two full seasons, during which we sell as conventional. The payoff is a 9% export price premium and access to EU buyers. Council: commit the land now or stay MENA-focused and redeploy the capital faster?",
    },
    {
      key: "loran-sensor",
      slug: "maha-dairy",
      title: "Greenhouse sensor array is drifting — replace (JOD 40k) or recalibrate?",
      body: "Soil-moisture readings have drifted 6 points over 72 hours, silently over-irrigating two blocks and degrading both yield and water-use ESG metrics. Replace the full array (JOD 40k, clean signal) or recalibrate and monitor weekly (cheap, but the drift may recur at harvest). Council: capex certainty vs. operational patching.",
    },
    {
      key: "tank-incubator",
      slug: "maha-dairy",
      title: "AI cohort 2027 — open enrollment to all MENA founders or keep it Jordan-only?",
      body: "Opening to the wider MENA pool lifts applicant quality and the program's regional brand, but stretches mentor capacity and complicates our local-impact mandate with the university. Council: scale the network or deepen the home base?",
    },
    {
      key: "maha-surplus",
      slug: "maha-dairy",
      title: "Reinvest the Q2 surplus into an Aqaba line or retire the Arena renovation loan early?",
      body: "Q2 closed with a JOD 471k surplus. Option A: seed a second dairy line near Aqaba to shorten lead time to the southern hotels. Option B: pay down the Arena renovation loan early and cut interest drag. Council: growth optionality vs. balance-sheet strength.",
    },
  ];
  let writtenDisc = 0;
  for (let i = 0; i < discussions.length; i++) {
    const d = discussions[i];
    const id = did("disc", d.key);
    await prisma.councilDiscussion.upsert({
      where: { id },
      create: { id, tenantId: d.slug, title: d.title, body: d.body, status: "OPEN" },
      update: { tenantId: d.slug, title: d.title, body: d.body },
    });
    writtenDisc++;
  }

  console.log(`Projects written/touched: ${writtenProjects}`);
  console.log(`Council discussions seeded: ${writtenDisc}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
