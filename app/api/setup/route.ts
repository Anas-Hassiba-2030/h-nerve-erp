// One-time system setup endpoint.
// Only works when zero users exist in the database.
// After the first admin is created, this endpoint returns 403 permanently.
//
// Usage:
//   POST /api/setup
//   Body: { "email": "you@example.com", "password": "yourpassword" }
//   Response: { "ok": true, "email": "...", "role": "ADMIN" }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/db";
import { hashPassword } from "@/lib/auth/auth";
import bcrypt from "bcryptjs";

const CHART_OF_ACCOUNTS = [
  { code: "1000", name: "المخزون",               type: "ASSET",     description: "Inventory" },
  { code: "1010", name: "النقد",                  type: "ASSET",     description: "Cash" },
  { code: "1020", name: "الذمم المدينة",          type: "ASSET",     description: "Accounts Receivable" },
  { code: "2000", name: "الذمم الدائنة",          type: "LIABILITY", description: "Accounts Payable" },
  { code: "3000", name: "الأرباح المحتجزة",       type: "EQUITY",    description: "Retained Earnings" },
  { code: "4000", name: "الإيرادات",              type: "REVENUE",   description: "Revenue" },
  { code: "5000", name: "تكلفة البضاعة المباعة",  type: "COGS",      description: "Cost of Goods Sold" },
  { code: "6000", name: "تسويات المخزون",         type: "EXPENSE",   description: "Inventory Adjustment" },
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "").trim();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "email and password (≥6 chars) required" },
        { status: 400 }
      );
    }

    // Lock down once any user exists
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { error: "System already has users. Use the login page." },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        name: "مدير النظام",
        passwordHash,
        role: "ADMIN",
        title: "مهندس النظام المركزي",
        rank: "KING",
      },
    });

    // Seed Chart of Accounts for default tenant
    const TENANT = "hourani-hotels";
    for (const a of CHART_OF_ACCOUNTS) {
      await prisma.ledgerAccount.upsert({
        where: { tenantId_code: { tenantId: TENANT, code: a.code } },
        create: { tenantId: TENANT, code: a.code, name: a.name, type: a.type, description: a.description },
        update: {},
      });
    }

    // Seed default tenant
    await prisma.tenant.upsert({
      where: { slug: TENANT },
      create: {
        slug: TENANT,
        name: "مجموعة الحوراني",
        adminEmail: email,
        region: "MENA",
        tier: "standard",
        status: "ACTIVE",
        activatedAt: new Date(),
      },
      update: { status: "ACTIVE" },
    });

    return NextResponse.json({ ok: true, email: user.email, role: user.role });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Setup failed" }, { status: 500 });
  }
}

// GET — simple status check
export async function GET() {
  const userCount = await prisma.user.count().catch(() => -1);
  if (userCount > 0) {
    return NextResponse.json({ status: "already_configured", users: userCount });
  }
  return NextResponse.json({ status: "needs_setup", users: 0 });
}
