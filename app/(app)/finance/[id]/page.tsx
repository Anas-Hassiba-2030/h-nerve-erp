import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Building2,
  Calendar,
  User as UserIcon,
  Tag,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { PinButton } from "@/components/PinButton";
import { prisma } from "@/lib/db";
import { isPinned } from "@/lib/pins";
import {
  formatMoney,
  formatNumber,
  formatDateTime,
  formatShortDate,
} from "@/lib/utils";
import { getCompanyBrand } from "@/lib/companyBrand";

const KIND_AR: Record<string, string> = {
  REVENUE: "إيراد",
  INCOME: "دخل",
  EXPENSE: "مصروف",
  COST: "تكلفة",
  TRANSFER: "تحويل داخلي",
};

const KIND_ICON = {
  REVENUE: TrendingUp,
  INCOME: TrendingUp,
  EXPENSE: TrendingDown,
  COST: TrendingDown,
  TRANSFER: ArrowLeftRight,
} as const;

const KIND_COLOR: Record<string, string> = {
  REVENUE: "#0a8e54",
  INCOME: "#0a8e54",
  EXPENSE: "#c0392b",
  COST: "#c0392b",
  TRANSFER: "#1c5fbe",
};

export default async function FinanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tx = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true, code: true, sector: true } },
      createdBy: {
        select: { id: true, name: true, role: true, rank: true, xp: true },
      },
    },
  });
  if (!tx) notFound();

  const [siblingsCategory, siblingsCompany, companyAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        category: tx.category,
        id: { not: tx.id },
      },
      orderBy: { occurredAt: "desc" },
      take: 6,
      include: { company: { select: { name: true, code: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        companyId: tx.companyId,
        id: { not: tx.id },
      },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
    prisma.transaction.groupBy({
      by: ["kind"],
      where: { companyId: tx.companyId },
      _sum: { amount: true },
    }),
  ]);

  const Icon =
    KIND_ICON[tx.kind as keyof typeof KIND_ICON] ?? ArrowLeftRight;
  const isIncome = tx.kind === "INCOME" || tx.kind === "REVENUE";
  const isExpense = tx.kind === "EXPENSE" || tx.kind === "COST";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const color = KIND_COLOR[tx.kind] ?? "var(--text)";

  const companyIncome = companyAgg
    .filter((g) => g.kind === "INCOME" || g.kind === "REVENUE")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);
  const companyExpense = companyAgg
    .filter((g) => g.kind === "EXPENSE" || g.kind === "COST")
    .reduce((acc, g) => acc + (g._sum.amount ?? 0), 0);

  const brand = getCompanyBrand(tx.company.code);
  const pinned = await isPinned("TRANSACTION", tx.id);

  return (
    <>
      <Topbar
        eyebrow="السجل المالي"
        title={tx.description ?? tx.category}
        subtitle={tx.reference}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/finance" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" />
              السجل
            </Link>
            <PinButton
              entityType="TRANSACTION"
              entityId={tx.id}
              label={`${tx.reference} — ${tx.description ?? tx.category}`}
              href={`/finance/${tx.id}`}
              icon="Wallet"
              initial={pinned}
              tone="default"
              locale="ar"
            />
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-2xl p-6 anim-fade-up"
          style={{ background: brand.gradient, color: "white", minHeight: "200px" }}
        >
          <div
            className="absolute inset-0 opacity-20 anim-grad"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, white 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[auto,1fr,auto] lg:items-center">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl anim-pop"
              style={{
                background: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.35)",
                backdropFilter: "blur(6px)",
                color: isIncome
                  ? "#bbf7d0"
                  : isExpense
                    ? "#fecaca"
                    : "white",
              }}
            >
              <Icon className="h-12 w-12" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {KIND_AR[tx.kind] ?? tx.kind}
                </span>
                <Link
                  href={`/companies/${tx.company.id}`}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/30"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {tx.company.name}
                </Link>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-mono"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    border: "1px solid rgba(255,255,255,.3)",
                  }}
                >
                  {tx.reference}
                </span>
              </div>

              <h2 className="mt-1 text-2xl font-black md:text-3xl">
                {tx.description ?? tx.category}
              </h2>
              <p className="text-sm opacity-90">{tx.category}</p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-bold"
                  style={{
                    background: "rgba(255,255,255,.15)",
                    border: "1px solid rgba(255,255,255,.25)",
                  }}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDateTime(tx.occurredAt)}
                </span>
              </div>
            </div>

            {/* Big amount */}
            <div className="text-end">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-90">
                المبلغ
              </div>
              <div
                className="mt-1 font-mono text-4xl font-black md:text-5xl"
                style={{
                  textShadow: "0 2px 12px rgba(0,0,0,.25)",
                  letterSpacing: "-0.02em",
                }}
              >
                {sign}
                {formatMoney(tx.amount, tx.currency)}
              </div>
              <div className="text-[10px] font-bold opacity-90" dir="ltr">
                {tx.currency}
              </div>
            </div>
          </div>
        </section>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="space-y-6">
            {/* Description */}
            {tx.description ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-2 flex items-center gap-2 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  <Wallet
                    className="h-4 w-4"
                    style={{ color: "var(--brand)" }}
                  />
                  وصف الحركة
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text)" }}
                >
                  {tx.description}
                </p>
              </section>
            ) : null}

            {/* Same category */}
            {siblingsCategory.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-extrabold"
                    style={{ color: "var(--text)" }}
                  >
                    <Tag
                      className="h-4 w-4"
                      style={{ color: "var(--brand)" }}
                    />
                    حركات بنفس التصنيف
                  </h3>
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {tx.category}
                  </span>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {siblingsCategory.map((s, i) => {
                    const sIsIncome =
                      s.kind === "INCOME" || s.kind === "REVENUE";
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <Link
                          href={`/finance/${s.id}`}
                          className="min-w-0 flex-1 hover:underline"
                        >
                          <div
                            className="truncate text-sm font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {s.description ?? s.category}
                          </div>
                          <div
                            className="text-[11px] font-mono"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {s.reference} • {s.company.code} •{" "}
                            {formatShortDate(s.occurredAt)}
                          </div>
                        </Link>
                        <span
                          className="font-mono text-xs font-black"
                          style={{
                            color: sIsIncome ? "#0a8e54" : "#c0392b",
                          }}
                        >
                          {sIsIncome ? "+" : "−"}
                          {formatMoney(s.amount, s.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* Same company */}
            {siblingsCompany.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <header className="mb-3 flex items-center justify-between">
                  <h3
                    className="flex items-center gap-2 text-sm font-extrabold"
                    style={{ color: "var(--text)" }}
                  >
                    <Building2
                      className="h-4 w-4"
                      style={{ color: "var(--brand)" }}
                    />
                    حركات أخرى من {tx.company.name}
                  </h3>
                  <Link
                    href={`/companies/${tx.company.id}`}
                    className="text-[11px] font-bold"
                    style={{ color: "var(--brand)" }}
                  >
                    ملف الشركة ←
                  </Link>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {siblingsCompany.map((s, i) => {
                    const sIsIncome =
                      s.kind === "INCOME" || s.kind === "REVENUE";
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 py-2.5 anim-fade-up"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <Link
                          href={`/finance/${s.id}`}
                          className="min-w-0 flex-1 hover:underline"
                        >
                          <div
                            className="truncate text-sm font-bold"
                            style={{ color: "var(--text)" }}
                          >
                            {s.description ?? s.category}
                          </div>
                          <div
                            className="text-[11px] font-mono"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {s.reference} • {KIND_AR[s.kind] ?? s.kind} •{" "}
                            {formatShortDate(s.occurredAt)}
                          </div>
                        </Link>
                        <span
                          className="font-mono text-xs font-black"
                          style={{
                            color: sIsIncome ? "#0a8e54" : "#c0392b",
                          }}
                        >
                          {sIsIncome ? "+" : "−"}
                          {formatMoney(s.amount, s.currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {/* Company P/L mini */}
            {companyAgg.length > 0 ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-3 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  أداء {tx.company.name}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div
                      className="mb-1 flex items-center justify-between text-[10px] font-bold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>إيرادات</span>
                      <span style={{ color: "#0a8e54" }}>
                        {formatMoney(companyIncome)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--text-muted) 14%, transparent)",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: "100%",
                          background: "linear-gradient(90deg, #0a8e54, #15846a)",
                          transition: "width .6s ease",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div
                      className="mb-1 flex items-center justify-between text-[10px] font-bold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>مصروفات</span>
                      <span style={{ color: "#c0392b" }}>
                        {formatMoney(companyExpense)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--text-muted) 14%, transparent)",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${
                            companyIncome > 0
                              ? Math.min(100, (companyExpense / companyIncome) * 100)
                              : 0
                          }%`,
                          background: "linear-gradient(90deg, #c0392b, #b91c1c)",
                          transition: "width .6s ease",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="rounded-xl px-3 py-2 text-center"
                    style={{
                      background:
                        "color-mix(in srgb, var(--brand) 8%, transparent)",
                      border:
                        "1px solid color-mix(in srgb, var(--brand) 18%, transparent)",
                    }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      صافي
                    </div>
                    <div
                      className="font-mono text-lg font-black"
                      style={{
                        color:
                          companyIncome - companyExpense >= 0
                            ? "#0a8e54"
                            : "#c0392b",
                      }}
                    >
                      {formatMoney(companyIncome - companyExpense)}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Created by */}
            {tx.createdBy ? (
              <section className="card card-pad anim-fade-up">
                <h3
                  className="mb-3 flex items-center gap-2 text-sm font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  <UserIcon
                    className="h-4 w-4"
                    style={{ color: "var(--brand)" }}
                  />
                  مَن سجّل
                </h3>
                <Link
                  href={`/users/${tx.createdBy.id}`}
                  className="block rounded-xl p-2 transition hover:bg-[var(--brand-soft)]"
                >
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: "var(--text)" }}
                  >
                    {tx.createdBy.name}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {tx.createdBy.role} •{" "}
                    <span className="font-mono">
                      {formatNumber(tx.createdBy.xp)} XP
                    </span>
                  </div>
                </Link>
              </section>
            ) : null}

            {/* Meta */}
            <section className="card card-pad anim-fade-up">
              <h3
                className="mb-3 text-sm font-extrabold"
                style={{ color: "var(--text)" }}
              >
                البطاقة
              </h3>
              <dl className="space-y-2 text-xs">
                <Fact label="المرجع" value={tx.reference} mono />
                <Fact label="النوع" value={KIND_AR[tx.kind] ?? tx.kind} />
                <Fact label="التصنيف" value={tx.category} />
                <Fact
                  label="المبلغ"
                  value={`${sign}${formatMoney(tx.amount, tx.currency)}`}
                  color={color}
                />
                <Fact label="العملة" value={tx.currency} mono />
                <Fact
                  label="وقع في"
                  value={formatDateTime(tx.occurredAt)}
                />
                <Fact
                  label="الشركة"
                  value={tx.company.name}
                  link={`/companies/${tx.company.id}`}
                />
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

function Fact({
  label,
  value,
  link,
  mono,
  color,
}: {
  label: string;
  value: string;
  link?: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-b-0">
      <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
      <dd
        className={`text-end font-bold ${mono ? "font-mono" : ""}`}
        style={{ color: color ?? "var(--text)" }}
      >
        {link ? (
          <Link
            href={link}
            className="hover:underline"
            style={{ color: "var(--brand)" }}
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
