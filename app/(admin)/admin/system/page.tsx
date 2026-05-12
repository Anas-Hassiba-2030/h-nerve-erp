// /admin/system — superadmin system overview (stub for Phase 11).

import { prisma } from "@/lib/db";

export default async function AdminSystemPage() {
  const [tenants, brainPatterns, iqRows, memories] = await Promise.all([
    prisma.tenant.count(),
    prisma.brainPattern.count(),
    prisma.brainIQHistory.count(),
    prisma.memory.count(),
  ]);

  return (
    <div className="admin-page admin-page-narrow">
      <header className="admin-page-head">
        <div>
          <span className="admin-eyebrow">SUPERADMIN · SYSTEM</span>
          <h1 className="admin-h1">System overview</h1>
          <p className="admin-sub">
            Federation-wide totals across every tenant and every brain subsystem.
          </p>
        </div>
      </header>

      <section className="admin-stats">
        <Stat label="TENANTS" value={tenants} />
        <Stat label="LEARNED PATTERNS" value={brainPatterns} accent="cyan" />
        <Stat label="IQ SNAPSHOTS" value={iqRows} accent="cyan" />
        <Stat label="MEMORIES" value={memories} accent="cyan" />
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "cyan" }) {
  return (
    <div className="admin-stat-tile">
      <span className="admin-stat-label">{label}</span>
      <span className="admin-stat-value" data-accent={accent ?? "neutral"}>
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}
