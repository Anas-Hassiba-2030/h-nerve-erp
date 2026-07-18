// Purchase Invoice / payables core (Phase 27 — hnerve-gap-map.md
// "Purchases" row). Mirrors lib/finance/invoicing.ts but posts the
// opposite side: Purchases/COGS debit, Accounts Payable credit. Reuses
// the shared primitives (computeLineTotals, ensureLedgerAccount,
// ensureOpenPeriod, nextDocNumber) so tax math and numbering can't drift
// between the sales and purchase sides.

import type { prisma as prismaType } from "@/lib/db/db";
import { ensureLedgerAccount, ensureOpenPeriod, nextDocNumber, computeLineTotals } from "./invoicing";
import { createPostedJournalEntry } from "./accounting";
import type { LineInput } from "./invoicing";

type Tx = typeof prismaType;
type Computed = Awaited<ReturnType<typeof computeLineTotals>>;

export { lineInputSchema, computeLineTotals, statusForPaid } from "./invoicing";
export type { LineInput };

export async function getPurchaseInvoicePaidTotal(tx: Tx, purchaseInvoiceId: string): Promise<number> {
  const agg = await tx.supplierPayment.aggregate({
    where: { purchaseInvoiceId },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

// Posts a SupplierPayment + its JournalEntry (AP debit / Treasury credit) —
// the exact mirror of invoicing.ts postPayment. Same immutability
// convention: no update/delete action exists; corrections are reversing
// entries.
export async function postSupplierPayment(
  tx: Tx,
  args: {
    tenantId: string;
    supplierId: string;
    purchaseInvoiceId?: string | null;
    treasuryId: string;
    amount: number;
    currency: string;
    method: string;
    paidAt?: Date;
    note?: string | null;
  },
) {
  const { tenantId, supplierId, purchaseInvoiceId, treasuryId, amount, currency, method, note } = args;
  const treasury = await tx.treasury.findUniqueOrThrow({ where: { id: treasuryId } });
  if (treasury.tenantId !== tenantId) throw new Error("Cross-tenant treasury");

  const paymentNumber = await nextDocNumber(tx, tenantId, "SUPPLIER_PAYMENT", "SPAY-");
  const [apAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "2100", "Accounts Payable", "LIABILITY"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const journalEntry = await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: `Supplier Payment ${paymentNumber}`,
    reference: paymentNumber,
    lines: {
      create: [
        { accountId: apAccount.id, debit: amount, credit: 0, memo: paymentNumber },
        { accountId: treasury.ledgerAccountId, debit: 0, credit: amount, memo: paymentNumber },
      ],
    },
  });

  return tx.supplierPayment.create({
    data: {
      tenantId,
      paymentNumber,
      supplierId,
      purchaseInvoiceId: purchaseInvoiceId || null,
      treasuryId,
      amount,
      currency,
      method,
      paidAt: args.paidAt ?? new Date(),
      note: note || null,
      journalEntryId: journalEntry.id,
    },
  });
}

export async function postPurchaseInvoiceFromComputed(
  tx: Tx,
  args: {
    tenantId: string;
    supplierId: string;
    currency: string;
    issueDate?: Date;
    dueDate?: Date | null;
    note?: string | null;
    computed: Computed;
  },
) {
  const { tenantId, supplierId, currency, note, computed } = args;
  const purchaseInvoiceNumber = await nextDocNumber(tx, tenantId, "PURCHASE_INVOICE", "BILL-");
  const [apAccount, purchasesAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "2100", "Accounts Payable", "LIABILITY"),
    ensureLedgerAccount(tx, tenantId, "5000", "Purchases / COGS", "EXPENSE"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const journalEntry = await createPostedJournalEntry(tx, {
    tenantId,
    periodId: period.id,
    description: `Purchase Invoice ${purchaseInvoiceNumber}`,
    reference: purchaseInvoiceNumber,
    lines: {
      create: [
        { accountId: purchasesAccount.id, debit: computed.total, credit: 0, memo: purchaseInvoiceNumber },
        { accountId: apAccount.id, debit: 0, credit: computed.total, memo: purchaseInvoiceNumber },
      ],
    },
  });

  return tx.purchaseInvoice.create({
    data: {
      tenantId,
      purchaseInvoiceNumber,
      supplierId,
      status: "UNPAID",
      issueDate: args.issueDate ?? new Date(),
      dueDate: args.dueDate ?? null,
      currency,
      subtotal: computed.subtotal,
      taxTotal: computed.taxTotal,
      total: computed.total,
      note: note || null,
      journalEntryId: journalEntry.id,
      lines: {
        create: computed.linesWithTax.map((l) => ({
          productId: l.productId || null,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRateId: l.taxRateId || null,
          lineTotal: l.lineTotal + l.tax,
        })),
      },
    },
  });
}
