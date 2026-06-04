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
//      pointed at localhost in prod (the env var isn't set on Vercel).
//      We now build the redirect URL from the incoming request, so it
//      always uses the live origin.
async function destroyAndRedirect(req: NextRequest | Request): Promise<Response> {
  const session = await getSession();
  session.destroy();
  cookies().delete(WORKSPACE_COOKIE);
  cookies().delete(TENANT_COOKIE);
  const url = new URL("/login", req.url);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  return destroyAndRedirect(req);
}

export async function GET(req: NextRequest) {
  return destroyAndRedirect(req);
}
