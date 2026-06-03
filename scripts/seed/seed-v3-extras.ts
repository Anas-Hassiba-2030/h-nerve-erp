// scripts/seed-v3-extras.ts
//
// Phase V3 — extends prisma/seed-demo.ts coverage:
//   - FutureProject rows per Company (was empty → /projects all zeros)
//   - One example CouncilDiscussion per tenant so /brain/council has
//     content above the system-generated CouncilSession list

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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
  const discussions: Array<{ slug: string; title: string; body: string }> = [
    { slug: "hourani-hotels", title: "How should we respond to Aqaba's drop in repeat-guest rate?", body: "Repeat-guest rate fell 8% QoQ. Council: triage marketing spend vs. service-quality investments." },
    { slug: "maha-dairy",     title: "Lactose-free range — pilot scope decision",                  body: "Need to choose between a 3-SKU pilot or a 7-SKU full launch. Council weighs cost vs. shelf presence." },
    { slug: "loran-agri",     title: "EU organic cert: worth the 24-month wait?",                  body: "Investment is small, but the export window is long. Discuss whether to pursue or focus MENA-only." },
    { slug: "tank-incubator", title: "AI cohort 2027 — applicant pool gating",                     body: "Should we open enrollment to any MENA-region founder, or restrict to Jordan-based teams?" },
  ];
  let writtenDisc = 0;
  for (let i = 0; i < discussions.length; i++) {
    const d = discussions[i];
    const id = did("disc", d.slug);
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
