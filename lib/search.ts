// Phase 10 — universal search across the ERP ops entities. Fail-soft
// per entity (one bad query never sinks search), capped, case-
// insensitive. Same shape discipline as lib/inbox. Consumed by
// /api/search and the ⌘K CommandPalette.

import { prisma } from "./db";

export type SearchKind =
  | "product" | "customer" | "supplier" | "invoice"
  | "warehouse" | "journal" | "brain";

export type SearchHit = {
  id: string;
  kind: SearchKind;
  label: string;
  sub: string;
  href: string;
};

const PER = 6;
const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

export async function universalSearch(qRaw: string): Promise<SearchHit[]> {
  const q = qRaw.trim();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  try {
    const rows = await prisma.product.findMany({
      where: { OR: [{ sku: ci(q) }, { name: ci(q) }] },
      take: PER, select: { id: true, sku: true, name: true },
    });
    for (const r of rows)
      hits.push({ id: r.id, kind: "product", label: r.name, sub: r.sku, href: `/admin/products?sku=${encodeURIComponent(r.sku)}` });
  } catch { /* fail-soft */ }

  try {
    const rows = await prisma.customer.findMany({
      where: { OR: [{ name: ci(q) }, { email: ci(q) }] },
      take: PER, select: { id: true, name: true, email: true },
    });
    for (const r of rows)
      hits.push({ id: r.id, kind: "customer", label: r.name, sub: r.email ?? "", href: "/admin/customers" });
  } catch { /* fail-soft */ }

  try {
    const rows = await prisma.supplier.findMany({
      where: { OR: [{ name: ci(q) }, { email: ci(q) }] },
      take: PER, select: { id: true, name: true, email: true },
    });
    for (const r of rows)
      hits.push({ id: r.id, kind: "supplier", label: r.name, sub: r.email ?? "", href: "/admin/suppliers" });
  } catch { /* fail-soft */ }

  try {
    const rows = await prisma.salesOrder.findMany({
      where: { OR: [{ soNumber: ci(q) }, { note: ci(q) }] },
      take: PER, select: { id: true, soNumber: true, status: true },
    });
    for (const r of rows)
      hits.push({ id: r.id, kind: "invoice", label: r.soNumber, sub: r.status, href: "/admin/sales-orders" });
  } catch { /* fail-soft */ }

  try {
    const rows = await prisma.warehouse.findMany({
      where: { deletedAt: null, OR: [{ code: ci(q) }, { name: ci(q) }] },
      take: PER, select: { id: true, code: true, name: true },
    });
    for (const r of rows)
      hits.push({ id: r.id, kind: "warehouse", label: r.name, sub: r.code, href: `/admin/warehouses?wh=${encodeURIComponent(r.code)}` });
  } catch { /* fail-soft */ }

  try {
    const rows = await prisma.journalEntry.findMany({
      where: { OR: [{ description: ci(q) }, { reference: ci(q) }] },
      take: PER, select: { id: true, description: true, reference: true },
    });
    for (const r of rows)
      hits.push({ id: r.id, kind: "journal", label: r.description, sub: r.reference ?? "", href: "/admin/journal" });
  } catch { /* fail-soft */ }

  try {
    const rows = await prisma.brainInsight.findMany({
      where: { resolvedAt: null, dismissedAt: null, OR: [{ title: ci(q) }, { body: ci(q) }] },
      take: PER, select: { id: true, title: true, severity: true },
    });
    for (const r of rows)
      hits.push({ id: r.id, kind: "brain", label: r.title, sub: r.severity, href: "/admin/brain" });
  } catch { /* fail-soft */ }

  return hits;
}
