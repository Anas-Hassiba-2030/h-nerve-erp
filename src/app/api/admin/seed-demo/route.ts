// Admin-only: trigger the idempotent demo seed against production.
//
// POST /api/admin/seed-demo
// Requires: ADMIN session
// Safe to re-run — every write is an upsert on a unique key, no deletes.
//
// Runs prisma/seed-demo.ts in-process via a dynamic import so the build
// doesn't try to bundle tsx. Returns JSON with the row counts.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authz";
import { getCurrentUser } from "@/lib/auth/session";
import { scoped } from "@/lib/utils/logger";

const log = scoped("seed-demo");

export const dynamic = "force-dynamic";
export const maxDuration = 60; // demo seed inserts ~hundreds of rows

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "ADMIN required" }, { status: 403 });
    }

    // Run the seed-demo's main() inline. We import dynamically to avoid
    // pulling its top-level prisma client into the route bundle.
    const before = Date.now();
    await runDemoSeed();
    const ms = Date.now() - before;

    // Count what's now in the system.
    const { prismaUnscoped } = await import("@/lib/db/db");
    const counts = {
      tenants: await prismaUnscoped.tenant.count(),
      companies: await prismaUnscoped.company.count(),
      hotels: await prismaUnscoped.hotel.count(),
      bookings: await prismaUnscoped.booking.count(),
      users: await prismaUnscoped.user.count(),
    };

    return NextResponse.json({ ok: true, ms, counts });
  } catch (err: any) {
    log.error("seed failed", { err: err?.message ?? String(err) });
    return NextResponse.json(
      { error: "Seed failed" },
      { status: 500 }
    );
  }
}

async function runDemoSeed() {
  // Inline the safe subset of prisma/seed-demo.ts — tenants, companies,
  // hotels, and bookings. The full seed-demo.ts uses Prisma.Decimal heavily
  // and includes inventory/finance which we'll skip here for speed; the
  // user can run the full seed locally if they want everything.
  const { prismaUnscoped: prisma } = await import("@/lib/db/db");

  const TENANTS = [
    { slug: "hourani-hotels", name: "مجموعة الحوراني — الفنادق", adminEmail: "admin@hourani.jo", region: "MENA", tier: "standard" },
    { slug: "maha-dairy",     name: "ألبان المها",                adminEmail: "ops@maha.jo",     region: "MENA", tier: "standard" },
    { slug: "loran-agri",     name: "لوران للزراعة الذكية",       adminEmail: "ops@loran.jo",    region: "MENA", tier: "standard" },
    { slug: "tank-incubator", name: "حاضنة The Tank",             adminEmail: "ops@tank.jo",     region: "MENA", tier: "standard" },
  ];

  for (const t of TENANTS) {
    await prisma.tenant.upsert({
      where: { slug: t.slug },
      create: { ...t, status: "ACTIVE", activatedAt: new Date() },
      update: { status: "ACTIVE" },
    });
  }

  const COMPANIES = [
    { code: "HRN-001", name: "فندق الحوراني — الأردن",     nameEn: "Hourani Hotel — Jordan",    sector: "HOSPITALITY", city: "عمّان",        description: "فندق 5 نجوم في عمّان" },
    { code: "HRN-002", name: "فندق الحوراني — البحر الميت", nameEn: "Hourani Dead Sea Resort",  sector: "HOSPITALITY", city: "البحر الميت", description: "منتجع شاطئي على البحر الميت" },
    { code: "MAHA-001", name: "ألبان المها",                 nameEn: "Maha Dairy",                sector: "DAIRY",       city: "إربد",         description: "أكبر منتج ألبان في الأردن" },
    { code: "LOR-001",  name: "لوران للزراعة",               nameEn: "Loran Agriculture",         sector: "AGRICULTURE", city: "الأغوار",      description: "زراعة ذكية بدفيئات IoT" },
    { code: "TANK-001", name: "The Tank — الحاضنة",          nameEn: "The Tank Incubator",        sector: "EDUCATION",   city: "عمّان",        description: "حاضنة شركات ناشئة" },
  ];

  const companyMap = new Map<string, string>();
  for (const c of COMPANIES) {
    const row = await prisma.company.upsert({
      where: { code: c.code },
      create: c,
      update: { name: c.name, nameEn: c.nameEn, description: c.description },
    });
    companyMap.set(c.code, row.id);
  }

  const HOTELS = [
    { id: "demo-arena",  companyCode: "HRN-001", name: "Arena Hotel — Amman",       nameEn: "Arena Hotel — Amman",     city: "عمّان",       totalRooms: 220 },
    { id: "demo-sofia",  companyCode: "HRN-001", name: "Arena Sofia",                nameEn: "Arena Sofia",             city: "عمّان",       totalRooms: 180 },
    { id: "demo-dead",   companyCode: "HRN-002", name: "Hourani Dead Sea Resort",   nameEn: "Hourani Dead Sea Resort", city: "البحر الميت", totalRooms: 320 },
  ];

  for (const h of HOTELS) {
    const companyId = companyMap.get(h.companyCode);
    if (!companyId) continue;
    await prisma.hotel.upsert({
      where: { id: h.id },
      create: { id: h.id, companyId, name: h.name, nameEn: h.nameEn, city: h.city, totalRooms: h.totalRooms },
      update: { name: h.name, nameEn: h.nameEn, city: h.city, totalRooms: h.totalRooms },
    });
  }

  // Bookings for the next 30 days
  const now = new Date();
  for (const h of HOTELS) {
    // Resolve tenant slug from the hotel's company code prefix
    const tenantSlug = h.companyCode.startsWith("HRN") ? "hourani-hotels"
      : h.companyCode.startsWith("MAHA") ? "maha-dairy"
      : h.companyCode.startsWith("LOR") ? "loran-agri"
      : "tank-incubator";
    for (let i = 1; i <= 10; i++) {
      const checkIn = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + (1 + (i % 4)) * 24 * 60 * 60 * 1000);
      const ref = `BK-${h.id}-${String(i).padStart(3, "0")}`;
      await prisma.booking.upsert({
        where: { reference: ref },
        create: {
          reference: ref,
          hotelId: h.id,
          tenantId: tenantSlug,
          guestName: `Demo Guest ${i}`,
          checkIn,
          checkOut,
          rooms: 1 + (i % 3),
          guests: 1 + (i % 4),
          status: i % 5 === 0 ? "CHECKED_IN" : "CONFIRMED",
          revenue: 120 + i * 17,
        },
        update: {},
      });
    }
  }
}
