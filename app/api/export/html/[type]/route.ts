import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { pageShell } from "@/lib/export/html/shell";
import { getExportRenderer } from "@/lib/export/html";

// =====================================================================
// Branded executive HTML report — print-friendly to PDF.
// Each export type carries: KPI strip, trend chart, distribution chart,
// AI commentary, and the full data table.
//
// Thin dispatcher: per-type renderers live under lib/export/html/, the
// shared shell/helpers in lib/export/html/shell.ts.
// =====================================================================

export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") ?? "ar";
  const ar = locale === "ar";
  const companyCode = url.searchParams.get("company") ?? "HH";
  const type = params.type;

  const renderer = getExportRenderer(type);
  if (!renderer) {
    return new NextResponse("Unknown export type", { status: 400 });
  }

  const { title, subtitle, html, analytics, recordCount } = await renderer(ar);

  const body = pageShell({
    title,
    subtitle,
    brandKey: companyCode,
    content: html,
    locale,
    analytics,
    recordCount,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
