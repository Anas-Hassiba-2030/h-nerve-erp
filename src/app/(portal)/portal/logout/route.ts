import { NextResponse, type NextRequest } from "next/server";
import { getPortalSession } from "@/lib/auth/portalSession";

// Mirrors (auth)/logout/route.ts: 303 so the browser issues a fresh GET
// (no re-POST to /portal/login), and a relative Location so it resolves
// against the public origin behind the Railway proxy.
async function destroyAndRedirect(): Promise<Response> {
  const session = await getPortalSession();
  session.destroy();
  return new NextResponse(null, { status: 303, headers: { Location: "/portal/login" } });
}

export async function POST(_req: NextRequest) {
  return destroyAndRedirect();
}

export async function GET(_req: NextRequest) {
  return destroyAndRedirect();
}
