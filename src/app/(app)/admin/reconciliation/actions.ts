"use server";

// Server actions for /admin/reconciliation (docs/HOURANI-ERP-GAPS.md #1 🔴
// Bank reconciliation). A statement is pasted as plain lines (one bank
// transaction per line, CSV-ish: date,description,reference,amount) and
// matched against existing Payment/SupplierPayment rows by the pure
// engine in lib/finance/reconciliation.ts. Matching only LINKS a line to
// a payment that already exists — it never creates or posts money, so
// this can't double-post the ledger.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/db";
import { requireUser } from "@/lib/auth/session";
import { activeTenantSlug } from "@/lib/tenancy/tenancy";
import { getLocale } from "@/lib/i18n/i18n.server";
import { flashToast } from "@/lib/utils/toast";
import { autoMatchStatement, type PaymentCandidate, type StatementLineInput } from "@/lib/finance/reconciliation";

async function gate() {
  const user = await requireUser();
  if (!["ADMIN", "EXECUTIVE", "MANAGER"].includes(user.role)) {
    throw new Error("forbidden");
  }
  return user;
}

// "2026-07-10, Wire transfer ref 4021, PAY-000042, 500.00" — comma or tab
// separated, amount last. A leading "-" (or a description containing
// "withdrawal"/"سحب") marks money OUT; everything else is money IN.
function parseLines(raw: string): { date: Date; description: string; reference: string | null; amount: number }[] {
  const rows: { date: Date; description: string; reference: string | null; amount: number }[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\t|,(?![^()]*\))/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const [dateStr, description, referenceRaw, amountRaw] = parts.length >= 4
      ? parts
      : [parts[0], parts[1], null, parts[2]];
    const date = new Date(dateStr);
    const amount = Number(String(amountRaw ?? "").replace(/,/g, ""));
    if (Number.isNaN(date.getTime()) || Number.isNaN(amount) || amount === 0) continue;
    rows.push({ date, description: description || "", reference: referenceRaw || null, amount });
  }
  return rows;
}

export async function createBankStatement(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const tenantId = await activeTenantSlug();

  const treasuryId = String(formData.get("treasuryId") ?? "").trim();
  const statementDateRaw = String(formData.get("statementDate") ?? "").trim();
  const startingBalance = Number(formData.get("startingBalance") ?? 0) || 0;
  const endingBalance = Number(formData.get("endingBalance") ?? 0) || 0;
  const rawLines = String(formData.get("lines") ?? "");

  if (!treasuryId) {
    await flashToast({ type: "info", entity: "info", label: ar ? "اختر خزينة" : "Choose a treasury" });
    return;
  }

  const parsed = parseLines(rawLines);
  if (parsed.length === 0) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "لم يتم التعرّف على أي سطر صالح" : "No valid lines were recognized",
    });
    return;
  }

  try {
    const treasury = await prisma.treasury.findUniqueOrThrow({ where: { id: treasuryId } });
    await prisma.bankStatement.create({
      data: {
        tenantId,
        treasuryId,
        statementDate: statementDateRaw ? new Date(statementDateRaw) : new Date(),
        startingBalance,
        endingBalance,
        lines: {
          create: parsed.map((l) => ({
            tenantId,
            date: l.date,
            description: l.description,
            reference: l.reference,
            amount: l.amount,
          })),
        },
      },
    });
    void treasury; // ownership already asserted by the scoped findUniqueOrThrow above
  } catch (e) {
    await flashToast({
      type: "info",
      entity: "info",
      label: ar ? "تعذّر إنشاء كشف الحساب" : "Could not create the statement",
    });
    console.error("createBankStatement failed", e);
    return;
  }

  revalidatePath("/admin/reconciliation");
}

export async function runAutoMatch(formData: FormData): Promise<void> {
  await gate();
  const ar = (await getLocale()) === "ar";
  const statementId = String(formData.get("statementId") ?? "").trim();
  if (!statementId) return;

  try {
    const statement = await prisma.bankStatement.findUniqueOrThrow({
      where: { id: statementId },
      include: { lines: { where: { status: "UNMATCHED" } } },
    });
    if (statement.lines.length === 0) {
      await flashToast({ type: "info", entity: "info", label: ar ? "لا سطور غير مطابقة" : "No unmatched lines" });
      return;
    }

    const [payments, supplierPayments] = await Promise.all([
      prisma.payment.findMany({
        where: { treasuryId: statement.treasuryId, bankStatementLine: null },
        select: { id: true, paidAt: true, amount: true, paymentNumber: true, note: true },
      }),
      prisma.supplierPayment.findMany({
        where: { treasuryId: statement.treasuryId, bankStatementLine: null },
        select: { id: true, paidAt: true, amount: true, paymentNumber: true, note: true },
      }),
    ]);

    const candidates: PaymentCandidate[] = [
      ...payments.map((p) => ({ id: p.id, kind: "PAYMENT" as const, date: p.paidAt, amount: Number(p.amount), number: p.paymentNumber, note: p.note })),
      ...supplierPayments.map((p) => ({ id: p.id, kind: "SUPPLIER_PAYMENT" as const, date: p.paidAt, amount: Number(p.amount), number: p.paymentNumber, note: p.note })),
    ];

    const lineInputs: StatementLineInput[] = statement.lines.map((l) => ({
      id: l.id,
      date: l.date,
      description: l.description,
      reference: l.reference,
      amount: Number(l.amount),
    }));

    const results = autoMatchStatement(lineInputs, candidates);
    const confident = results.filter((r) => r.candidateId && r.confidence !== "AMBIGUOUS");

    await Promise.all(
      confident.map((r) =>
        prisma.bankStatementLine.update({
          where: { id: r.lineId },
          data: {
            status: "MATCHED",
            matchedPaymentId: r.candidateKind === "PAYMENT" ? r.candidateId : null,
            matchedSupplierPaymentId: r.candidateKind === "SUPPLIER_PAYMENT" ? r.candidateId : null,
          },
        }),
      ),
    );

    await flashToast({
      type: "info",
      entity: "info",
      label: ar
        ? `تمت مطابقة ${confident.length} من ${results.length} سطراً تلقائياً`
        : `Auto-matched ${confident.length} of ${results.length} lines`,
    });
  } catch (e) {
    await flashToast({ type: "info", entity: "info", label: ar ? "تعذّرت المطابقة التلقائية" : "Auto-match failed" });
    console.error("runAutoMatch failed", e);
    return;
  }

  revalidatePath("/admin/reconciliation");
}

export async function confirmMatch(formData: FormData): Promise<void> {
  await gate();
  const lineId = String(formData.get("lineId") ?? "").trim();
  const candidateId = String(formData.get("candidateId") ?? "").trim();
  const candidateKind = String(formData.get("candidateKind") ?? "").trim();
  if (!lineId || !candidateId || !["PAYMENT", "SUPPLIER_PAYMENT"].includes(candidateKind)) return;

  await prisma.bankStatementLine.update({
    where: { id: lineId },
    data: {
      status: "MATCHED",
      matchedPaymentId: candidateKind === "PAYMENT" ? candidateId : null,
      matchedSupplierPaymentId: candidateKind === "SUPPLIER_PAYMENT" ? candidateId : null,
    },
  });
  revalidatePath("/admin/reconciliation");
}

export async function unmatchLine(formData: FormData): Promise<void> {
  await gate();
  const lineId = String(formData.get("lineId") ?? "").trim();
  if (!lineId) return;
  await prisma.bankStatementLine.update({
    where: { id: lineId },
    data: { status: "UNMATCHED", matchedPaymentId: null, matchedSupplierPaymentId: null },
  });
  revalidatePath("/admin/reconciliation");
}

export async function ignoreLine(formData: FormData): Promise<void> {
  await gate();
  const lineId = String(formData.get("lineId") ?? "").trim();
  if (!lineId) return;
  await prisma.bankStatementLine.update({
    where: { id: lineId },
    data: { status: "IGNORED", matchedPaymentId: null, matchedSupplierPaymentId: null },
  });
  revalidatePath("/admin/reconciliation");
}
