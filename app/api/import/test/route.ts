// app/api/import/test/route.ts
//
//   POST /api/import/test
//   Authorization: Bearer <IMPORT_API_TOKEN>
//   Body: { source?: string, tenantId?: string, records: object[] }
//         (a bare array is still accepted for back-compat)
//   →  200 { accepted, rejected, errors }
//   →  401 unauthorized · 503 token unset · 400 bad body
//   →  429 { error } + Retry-After  (cap: 100 req / 60s per tenant)
//
// Bearer-authenticated external ingestion endpoint. Each record must
// carry a non-empty `sku`; the other warehouse fields are optional and
// preserved. Every call writes one ImportLog batch header plus one
// ImportRow per record (structured columns + verbatim rowData) so
// /admin/imports can query and expand them. SQLite as-is.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prismaUnscoped } from "@/lib/db";
import { checkImportRate, IMPORT_MAX_PER_WINDOW } from "@/lib/importRateLimit";
import {
  applyMapping,
  parseMappingRow,
  sourceMatchesSystem,
} from "@/lib/importMapping";
import { recordMovement, recalcProductQuantity } from "@/lib/inventory";
import { findOrCreateSupplier } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportError = { index: number; error: string };

// Only `sku` is required. Every other field is optional and, if the
// wrong type, falls back to undefined (.catch) rather than failing the
// whole record — the verbatim value is still kept in rowData.
const RecordSchema = z
  .object({
    sku: z
      .string({ required_error: "sku is required", invalid_type_error: "sku is required" })
      .trim()
      .min(1, "sku is required"),
    name: z.string().trim().optional().catch(undefined),
    quantity: z.number().int().optional().catch(undefined),
    unitCost: z.number().optional().catch(undefined),
    supplier: z.string().trim().optional().catch(undefined),
    warehouse: z.string().trim().optional().catch(undefined),
  })
  .passthrough();

const PayloadSchema = z.object({
  source: z.string().trim().max(120).optional(),
  tenantId: z.string().trim().max(64).optional(),
  records: z.array(z.unknown()).max(10_000),
});

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  // --- Bearer auth ---
  const expected = process.env.IMPORT_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "import endpoint not configured (IMPORT_API_TOKEN unset)" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!m || !tokenMatches(m[1], expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // --- Body ---
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  // Back-compat: a bare array is treated as { records: [...] }.
  const envelope = Array.isArray(raw) ? { records: raw } : raw;
  const parsed = PayloadSchema.safeParse(envelope);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "expected { records: [...], source?, tenantId? } or an array",
        detail: parsed.error.issues[0]?.message,
      },
      { status: 400 },
    );
  }
  const { source = null, tenantId = null, records } = parsed.data;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  // --- Rate limit (per tenant; tenantId is caller-controlled so fall
  // back to ip, then a shared bucket) ---
  const rateKey = `t:${tenantId ?? ip ?? "anon"}`;
  const rate = checkImportRate(rateKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `rate limit exceeded (max ${IMPORT_MAX_PER_WINDOW}/min)`,
        retryAfter: rate.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  // --- Per-tenant column mapping (Phase 4). Opt-in: resolved by
  // (tenantId, sourceSystem) where sourceSystem is a hyphen-bounded
  // prefix of the batch `source` ("maha-erp" ⊂ "maha-erp-2026-…"),
  // longest match wins (robust to hyphenated systems like
  // "hotel-pms-excel" — a naive split-on-first-"-" would break those).
  // Placed AFTER the rate limiter so a flood can't hammer the mappings
  // table, and BEFORE the per-record Zod so records are canonical
  // before validation. No mapping / inactive / bad JSON → unchanged
  // (backward compatible). prismaUnscoped: TenantImportMapping has no
  // companyId, so workspace-scoping is moot (consistent w/ this file).
  let mappingApplied = false;
  let mappingSourceSystem: string | null = null;
  let effectiveRecords: unknown[] = records;
  if (tenantId && source) {
    const candidates = await prismaUnscoped.tenantImportMapping.findMany({
      where: { tenantId, active: true },
    });
    const hit = candidates
      .filter((mp) => sourceMatchesSystem(source, mp.sourceSystem))
      .sort((a, b) => b.sourceSystem.length - a.sourceSystem.length)[0];
    const mapping = parseMappingRow(hit);
    if (mapping) {
      effectiveRecords = applyMapping({ records }, mapping).records;
      mappingApplied = true;
      mappingSourceSystem = hit.sourceSystem;
    }
  }

  // --- Validate + shape each record ---
  const errors: ImportError[] = [];
  const rowsToCreate: Array<{
    sku: string | null;
    productName: string | null;
    quantity: number | null;
    unitCost: number | null;
    supplier: string | null;
    warehouse: string | null;
    rowData: string;
    status: "ACCEPTED" | "REJECTED";
    error: string | null;
  }> = [];

  effectiveRecords.forEach((rec, index) => {
    // Verbatim copy for debugging, length-bounded so one giant record
    // can't bloat the table.
    const rowData = JSON.stringify(rec ?? null).slice(0, 4000);
    const r = RecordSchema.safeParse(rec);
    if (!r.success) {
      const msg =
        r.error.issues.find((i) => i.path[0] === "sku")?.message ??
        r.error.issues[0]?.message ??
        "invalid record";
      errors.push({ index, error: msg });
      rowsToCreate.push({
        sku: null,
        productName: null,
        quantity: null,
        unitCost: null,
        supplier: null,
        warehouse: null,
        rowData,
        status: "REJECTED",
        error: msg,
      });
      return;
    }
    const d = r.data;
    rowsToCreate.push({
      sku: d.sku,
      productName: d.name ?? null,
      quantity: d.quantity ?? null,
      unitCost: d.unitCost ?? null,
      supplier: d.supplier ?? null,
      warehouse: d.warehouse ?? null,
      rowData,
      status: "ACCEPTED",
      error: null,
    });
  });

  const accepted = rowsToCreate.filter((r) => r.status === "ACCEPTED").length;
  const rejected = errors.length;
  const status =
    accepted > 0 && rejected > 0
      ? "PARTIAL"
      : rejected > 0
        ? "REJECTED"
        : "OK";

  // --- Persist: ImportLog + ImportRow audit trail AND upsert accepted
  // rows into the operational Product table — ONE transaction so an
  // ImportRow can never point at a Product that wasn't written. Outer
  // try/catch preserves Phase 1–2 behaviour (a DB hiccup logs + still
  // returns the import result, never a 500). ---
  let created = 0;
  let updated = 0;
  let movementsCreated = 0;
  // Product.tenantId is required; the wire field is optional. Tenant-less
  // imports fall back to "default" (single-tenant default).
  const productTenant = tenantId ?? "default";
  try {
    await prismaUnscoped.$transaction(async (tx) => {
      const log = await tx.importLog.create({
        data: {
          endpoint: "test",
          source,
          tenantId,
          accepted,
          rejected,
          errors: errors.length ? JSON.stringify(errors.slice(0, 100)) : null,
          status,
          ip,
        },
      });

      // Products this batch touched — recalc each ONCE after all
      // movements are recorded (spec step 3), inside the same tx so the
      // cache and the ledger commit together.
      const affected = new Set<string>();

      for (const r of rowsToCreate) {
        let productId: string | null = null;
        if (r.status === "ACCEPTED" && r.sku) {
          // Phase 7: auto-promote the supplier string to a real
          // Supplier (idempotent upsert on (tenantId,name), same tx).
          // n8n keeps sending the plain string; the first import that
          // sees it creates the entity and links supplierId.
          const sup = r.supplier
            ? await findOrCreateSupplier(tx, productTenant, r.supplier)
            : null;
          // findUnique + branch, not a bare upsert(): upsert() can't
          // report created-vs-updated, which the response needs.
          const existing = await tx.product.findUnique({
            where: { tenantId_sku: { tenantId: productTenant, sku: r.sku } },
            select: { id: true },
          });
          if (existing) {
            // Only overwrite fields the import actually provided — never
            // clobber existing data with a null (decision #4 spirit).
            // quantity is intentionally NOT written here: it is a cache
            // owned solely by recalcProductQuantity (decision #2).
            await tx.product.update({
              where: { id: existing.id },
              data: {
                lastImportedAt: new Date(),
                importCount: { increment: 1 },
                ...(r.productName != null ? { name: r.productName } : {}),
                ...(r.unitCost != null ? { unitCost: r.unitCost } : {}),
                ...(sup ? { supplierId: sup.id } : {}),
                ...(r.warehouse != null ? { warehouse: r.warehouse } : {}),
              },
            });
            // oldQty from the LIVE ledger sum inside this tx (Option B):
            // for a normal existing product this equals its cached
            // quantity (post-backfill invariant); for the same brand-new
            // SKU appearing twice in one batch the IMPORT movement is
            // already counted, so delta resolves to 0 instead of
            // double-counting. Source of truth = SUM(delta) (#2).
            const agg = await tx.inventoryMovement.aggregate({
              _sum: { delta: true },
              where: { productId: existing.id, deletedAt: null },
            });
            const oldQty = agg._sum.delta ?? 0;
            const newQty = r.quantity ?? oldQty;
            const mv = await recordMovement(tx, {
              tenantId: productTenant,
              productId: existing.id,
              type: "ADJUSTMENT",
              delta: newQty - oldQty, // 0 → recordMovement no-ops
              reason: `Reconciliation from import: ${source ?? "unknown"}`,
              sourceImportLogId: log.id,
            });
            if (mv) movementsCreated++;
            productId = existing.id;
            affected.add(existing.id);
            updated++;
          } else {
            // Create at 0 and let recalc fill from the IMPORT movement
            // below — recalcProductQuantity stays the SINGLE writer of
            // Product.quantity (decision #2).
            const p = await tx.product.create({
              data: {
                tenantId: productTenant,
                sku: r.sku,
                name: r.productName ?? r.sku, // name is required; fall back to sku
                quantity: 0,
                unitCost: r.unitCost ?? null,
                supplierId: sup?.id ?? null,
                warehouse: r.warehouse ?? null,
              },
              select: { id: true },
            });
            const mv = await recordMovement(tx, {
              tenantId: productTenant,
              productId: p.id,
              type: "IMPORT",
              delta: r.quantity ?? 0, // 0 → recordMovement no-ops
              reason: `Initial import: ${source ?? "unknown"}`,
              sourceImportLogId: log.id,
            });
            if (mv) movementsCreated++;
            productId = p.id;
            affected.add(p.id);
            created++;
          }
        }
        await tx.importRow.create({
          data: { ...r, importLogId: log.id, productId },
        });
      }

      // Recompute the denormalized cache once per touched product, from
      // the ledger that now includes this batch's movements.
      for (const id of affected) {
        await recalcProductQuantity(tx, id);
      }
    });
  } catch (e) {
    console.error("[import] failed to persist batch:", e);
    created = 0;
    updated = 0;
    movementsCreated = 0;
  }

  return NextResponse.json(
    {
      accepted,
      rejected,
      errors,
      upserted: { created, updated },
      movements: { created: movementsCreated },
      mapping: {
        applied: mappingApplied,
        ...(mappingSourceSystem ? { sourceSystem: mappingSourceSystem } : {}),
      },
    },
    { status: 200 },
  );
}
