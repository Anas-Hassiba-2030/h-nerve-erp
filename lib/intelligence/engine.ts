// lib/intelligence/engine.ts
//
// Phase 10 — the rule-based Brain engine. (Lives here, NOT in
// lib/brain/, which the parallel Claude-desktop session owns. This is
// self-contained: no LLM calls, template-string insight text — the
// sector-LLM layer is Phase 12.)
//
// BOUNDARY (decision #1): the Brain READS operational data
// (Product / InventoryMovement / ImportLog) and writes ONLY its own
// BrainInsight table. It never calls recordMovement / postJournalEntry
// or any operational write helper. Humans act on recommendations.
//
// Four analyzers → upsert into BrainInsight with dedup so re-running
// never floods. resolvedAt / dismissedAt are NEVER touched on update,
// so a dismissed insight stays dismissed across re-runs.

import type { BrainInsight } from "@prisma/client";
import { prismaUnscoped } from "@/lib/db";

const DEFAULT_REORDER_POINT = 50;
const STALE_DAYS = 30;
const ANOMALY_WINDOW_HOURS = 24;
const ANOMALY_REJECT_RATE = 0.2;

// Same transaction-client alias as lib/orders.ts / lib/transfers.ts.
type Db = Parameters<Parameters<typeof prismaUnscoped.$transaction>[0]>[0];

export type BrainAnalysisResult = {
  generated: number;
  updated: number;
  unchanged: number;
  insights: BrainInsight[];
};

type Candidate = {
  type: "LOW_STOCK" | "REORDER_RECOMMENDATION" | "STALE_PRODUCT" | "IMPORT_ANOMALY";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  productId: string | null;
  supplierId: string | null;
  warehouseId: string | null;
  /** Import anomalies have productId NULL (can't use the compound
   *  unique — SQLite NULLs are distinct); they dedup on this instead. */
  importLogId?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Analyzers (private) -------------------------------------------------

async function analyzeLowStock(db: Db, tenantId: string): Promise<Candidate[]> {
  const products = await db.product.findMany({
    where: { tenantId, deletedAt: null },
    include: { warehouseRef: { select: { code: true } } },
  });
  const out: Candidate[] = [];
  for (const p of products) {
    const rp = p.reorderPoint ?? DEFAULT_REORDER_POINT;
    if (p.quantity >= rp) continue;
    const severity = p.quantity < rp / 2 ? "CRITICAL" : "WARNING";
    out.push({
      type: "LOW_STOCK",
      severity,
      title: `Low stock: ${p.sku} at ${p.warehouseRef.code}`,
      body: `Current quantity ${p.quantity} is below reorder point ${rp}.`,
      metadata: {
        productId: p.id,
        sku: p.sku,
        quantity: p.quantity,
        reorderPoint: rp,
        warehouseId: p.warehouseId,
      },
      productId: p.id,
      supplierId: null,
      warehouseId: p.warehouseId,
    });
  }
  return out;
}

async function analyzeReorderNeeds(
  db: Db,
  tenantId: string,
): Promise<Candidate[]> {
  const products = await db.product.findMany({
    where: { tenantId, deletedAt: null, supplierId: { not: null } },
    include: { supplierRef: { select: { name: true } } },
  });
  const out: Candidate[] = [];
  for (const p of products) {
    const rp = p.reorderPoint ?? DEFAULT_REORDER_POINT;
    if (p.quantity >= rp || !p.supplierId) continue;
    const suggestedQty = Math.max(rp * 2 - p.quantity, 1);
    const lastRecv = await db.inventoryMovement.findFirst({
      where: {
        productId: p.id,
        type: "RECEIVED",
        unitCost: { not: null },
        deletedAt: null,
      },
      orderBy: { occurredAt: "desc" },
      select: { unitCost: true },
    });
    const lastCost =
      lastRecv?.unitCost != null ? Number(lastRecv.unitCost) : null;
    const estimatedTotal =
      lastCost != null ? round2(suggestedQty * lastCost) : null;
    const supplierName = p.supplierRef?.name ?? "(unknown supplier)";
    out.push({
      type: "REORDER_RECOMMENDATION",
      severity: "INFO",
      title: `Reorder recommended: ${p.sku} from ${supplierName}`,
      body:
        `Suggested order: ${suggestedQty} units. ` +
        (lastCost != null
          ? `Estimated cost: ${estimatedTotal} JOD.`
          : `No cost data available.`),
      metadata: {
        productId: p.id,
        supplierId: p.supplierId,
        suggestedQty,
        lastCost,
        estimatedTotal,
      },
      productId: p.id,
      supplierId: p.supplierId,
      warehouseId: p.warehouseId,
    });
  }
  return out;
}

async function analyzeStaleProducts(
  db: Db,
  tenantId: string,
): Promise<Candidate[]> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000);
  const products = await db.product.findMany({
    where: { tenantId, deletedAt: null, quantity: { gt: 0 } },
    select: { id: true, sku: true, quantity: true, warehouseId: true },
  });
  if (products.length === 0) return [];
  const last = await db.inventoryMovement.groupBy({
    by: ["productId"],
    where: { deletedAt: null, productId: { in: products.map((p) => p.id) } },
    _max: { occurredAt: true },
  });
  const lastByProduct = new Map(
    last.map((r) => [r.productId, r._max.occurredAt]),
  );
  const out: Candidate[] = [];
  for (const p of products) {
    const lastMovementAt = lastByProduct.get(p.id) ?? null;
    if (lastMovementAt && lastMovementAt >= cutoff) continue;
    out.push({
      type: "STALE_PRODUCT",
      severity: "WARNING",
      title: `Stale stock: ${p.sku}`,
      body: `No movement recorded in ${STALE_DAYS} days. Current stock: ${p.quantity} units.`,
      metadata: {
        productId: p.id,
        sku: p.sku,
        quantity: p.quantity,
        lastMovementAt: lastMovementAt ? lastMovementAt.toISOString() : null,
      },
      productId: p.id,
      supplierId: null,
      warehouseId: p.warehouseId,
    });
  }
  return out;
}

async function analyzeImportAnomalies(
  db: Db,
  tenantId: string,
): Promise<Candidate[]> {
  const since = new Date(Date.now() - ANOMALY_WINDOW_HOURS * 3_600_000);
  const logs = await db.importLog.findMany({
    where: { tenantId, createdAt: { gte: since } },
  });
  const out: Candidate[] = [];
  for (const l of logs) {
    const total = l.accepted + l.rejected;
    if (total <= 0) continue;
    const rate = l.rejected / total;
    if (rate <= ANOMALY_REJECT_RATE) continue;
    const pct = Math.round(rate * 100);
    out.push({
      type: "IMPORT_ANOMALY",
      severity: "WARNING",
      title: `High rejection rate: import batch ${l.source ?? "(unlabeled)"}`,
      body: `${l.rejected} of ${total} rows rejected (${pct}%). Review mapping or source data.`,
      metadata: {
        importLogId: l.id,
        source: l.source,
        accepted: l.accepted,
        rejected: l.rejected,
        rejectionRate: round2(rate),
      },
      productId: null,
      supplierId: null,
      warehouseId: null,
      importLogId: l.id,
    });
  }
  return out;
}

// --- Upsert with dedup ---------------------------------------------------

function sameContent(
  existing: { title: string; body: string; severity: string; metadata: string },
  c: Candidate,
  metaJson: string,
): boolean {
  return (
    existing.title === c.title &&
    existing.body === c.body &&
    existing.severity === c.severity &&
    existing.metadata === metaJson
  );
}

// --- Public API ----------------------------------------------------------

/**
 * Run all four analyzers for one tenant, upsert their findings, and
 * return a summary. Atomic — the whole pass runs in one transaction so
 * a mid-run failure leaves the insight set untouched.
 */
export async function runBrainAnalysis(
  tenantId: string,
): Promise<BrainAnalysisResult> {
  return prismaUnscoped.$transaction(async (db) => {
    const candidates = [
      ...(await analyzeLowStock(db, tenantId)),
      ...(await analyzeReorderNeeds(db, tenantId)),
      ...(await analyzeStaleProducts(db, tenantId)),
      ...(await analyzeImportAnomalies(db, tenantId)),
    ];
    // Phase F-Polish — Neon pooled latency can push a multi-tenant pass
    // past the default 5s. Generous ceiling; the analyzers are bounded
    // (~50ms each on the seeded data) so this won't accidentally hold
    // a long lock.

    let generated = 0;
    let updated = 0;
    let unchanged = 0;
    const insights: BrainInsight[] = [];

    for (const c of candidates) {
      const metaJson = JSON.stringify(c.metadata);

      // Locate an existing row. Product-scoped → the compound unique.
      // Import anomalies (productId NULL) → match the importLogId inside
      // the JSON metadata (SQLite NULLs are distinct, so the unique
      // can't dedup them).
      const existing =
        c.productId != null
          ? await db.brainInsight.findUnique({
              where: {
                tenantId_type_productId: {
                  tenantId,
                  type: c.type,
                  productId: c.productId,
                },
              },
            })
          : await db.brainInsight.findFirst({
              where: {
                tenantId,
                type: c.type,
                metadata: { contains: `"importLogId":"${c.importLogId}"` },
              },
            });

      if (!existing) {
        const created = await db.brainInsight.create({
          data: {
            tenantId,
            type: c.type,
            severity: c.severity,
            title: c.title,
            body: c.body,
            metadata: metaJson,
            productId: c.productId,
            supplierId: c.supplierId,
            warehouseId: c.warehouseId,
          },
        });
        generated++;
        insights.push(created);
        continue;
      }

      if (sameContent(existing, c, metaJson)) {
        unchanged++;
        insights.push(existing);
        continue;
      }

      // Refresh content only — resolvedAt / dismissedAt are left as-is
      // so a dismissed/resolved insight is never resurrected.
      const next = await db.brainInsight.update({
        where: { id: existing.id },
        data: {
          severity: c.severity,
          title: c.title,
          body: c.body,
          metadata: metaJson,
          supplierId: c.supplierId,
          warehouseId: c.warehouseId,
        },
      });
      updated++;
      insights.push(next);
    }

    return { generated, updated, unchanged, insights };
  }, { timeout: 30_000, maxWait: 5_000 });
}

export async function dismissInsight(insightId: string): Promise<void> {
  await prismaUnscoped.brainInsight.update({
    where: { id: insightId },
    data: { dismissedAt: new Date() },
  });
}

export async function resolveInsight(insightId: string): Promise<void> {
  await prismaUnscoped.brainInsight.update({
    where: { id: insightId },
    data: { resolvedAt: new Date() },
  });
}
