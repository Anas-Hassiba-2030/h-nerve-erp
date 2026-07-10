// seedFederation.ts — synthesize 14 anonymized peers across 4 tiers,
// each contributing to overlapping pattern clusters. The aggregator then
// surfaces only the patterns that meet K=5 anonymity.
//
// Phase 8 of docs/governance/PHASES-INTELLIGENCE.md.

import { prisma } from "@/lib/db/db";
import { randomBytes } from "node:crypto";

type PeerSpec = {
  tier: string;
  region: string;
  size: string;
  vertical: string;
  contributions: Array<{
    patternKey: string;
    module: string;
    category: string | null;
    outcomeDelta: number;
  }>;
};

// Realistic, slightly varied contributions across 14 peers.
// Each pattern key appears across multiple peers to clear K-anonymity = 5.
const PEERS: PeerSpec[] = [
  // ── Hotels tier (mid-luxury MENA, 300-700 rooms) — 6 peers ────────
  ...Array.from({ length: 6 }, (_, i) => ({
    tier: "hotels-300-700-mena-midluxury",
    region: "MENA",
    size: "300-700",
    vertical: "hotels",
    contributions: [
      { patternKey: "fb-promo-cheese", module: "HOTELS", category: "fb_promo", outcomeDelta: 0.18 + i * 0.012 },
      { patternKey: "heatwave-pre-discount", module: "HOTELS", category: "heatwave", outcomeDelta: 0.31 + i * 0.008 },
      ...(i < 5 ? [{ patternKey: "council-fast-track", module: "GROUP", category: "council", outcomeDelta: 0.21 + i * 0.01 }] : []),
    ],
  })),

  // ── Dairy tier (mid-volume MENA) — 5 peers ─────────────────────────
  ...Array.from({ length: 5 }, (_, i) => ({
    tier: "dairy-1k-5k-mena-midvolume",
    region: "MENA",
    size: "1k-5k",
    vertical: "dairy",
    contributions: [
      { patternKey: "labneh-expiry-redirect", module: "DAIRY", category: "expiry", outcomeDelta: 0.085 + i * 0.006 },
      { patternKey: "energy-hedge-90d", module: "FINANCE", category: "treasury", outcomeDelta: 0.054 + i * 0.004 },
      ...(i < 5 ? [{ patternKey: "council-fast-track", module: "GROUP", category: "council", outcomeDelta: 0.18 + i * 0.012 }] : []),
    ],
  })),

  // ── Farms tier (MENA, greenhouse) — 5 peers ────────────────────────
  ...Array.from({ length: 5 }, (_, i) => ({
    tier: "farms-mena-mixed",
    region: "MENA",
    size: "100-500dunum",
    vertical: "farms",
    contributions: [
      { patternKey: "moisture-escalation", module: "FARMS", category: "moisture", outcomeDelta: 0.12 + i * 0.01 },
      ...(i < 5 ? [{ patternKey: "council-fast-track", module: "GROUP", category: "council", outcomeDelta: 0.16 + i * 0.012 }] : []),
    ],
  })),
];

export async function seedFederation(): Promise<{
  cleared: number;
  written: number;
  durationMs: number;
}> {
  const t0 = Date.now();
  // Clear previous synthetic peers (everyone — no real tenants in dev).
  const cleared = await prisma.federationPeer.deleteMany({});

  let written = 0;
  for (const p of PEERS) {
    const peerToken = `peer_${randomBytes(8).toString("hex")}`;
    await prisma.federationPeer.create({
      data: {
        peerToken,
        tier: p.tier,
        region: p.region,
        size: p.size,
        vertical: p.vertical,
        contributionsJson: JSON.stringify(p.contributions),
      },
    });
    written++;
  }

  // Also clear stale aggregated patterns so the page reflects the fresh peer set.
  await prisma.federationPattern.deleteMany({});

  return { cleared: cleared.count, written, durationMs: Date.now() - t0 };
}
