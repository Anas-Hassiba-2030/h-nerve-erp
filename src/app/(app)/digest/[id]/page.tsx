import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Brain,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { DaylightShell, DaylightHeader, DaylightPanel } from "@/components/orrery/daylight";
import { prisma } from "@/lib/db/db";
import { getLocale } from "@/lib/i18n/i18n.server";
import { isSafeId } from "@/lib/auth/authz";
import { formatNumber } from "@/lib/utils/utils";
import "../../daylight.css";

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

export default async function DigestDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  if (!isSafeId(params.id)) notFound();

  const ar = (await getLocale()) === "ar";
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
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <DaylightHeader
        eyebrow={ar ? "الذكاء التشغيلي" : "Operational intelligence"}
        title={ar ? `الموجز الأسبوعي` : `Weekly digest`}
        subtitle={`${dateFmt.format(digest.weekStart)} → ${dateFmt.format(digest.weekEnd)}`}
        actions={
          <Link href="/digest" className="dl-btn dl-btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            {ar ? "كل الموجزات" : "All digests"}
          </Link>
        }
      />

      {/* What this is — plain-language explainer. The digest surface renders on
          the dark cosmic field (the ambient orbit backdrop shows through the
          panels), so this card is an explicit night card with light text — the
          cream daylight default would be invisible here. */}
      <div
        className="panel reveal"
        style={{
          padding: "16px 20px",
          background: "linear-gradient(160deg, rgba(20,46,38,.55), rgba(13,31,26,.5))",
          border: "1px solid rgba(194,163,90,.2)",
        }}
      >
        <p style={{ fontSize: 14, lineHeight: 1.85, color: "rgba(246,241,231,.86)", margin: 0 }}>
          {ar
            ? "ما هذا؟ الموجز الأسبوعي تقريرٌ يُعدّه الدماغ تلقائياً كل أسبوع — يجمع أهمّ إشارات المجموعة (الإيرادات والهوامش والحجوزات والمخاطر) في ملخّص تنفيذيّ واحد سهل القراءة، مع روابط للتفاصيل."
            : "What is this? The weekly digest is a report the brain prepares automatically each week — it gathers the group's most important signals (revenue, margins, bookings, risks) into one easy-to-read executive summary, with links to the details."}
        </p>
      </div>

      {/* Hero strip */}
      <div
        className="panel reveal relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--emerald) 0%, var(--emerald-soft) 52%, var(--gold) 100%)",
          minHeight: 160,
        }}
      >
        <div className="relative">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.22em]"
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
            className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs font-bold"
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
            className="mt-4 max-w-2xl text-[15px] font-semibold leading-relaxed md:text-[17px]"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
          >
            {digest.summary}
          </p>
        </div>
      </div>

      {/* Body */}
      <DaylightPanel title={ar ? "تفاصيل الموجز" : "Digest body"}>
        <div
          className="digest-prose"
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />
      </DaylightPanel>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Digest body renders on the dark cosmic surface — make its card an
               explicit night card and all prose light so it reads comfortably
               (the cream daylight default left dark ink invisible on dark). */
            .dl-page .panel:has(.digest-prose) { background: linear-gradient(160deg, rgba(20,46,38,.55), rgba(13,31,26,.5)); border-color: rgba(194,163,90,.2); }
            .dl-page .panel:has(.digest-prose) .panel-title { color: var(--gold-soft); }
            .digest-prose .digest-h2 { font-size: 19px; font-weight: 700; margin-top: 14px; margin-bottom: 10px; color: var(--gold-soft); letter-spacing: -0.01em; }
            .digest-prose .digest-h3 { font-size: 14.5px; font-weight: 700; margin-top: 22px; margin-bottom: 8px; color: #f6f1e7; letter-spacing: -0.005em; }
            .digest-prose .digest-p { font-size: 14.5px; line-height: 1.9; margin-bottom: 14px; color: rgba(246,241,231,.87); }
            .digest-prose .digest-list { padding-inline-start: 20px; margin-bottom: 14px; list-style: disc outside; }
            .digest-prose .digest-list li { font-size: 14px; line-height: 1.9; margin-bottom: 8px; color: rgba(246,241,231,.87); }
            .digest-prose .digest-list li::marker { color: var(--gold-soft); }
            .digest-prose strong { color: #fff; font-weight: 700; }
            .digest-prose em { color: var(--gold-soft); font-style: italic; }
          `,
        }}
      />
    </DaylightShell>
  );
}
