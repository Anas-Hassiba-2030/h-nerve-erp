// Fixed assets + straight-line depreciation (hnerve-gap-map.md "Fixed
// assets" row). Pure math up top (unit-tested); DB posting helpers below
// follow the invoicing.ts/purchasing.ts conventions and post into the
// same JournalEntry engine. Accounts: 1500 Fixed Assets (ASSET), 1590
// Accumulated Depreciation (ASSET, contra — carries a credit balance),
// 6100 Depreciation Expense (EXPENSE), 2100 Accounts Payable.

import type { prisma as prismaType } from "@/lib/db/db";
import { ensureLedgerAccount, ensureOpenPeriod, nextDocNumber } from "./invoicing";

type Tx = typeof prismaType;

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Pure math ────────────────────────────────────────────────────────────

/** Flat straight-line monthly charge: (cost − salvage) / life. */
export function monthlyStraightLine(cost: number, salvage: number, lifeMonths: number): number {
  if (lifeMonths <= 0) return 0;
  const depreciable = Math.max(0, cost - salvage);
  return r2(depreciable / lifeMonths);
}

/**
 * The charge due for the NEXT month given what's already accumulated —
 * min(flat monthly, remaining book value above salvage). The final month
 * absorbs rounding drift so accumulated lands exactly on cost − salvage,
 * never past it. Returns 0 once fully depreciated.
 */
export function depreciationDue(
  cost: number,
  salvage: number,
  lifeMonths: number,
  accumulated: number,
): number {
  const depreciable = Math.max(0, r2(cost - salvage));
  const remaining = r2(depreciable - accumulated);
  if (remaining <= 0) return 0;
  const monthly = monthlyStraightLine(cost, salvage, lifeMonths);
  if (monthly <= 0) return 0;
  // Final scheduled month: charge the whole remainder so rounding drift
  // (e.g. 1000/3 → 333.33 + 333.33 + 333.34) can't leave a stray cent
  // dribbling into an extra month.
  if (remaining < monthly * 1.5) return remaining;
  return monthly;
}

/** Book value = cost − accumulated depreciation (floored at salvage). */
export function bookValue(cost: number, salvage: number, accumulated: number): number {
  return Math.max(r2(cost - accumulated), r2(Math.min(salvage, cost)));
}

// ── DB posting ───────────────────────────────────────────────────────────

// Acquisition: Fixed Assets debit / AP credit (assets are bought on
// credit like purchase invoices; the AP balance is settled through the
// normal supplier-payment flow).
export async function postAssetAcquisition(
  tx: Tx,
  args: {
    tenantId: string;
    name: string;
    category?: string | null;
    purchaseDate?: Date;
    purchaseCost: number;
    salvageValue: number;
    usefulLifeMonths: number;
    note?: string | null;
  },
) {
  const { tenantId } = args;
  const assetNumber = await nextDocNumber(tx, tenantId, "FIXED_ASSET", "FA-");
  const [faAccount, apAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "1500", "Fixed Assets", "ASSET"),
    ensureLedgerAccount(tx, tenantId, "2100", "Accounts Payable", "LIABILITY"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  const journalEntry = await tx.journalEntry.create({
    data: {
      tenantId,
      periodId: period.id,
      description: `Fixed asset ${assetNumber} — ${args.name}`,
      reference: assetNumber,
      status: "POSTED",
      postedAt: new Date(),
      lines: {
        create: [
          { accountId: faAccount.id, debit: args.purchaseCost, credit: 0, memo: assetNumber },
          { accountId: apAccount.id, debit: 0, credit: args.purchaseCost, memo: assetNumber },
        ],
      },
    },
  });

  return tx.fixedAsset.create({
    data: {
      tenantId,
      assetNumber,
      name: args.name,
      category: args.category || null,
      purchaseDate: args.purchaseDate ?? new Date(),
      purchaseCost: args.purchaseCost,
      salvageValue: args.salvageValue,
      usefulLifeMonths: args.usefulLifeMonths,
      note: args.note || null,
      journalEntryId: journalEntry.id,
    },
  });
}

/**
 * Post one month of depreciation for every ACTIVE asset that still has
 * book value to depreciate and no entry for (year, month) yet. Idempotent:
 * the (assetId, periodYear, periodMonth) unique makes a re-run a no-op.
 * Returns the number of assets charged and the total posted.
 */
export async function runMonthlyDepreciation(
  tx: Tx,
  tenantId: string,
  year: number,
  month: number,
): Promise<{ charged: number; total: number }> {
  const assets = await tx.fixedAsset.findMany({
    where: { tenantId, status: "ACTIVE", deletedAt: null },
    include: { depreciation: { select: { amount: true, periodYear: true, periodMonth: true } } },
  });

  const [expenseAccount, accumAccount, period] = await Promise.all([
    ensureLedgerAccount(tx, tenantId, "6100", "Depreciation Expense", "EXPENSE"),
    ensureLedgerAccount(tx, tenantId, "1590", "Accumulated Depreciation", "ASSET"),
    ensureOpenPeriod(tx, tenantId),
  ]);

  let charged = 0;
  let total = 0;
  for (const asset of assets) {
    if (asset.depreciation.some((d) => d.periodYear === year && d.periodMonth === month)) continue;
    const accumulated = r2(asset.depreciation.reduce((s, d) => s + Number(d.amount), 0));
    const due = depreciationDue(
      Number(asset.purchaseCost),
      Number(asset.salvageValue),
      asset.usefulLifeMonths,
      accumulated,
    );
    if (due <= 0) continue;

    const label = `Depreciation ${asset.assetNumber} ${year}-${String(month).padStart(2, "0")}`;
    const journalEntry = await tx.journalEntry.create({
      data: {
        tenantId,
        periodId: period.id,
        description: label,
        reference: asset.assetNumber,
        status: "POSTED",
        postedAt: new Date(),
        lines: {
          create: [
            { accountId: expenseAccount.id, debit: due, credit: 0, memo: label },
            { accountId: accumAccount.id, debit: 0, credit: due, memo: label },
          ],
        },
      },
    });
    await tx.depreciationEntry.create({
      data: {
        tenantId,
        assetId: asset.id,
        periodYear: year,
        periodMonth: month,
        amount: due,
        journalEntryId: journalEntry.id,
      },
    });
    charged += 1;
    total = r2(total + due);
  }
  return { charged, total };
}
