"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import {
  parseDocument,
  visionEnabled,
  isVisionEligible,
} from "@/lib/docintel/parser";
import { matchDocumentEntities, type Match } from "@/lib/docintel/match";

// Phase 18 of docs/PHASES-INTELLIGENCE.md.
// Server actions for the Document Intelligence flow.
//
// uploadDocument — accepts a File via FormData. Creates the Document
// row immediately so the UI gets an id, then runs the parser. The
// parser is currently a stub (lib/docintel/parser.ts) but the I/O
// shape matches a future Claude Vision integration.
//
// We deliberately don't store file bytes — the demo doesn't need that
// and storing arbitrary user uploads in the dev SQLite would be a foot
// gun. Later we'll persist to disk / object storage.

export type UploadResult = {
  documentId: string;
  parsedMs: number;
  kind: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  headline: string;
  headlineEn: string;
  linkedTo: string | null;
  fields: Record<string, any>;
  clauses: Array<{
    id: string;
    kind: string;
    quote: string;
    quoteEn?: string;
    page?: number | null;
    severity: string;
    note?: string;
    noteEn?: string;
  }>;
  // Phase NS-8 — the Supplier/Customer this document auto-linked to (or null).
  matchedSupplier: { id: string; name: string; score: number } | null;
  matchedCustomer: { id: string; name: string; score: number } | null;
};

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  if (!file || !file.name) throw new Error("file required");
  if (file.size > 25 * 1024 * 1024) throw new Error("file too large (>25MB)");

  // 1. Create the row immediately so the UI can drill in if it wants.
  const doc = await prisma.document.create({
    data: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || null,
      status: "PARSING",
      uploadedById: user.id,
    },
  });

  // 2. Run the parser. Read the file bytes ONLY when Vision is on and
  // the type is vision-eligible — otherwise the stub path never pays
  // the up-to-25MB arrayBuffer allocation.
  const useVision = visionEnabled() && isVisionEligible(file.type);
  const bytes = useVision
    ? Buffer.from(await file.arrayBuffer())
    : undefined;
  const parsed = await parseDocument({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    bytes,
  });

  // 3. Persist the parse result.
  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      kind: parsed.kind,
      title: parsed.title,
      titleEn: parsed.titleEn,
      summary: parsed.summary,
      summaryEn: parsed.summaryEn,
      linkedTo: parsed.linkedTo ?? null,
      status: "READY",
      parsedMs: parsed.ms,
      extraction: {
        create: {
          fieldsJson: JSON.stringify(parsed.fields),
          headline: parsed.headline,
          headlineEn: parsed.headlineEn,
        },
      },
      clauses: {
        create: parsed.clauses.map((c, i) => ({
          kind: c.kind,
          quote: c.quote,
          quoteEn: c.quoteEn ?? null,
          page: c.page ?? null,
          severity: c.severity,
          note: c.note ?? null,
          noteEn: c.noteEn ?? null,
          orderIndex: i,
        })),
      },
    },
    include: { clauses: true },
  });

  // 4. Phase NS-8 — Document → Graph. Fuzzy-match the extracted vendor /
  // party names against THIS tenant's suppliers + customers (prisma is the
  // scoped client, so this never reads another tenant's entities) and
  // persist the best link. Best-effort: a match failure must never break
  // the upload, so any error is swallowed and the document still lands.
  let matchedSupplier: Match | null = null;
  let matchedCustomer: Match | null = null;
  try {
    const [suppliers, customers] = await Promise.all([
      prisma.supplier.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      prisma.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    ]);
    const m = matchDocumentEntities(parsed.fields, suppliers, customers);
    matchedSupplier = m.supplier;
    matchedCustomer = m.customer;
    if (matchedSupplier || matchedCustomer) {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          matchedSupplierId: matchedSupplier?.id ?? null,
          matchedSupplierName: matchedSupplier?.name ?? null,
          matchedCustomerId: matchedCustomer?.id ?? null,
          matchedCustomerName: matchedCustomer?.name ?? null,
          matchConfidence:
            Math.max(matchedSupplier?.score ?? 0, matchedCustomer?.score ?? 0) || null,
        },
      });
    }
  } catch (e) {
    console.error("[docintel] entity match failed:", e);
  }

  revalidatePath("/documents");

  return {
    documentId: updated.id,
    parsedMs: updated.parsedMs ?? parsed.ms,
    kind: updated.kind,
    title: updated.title ?? parsed.title,
    titleEn: updated.titleEn ?? parsed.titleEn,
    summary: updated.summary ?? parsed.summary,
    summaryEn: updated.summaryEn ?? parsed.summaryEn,
    headline: parsed.headline,
    headlineEn: parsed.headlineEn,
    linkedTo: updated.linkedTo,
    fields: parsed.fields,
    clauses: updated.clauses
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        quote: c.quote,
        quoteEn: c.quoteEn ?? undefined,
        page: c.page,
        severity: c.severity,
        note: c.note ?? undefined,
        noteEn: c.noteEn ?? undefined,
      })),
    matchedSupplier,
    matchedCustomer,
  };
}

export async function commitDocument(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // The "Add to ledger" CTA — currently just confirms the row stays.
  // (The row is already saved on upload.)
  revalidatePath("/documents");
  redirect(`/documents/${id}`);
}

export async function deleteDocument(formData: FormData): Promise<void> {
  await requireRole("MANAGER");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/documents");
}
