import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// One-time production seed endpoint.
// Protected by SEED_ADMIN_PASSWORD env var — must match exactly.
// Hit it once, then Railway will keep the endpoint but it becomes a no-op
// once data exists (idempotent upserts only, no destructive deletes).

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const secret = process.env.SEED_ADMIN_PASSWORD;
  if (!secret || secret.startsWith("REPLACE")) {
    return NextResponse.json({ error: "SEED_ADMIN_PASSWORD not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.secret !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Idempotent — upsert only, never deleteMany
    const company = await prisma.company.upsert({
      where: { code: "HOURANI" },
      update: {},
      create: {
        code: "HOURANI",
        name: "مجموعة الحوراني",
        nameEn: "Hourani Group",
        sector: "HOSPITALITY",
        country: "JO",
        city: "عمّان",
        foundedYear: 1995,
        employees: 1200,
        brandColor: "emerald",
        description: "مجموعة متنوعة تعمل في الضيافة والألبان والزراعة والتعليم.",
      },
    });

    const hash = await bcrypt.hash(secret, 12);
    const admin = await prisma.user.upsert({
      where: { email: "admin@hourani.jo" },
      update: {},
      create: {
        email: "admin@hourani.jo",
        name: "مدير النظام",
        passwordHash: hash,
        role: "ADMIN",
        companyId: company.id,
      },
    });

    // Seed one hotel so the dashboard isn't empty
    const hotel = await prisma.hotel.findFirst({ where: { companyId: company.id } });
    if (!hotel) {
      await prisma.hotel.create({
        data: {
          name: "فندق الحوراني الكبير",
          nameEn: "Hourani Grand Hotel",
          city: "عمّان",
          country: "JO",
          starRating: 5,
          totalRooms: 180,
          baselineADR: 145,
          companyId: company.id,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      seeded: {
        company: company.code,
        admin: admin.email,
        note: "Production seed complete. Remove or disable this endpoint when done.",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
