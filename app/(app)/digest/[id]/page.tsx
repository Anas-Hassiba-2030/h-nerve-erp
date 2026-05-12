import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Brain,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { PageContainer } from "@/components/PageContainer";
import { prisma } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { isSafeId } from "@/lib/authz";
import { formatNumber } from "@/lib/utils";

// Renders a digest's body. Bodies are stored as light Markdown (## headings,
// **bold**, - bullets, _italic_) — we transform inline rather than pulling in
// a dependency. Defensive against odd input by stripping anything that
// could break HTML.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineFormat(s: string): string {
  // Bold + italic (very small subset). Run on already-escaped text.
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>")
    .replace(/_([^_]+?)_/g, "<em>$1</em>");
}

function renderDigestBody(body: string): string {
  // Split into blocks separated by blank lines, then render each.
  const blocks = body.split(/\n\s*\n/);
  const html: string[] = [];

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (block.startsWith("## ")) {
      const text = inlineFormat(escapeHtml(block.slice(3).trim()));
      html.push(`<h2 class="digest-h2">${text}</h2>`);
      continue;
    }
    if (block.startsWith("### ")) {
      const text = inlineFormat(escapeHtml(block.slice(4).trim()));
      html.push(`<h3 class="digest-h3">${text}</h3>`);
      continue;
    }

    // Bullet list?
    const lines = block.split("\n").map((l) => l.replace(/^\s+/, ""));
    if (lines.every((l) => l.startsWith("- "))) {
      const items = lines
        .map((l) => inlineFormat(escapeHtml(l.slice(2))))
        .map((l) => `<li>${l}</li>`)
        .join("");
      html.push(`<ul class="digest-list">${items}</ul>`);
      continue;
    }

    // Plain paragraph (preserve internal line breaks as <br>).
    const paragraph = lines
      .map((l) => inlineFormat(escapeHtml(l)))
      .join("<br/>");
    html.push(`<p class="digest-p">${paragraph}</p>`);
  }

  return html.join("\n");
}

export default async function DigestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isSafeId(params.id)) notFound();

  const ar = getLocale() === "ar";
  const digest = await prisma.digest.findUnique({
    where: { id: params.id },
  });
  if (!digest) notFound();

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const issuedFmt = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  const renderedBody = renderDigestBody(digest.body);

  return (
    <>
      <Topbar
        eyebrow={ar ? "الذكاء التشغيلي" : "Operational intelligence"}
        title={
          ar
            ? `الموجز الأسبوعي`
            : `Weekly digest`
        }
        subtitle={`${dateFmt.format(digest.weekStart)} → ${dateFmt.format(digest.weekEnd)}`}
        actions={
          <Link href="/digest" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "كل الموجزات" : "All digests"}
          </Link>
        }
      />

      <PageContainer width="narrow">
        {/* Hero strip */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 text-white anim-rise-glow"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 60%, var(--accent) 110%)",
            minHeight: 160,
          }}
        >
          <div className="relative">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em]"
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.32)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Newspaper className="h-3.5 w-3.5" />
              {ar ? "الموجز التنفيذي" : "Executive digest"}
            </div>
            <div
              className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs font-bold opacity-90"
            >
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateFmt.format(digest.weekStart)} →{" "}
                {dateFmt.format(digest.weekEnd)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Brain className="h-3.5 w-3.5" />
                {formatNumber(digest.insightCount)}{" "}
                {ar ? "إشارة" : "signals"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {ar ? "صدر" : "Issued"} {issuedFmt.format(digest.createdAt)}
              </span>
            </div>
            <p
              className="mt-4 max-w-2xl text-base leading-relaxed md:text-[17px]"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
            >
              {digest.summary}
            </p>
          </div>
        </section>

        {/* Body */}
        <article
          className="card card-pad space-y-1"
          style={{ color: "var(--text)" }}
        >
          <div
            className="digest-prose"
            dangerouslySetInnerHTML={{ __html: renderedBody }}
          />
        </article>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              .digest-prose .digest-h2 { font-size: 18px; font-weight: 800; margin-top: 8px; margin-bottom: 8px; color: var(--brand-deep); letter-spacing: -0.01em; }
              .digest-prose .digest-h3 { font-size: 14px; font-weight: 800; margin-top: 18px; margin-bottom: 6px; color: var(--text); letter-spacing: -0.005em; }
              .digest-prose .digest-p { font-size: 14px; line-height: 1.7; margin-bottom: 12px; color: var(--text); }
              .digest-prose .digest-list { padding-inline-start: 18px; margin-bottom: 12px; list-style: disc outside; }
              .digest-prose .digest-list li { font-size: 13.5px; line-height: 1.7; margin-bottom: 4px; color: var(--text); }
              .digest-prose strong { color: var(--text); font-weight: 800; }
              .digest-prose em { color: var(--text-muted); font-style: italic; }
            `,
          }}
        />
      </PageContainer>
    </>
  );
}
