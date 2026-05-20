import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { TENANT_COOKIE } from "@/lib/tenancy";

export async function POST() {
  const session = await getSession();
  session.destroy();
  // Phase F2 — clear the workspace cookie so the next login resolves
  // a fresh binding instead of inheriting the previous user's scope.
  // Phase F3 — clear the tenant cookie alongside.
  cookies().delete(WORKSPACE_COOKIE);
  cookies().delete(TENANT_COOKIE);
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}

export async function GET() {
  const session = await getSession();
  session.destroy();
  cookies().delete(WORKSPACE_COOKIE);
  cookies().delete(TENANT_COOKIE);
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
