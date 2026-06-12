import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { togglePin, type PinEntityType } from "@/lib/utils/pins";
import { getCurrentUser } from "@/lib/auth/session";

const PIN_TYPES = [
  "COMPANY", "HOTEL", "BOOKING", "DAIRY", "FARM", "PROGRAM",
  "FORECAST", "INSIGHT", "TASK", "PROJECT", "TRANSACTION",
] as const;

const schema = z.object({
  entityType: z.enum(PIN_TYPES),
  entityId: z.string().min(1),
  label: z.string().min(1).max(160),
  labelEn: z.string().max(160).optional(),
  href: z.string().min(1).max(300),
  icon: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pinned = await togglePin({
    entityType: parsed.data.entityType as PinEntityType,
    entityId: parsed.data.entityId,
    label: parsed.data.label,
    labelEn: parsed.data.labelEn,
    href: parsed.data.href,
    icon: parsed.data.icon,
  });

  return NextResponse.json({ ok: true, pinned });
}
