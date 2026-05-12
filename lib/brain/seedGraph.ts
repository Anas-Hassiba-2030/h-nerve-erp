// seedGraph.ts — walks the existing domain entities and produces the
// initial BrainNode + BrainEdge population. Idempotent: re-running just
// updates labels/payloads/edges without duplicating.
//
// Two passes:
//   1. STRUCTURAL — derived directly from foreign keys
//   2. CAUSAL     — hand-authored cross-domain causal rules (e.g.
//                   Hotel.occupancy → DairyBatch.demand)
//
// The set of causal rules below is deliberately conservative. The
// feedback loop (Phase 7) will adjust their weights over time, and the
// Meta brain (Phase 10) will eventually rewrite them.
//
// Phase 1 of docs/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db";

type BrainNodeIn = {
  id: string;
  kind: string;
  refId: string | null;
  label: string;
  payload: Record<string, number | string | boolean | null>;
  importance?: number;
};

type BrainEdgeIn = {
  fromId: string;
  toId: string;
  kind: "structural" | "causal";
  weight: number;
  confidence: number;
  rationale?: string;
};

/** Stable, deterministic node ID per (kind, refId). */
function nid(kind: string, refId: string): string {
  return `bn_${kind.toLowerCase()}_${refId}`;
}

export async function seedBrainGraph(): Promise<{
  nodesUpserted: number;
  edgesUpserted: number;
  durationMs: number;
}> {
  const t0 = Date.now();
  const nodes: BrainNodeIn[] = [];
  const edges: BrainEdgeIn[] = [];

  // ── Load every domain entity in parallel ──────────────────────────
  const [
    companies, hotels, bookings, dairyBatches, farms, crops, programs,
    transactions, forecasts, insights,
  ] = await Promise.all([
    prisma.company.findMany(),
    prisma.hotel.findMany(),
    prisma.booking.findMany(),
    prisma.dairyBatch.findMany(),
    prisma.farm.findMany(),
    prisma.crop.findMany(),
    prisma.program.findMany(),
    prisma.transaction.findMany(),
    prisma.supplyForecast.findMany(),
    prisma.aIInsight.findMany({ where: { deletedAt: null } }),
  ]);

  // ── Pass 1: nodes ─────────────────────────────────────────────────
  for (const c of companies) {
    nodes.push({
      id: nid("Company", c.id),
      kind: "Company",
      refId: c.id,
      label: c.nameEn || c.name,
      payload: {
        sector: c.sector,
        country: c.country,
        employees: c.employees,
        status: c.status,
      },
      importance: 1.0, // companies are most central
    });
  }

  for (const h of hotels) {
    nodes.push({
      id: nid("Hotel", h.id),
      kind: "Hotel",
      refId: h.id,
      label: h.name,
      payload: {
        rooms: h.totalRooms,
        rating: h.starRating ?? 0,
        city: h.city ?? "",
        tier: h.tier,
      },
      importance: 0.85,
    });
  }

  for (const b of bookings) {
    nodes.push({
      id: nid("Booking", b.id),
      kind: "Booking",
      refId: b.id,
      label: `${b.guestName} · ${b.reference}`,
      payload: {
        revenue: b.revenue,
        status: b.status,
        nights: Math.max(
          1,
          Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / (24 * 3600 * 1000))
        ),
      },
      importance: 0.4,
    });
  }

  for (const d of dairyBatches) {
    nodes.push({
      id: nid("DairyBatch", d.id),
      kind: "DairyBatch",
      refId: d.id,
      label: `${d.product} · ${d.batchNumber}`,
      payload: {
        liters: d.quantityLiters,
        grade: d.qualityGrade,
        status: d.status,
        productAr: d.productAr,
      },
      importance: 0.55,
    });
  }

  for (const f of farms) {
    nodes.push({
      id: nid("Farm", f.id),
      kind: "Farm",
      refId: f.id,
      label: f.name,
      payload: {
        type: f.type,
        size: f.areaDunum ?? 0,
        alertLevel: f.alertLevel,
        tempC: f.tempC ?? null,
        humidity: f.humidity ?? null,
      },
      importance: 0.7,
    });
  }

  for (const c of crops) {
    nodes.push({
      id: nid("Crop", c.id),
      kind: "Crop",
      refId: c.id,
      label: c.name,
      payload: {
        variety: c.variety ?? "",
        status: c.status,
      },
      importance: 0.35,
    });
  }

  for (const p of programs) {
    nodes.push({
      id: nid("Program", p.id),
      kind: "Program",
      refId: p.id,
      label: p.name,
      payload: {
        stage: p.stage,
        vertical: p.vertical,
        teamSize: p.teamSize,
        funding: p.fundingJod,
      },
      importance: 0.5,
    });
  }

  for (const t of transactions) {
    nodes.push({
      id: nid("Transaction", t.id),
      kind: "Transaction",
      refId: t.id,
      label: `${t.kind} · ${t.amount.toFixed(0)}`,
      payload: {
        amount: t.amount,
        kind: t.kind,
        category: t.category,
      },
      importance: 0.25,
    });
  }

  for (const f of forecasts) {
    nodes.push({
      id: nid("Forecast", f.id),
      kind: "Forecast",
      refId: f.id,
      label: f.productLabel,
      payload: {
        predicted: f.predictedDemand,
        confidence: f.confidence,
        unit: f.unit,
        status: f.status,
      },
      importance: 0.6,
    });
  }

  for (const i of insights) {
    nodes.push({
      id: nid("Insight", i.id),
      kind: "Insight",
      refId: i.id,
      label: i.title,
      payload: {
        severity: i.severity,
        module: i.module,
        status: i.status,
      },
      importance: 0.45,
    });
  }

  // ── Pass 2: structural edges (from foreign keys) ──────────────────
  for (const h of hotels) {
    if (h.companyId) {
      edges.push({
        fromId: nid("Hotel", h.id),
        toId: nid("Company", h.companyId),
        kind: "structural",
        weight: 1,
        confidence: 1,
        rationale: "Hotel belongs to Company",
      });
    }
  }
  for (const b of bookings) {
    edges.push({
      fromId: nid("Booking", b.id),
      toId: nid("Hotel", b.hotelId),
      kind: "structural",
      weight: 1,
      confidence: 1,
      rationale: "Booking belongs to Hotel",
    });
  }
  for (const d of dairyBatches) {
    if (d.companyId) {
      edges.push({
        fromId: nid("DairyBatch", d.id),
        toId: nid("Company", d.companyId),
        kind: "structural",
        weight: 1,
        confidence: 1,
        rationale: "Dairy batch belongs to Company",
      });
    }
  }
  for (const f of farms) {
    if (f.companyId) {
      edges.push({
        fromId: nid("Farm", f.id),
        toId: nid("Company", f.companyId),
        kind: "structural",
        weight: 1,
        confidence: 1,
        rationale: "Farm belongs to Company",
      });
    }
  }
  for (const c of crops) {
    edges.push({
      fromId: nid("Crop", c.id),
      toId: nid("Farm", c.farmId),
      kind: "structural",
      weight: 1,
      confidence: 1,
      rationale: "Crop is grown on Farm",
    });
  }
  for (const p of programs) {
    if (p.companyId) {
      edges.push({
        fromId: nid("Program", p.id),
        toId: nid("Company", p.companyId),
        kind: "structural",
        weight: 1,
        confidence: 1,
        rationale: "Program belongs to Company",
      });
    }
  }
  for (const t of transactions) {
    if (t.companyId) {
      edges.push({
        fromId: nid("Transaction", t.id),
        toId: nid("Company", t.companyId),
        kind: "structural",
        weight: 1,
        confidence: 1,
        rationale: "Transaction belongs to Company",
      });
    }
  }
  for (const f of forecasts) {
    edges.push({
      fromId: nid("Forecast", f.id),
      toId: nid("Company", f.sourceCompanyId),
      kind: "structural",
      weight: 1,
      confidence: 1,
      rationale: "Forecast originates from source Company",
    });
    edges.push({
      fromId: nid("Forecast", f.id),
      toId: nid("Company", f.targetCompanyId),
      kind: "structural",
      weight: 1,
      confidence: 1,
      rationale: "Forecast targets Company",
    });
  }

  // ── Pass 3: hand-authored CAUSAL edges (the value-add) ────────────
  // These are the edges that give the brain its predictive power.

  // 1. Hotel occupancy → Dairy demand for that company's dairy partners.
  //    When hotels in HOSPITALITY group fill, F&B drives dairy demand.
  const hospitalityCompanies = companies.filter((c) => c.sector === "HOSPITALITY");
  const dairyCompanies = companies.filter((c) => c.sector === "DAIRY");
  for (const h of hospitalityCompanies) {
    for (const d of dairyCompanies) {
      edges.push({
        fromId: nid("Company", h.id),
        toId: nid("Company", d.id),
        kind: "causal",
        weight: 0.55,
        confidence: 0.7,
        rationale:
          "Hospitality occupancy drives dairy demand via F&B procurement (~3-week lag)",
      });
    }
  }

  // 2. Dairy production → Agriculture feedstock demand
  const agriCompanies = companies.filter((c) => c.sector === "AGRICULTURE");
  for (const d of dairyCompanies) {
    for (const a of agriCompanies) {
      edges.push({
        fromId: nid("Company", d.id),
        toId: nid("Company", a.id),
        kind: "causal",
        weight: 0.45,
        confidence: 0.65,
        rationale: "Dairy production volume drives feedstock orders to agriculture units",
      });
    }
  }

  // 3. Farm health (alertLevel) → Crop expected harvest (negative when alerting)
  for (const f of farms) {
    if (f.alertLevel !== "OK") {
      const farmCrops = crops.filter((c) => c.farmId === f.id);
      for (const c of farmCrops) {
        edges.push({
          fromId: nid("Farm", f.id),
          toId: nid("Crop", c.id),
          kind: "causal",
          weight: f.alertLevel === "CRITICAL" ? -0.7 : -0.35,
          confidence: 0.75,
          rationale: `Farm in ${f.alertLevel} state suppresses crop yield`,
        });
      }
    }
  }

  // 4. Insight (CRITICAL) → Company (negative pressure)
  for (const i of insights) {
    if (i.severity !== "CRITICAL") continue;
    // Tie critical insights to all companies in the same sector module.
    const moduleToSector: Record<string, string> = {
      HOTELS: "HOSPITALITY",
      DAIRY: "DAIRY",
      FARMS: "AGRICULTURE",
      EDUCATION: "EDUCATION",
    };
    const sector = moduleToSector[i.module];
    if (!sector) continue;
    for (const c of companies.filter((x) => x.sector === sector)) {
      edges.push({
        fromId: nid("Insight", i.id),
        toId: nid("Company", c.id),
        kind: "causal",
        weight: -0.5,
        confidence: 0.6,
        rationale: `Critical insight in ${i.module} signals downside risk for ${sector} units`,
      });
    }
  }

  // 5. Forecast → Company (positive pressure if APPROVED)
  for (const f of forecasts) {
    if (f.status === "APPROVED") {
      edges.push({
        fromId: nid("Forecast", f.id),
        toId: nid("Company", f.targetCompanyId),
        kind: "causal",
        weight: 0.4,
        confidence: f.confidence,
        rationale: "Approved demand forecast lifts target company production planning",
      });
    }
  }

  // ── Persist (idempotent upserts in batches) ───────────────────────
  for (const n of nodes) {
    await prisma.brainNode.upsert({
      where: { id: n.id },
      create: {
        id: n.id,
        kind: n.kind,
        refId: n.refId,
        label: n.label,
        payloadJson: JSON.stringify(n.payload),
        importance: n.importance ?? 0.5,
      },
      update: {
        kind: n.kind,
        label: n.label,
        payloadJson: JSON.stringify(n.payload),
        importance: n.importance ?? 0.5,
      },
    });
  }

  for (const e of edges) {
    await prisma.brainEdge.upsert({
      where: {
        fromId_toId_kind: {
          fromId: e.fromId,
          toId: e.toId,
          kind: e.kind,
        },
      },
      create: {
        fromId: e.fromId,
        toId: e.toId,
        kind: e.kind,
        weight: e.weight,
        confidence: e.confidence,
        rationale: e.rationale,
      },
      update: {
        weight: e.weight,
        confidence: e.confidence,
        rationale: e.rationale,
      },
    });
  }

  return {
    nodesUpserted: nodes.length,
    edgesUpserted: edges.length,
    durationMs: Date.now() - t0,
  };
}
