// Client-portal core (hnerve-gap-map.md "Client portal" row). Two
// concerns: (1) staff-side provisioning of a CustomerPortalAccount —
// gated the same as every other server action (ADMIN/EXECUTIVE/MANAGER);
// (2) the read-only balance rollup a portal customer sees for their own
// invoices. The portal itself NEVER writes domain data — it is strictly
// a read surface (same read-mostly discipline as the Brain).

import bcrypt from "bcryptjs";
import type { prisma as prismaType } from "@/lib/db/db";

type Tx = typeof prismaType;

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Pure math ────────────────────────────────────────────────────────────

export type InvoiceBalanceInput = {
  status: string;
  total: number;
  paid: number;
};

/**
 * Per-invoice outstanding = max(0, total - paid), skipped for DRAFT/
 * CANCELLED (never billed / voided). Overall balance = sum of those.
 */
export function computeOutstandingBalance(invoices: InvoiceBalanceInput[]): number {
  const total = invoices
    .filter((i) => !["DRAFT", "CANCELLED"].includes(i.status))
    .reduce((sum, i) => sum + Math.max(0, r2(i.total - i.paid)), 0);
  return r2(total);
}

// ── Provisioning (staff-side) ────────────────────────────────────────────

export async function provisionPortalAccount(
  tx: Tx,
  args: { tenantId: string; customerId: string; email: string; password: string },
) {
  const { tenantId, customerId, email, password } = args;
  const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
  if (customer.tenantId !== tenantId) throw new Error("Cross-tenant customer");

  const existingEmail = await tx.customerPortalAccount.findUnique({ where: { email: email.toLowerCase() } });
  if (existingEmail && existingEmail.customerId !== customerId) {
    throw new Error("Email already used by another portal account");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return tx.customerPortalAccount.upsert({
    where: { customerId },
    create: { tenantId, customerId, email: email.toLowerCase(), passwordHash, active: true },
    update: { email: email.toLowerCase(), passwordHash, active: true, deletedAt: null },
  });
}

export async function revokePortalAccount(tx: Tx, args: { tenantId: string; customerId: string }) {
  const { tenantId, customerId } = args;
  const account = await tx.customerPortalAccount.findUniqueOrThrow({ where: { customerId } });
  if (account.tenantId !== tenantId) throw new Error("Cross-tenant portal account");
  return tx.customerPortalAccount.update({ where: { customerId }, data: { active: false } });
}

// ── Login (portal-side) ──────────────────────────────────────────────────

export async function authenticatePortalAccount(
  tx: Tx,
  args: { email: string; password: string },
): Promise<{ customerId: string; customerName: string; tenantId: string } | null> {
  const account = await tx.customerPortalAccount.findUnique({
    where: { email: args.email.toLowerCase() },
    include: { customer: true },
  });
  if (!account || !account.active || account.deletedAt || account.customer.deletedAt) return null;

  const ok = await bcrypt.compare(args.password, account.passwordHash);
  if (!ok) return null;

  await tx.customerPortalAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  return { customerId: account.customerId, customerName: account.customer.name, tenantId: account.tenantId };
}
