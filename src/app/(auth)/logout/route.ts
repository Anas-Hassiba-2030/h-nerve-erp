import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/tenancy/workspace";
import { TENANT_COOKIE } from "@/lib/tenancy/tenancy";

// Phase F-Polish — sign out across both POST (sidebar form) and GET
// (direct nav). Two bugs fixed:
//   1. Default `NextResponse.redirect(...)` returns 307, which makes
//      the browser RE-POST to /login — the login handler then sees an
//      empty body and the user lands back on /logout or sees a
//      confusing error. We force 303 (See Other) so the browser issues
//      a fresh GET to /login.
//   2. The old fallback `process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"`
//      pointed at localhost in prod. Building from `req.url` ALSO failed on
//      Railway: behind the proxy, `req.url` is the INTERNAL container origin
//      (e.g. http://localhost:8080), so logout redirected the browser to a
//      dead localhost address. We now emit a RELATIVE Location ("/login") and
//      let the browser resolve it against the public origin in the address
//      bar — correct on Railway, Vercel, and local alike, with no env var.
async function destroyAndRedirect(): Promise<Response> {
  const session = await getSession();
  session.destroy();
  const jar = await cookies();
  jar.delete(WORKSPACE_COOKIE);
  jar.delete(TENANT_COOKIE);
  // 303 (See Other) → browser issues a fresh GET to /login (no re-POST).
  return new NextResponse(null, { status: 303, headers: { Location: "/login" } });
}

export async function POST(_req: NextRequest) {
  return destroyAndRedirect();
}

export async function GET(_req: NextRequest) {
  return destroyAndRedirect();
}
