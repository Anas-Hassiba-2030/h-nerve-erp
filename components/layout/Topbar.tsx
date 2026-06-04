// Backwards-compatibility shim: existing pages import { Topbar } from
// "@/components/layout/Topbar". The new look-and-feel lives in PageHeader, so
// Topbar simply forwards to it. This means every legacy page automatically
// gets the new 2-row header without touching its source.

import { PageHeader, type Crumb } from "./PageHeader";

export async function Topbar({
  title,
  subtitle,
  actions,
  eyebrow,
  breadcrumbs,
  metrics,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  breadcrumbs?: Crumb[];
  metrics?: Array<{ label: string; value: string; tone?: "emerald" | "amber" | "blue" | "violet" }>;
}) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={actions}
      eyebrow={eyebrow}
      breadcrumbs={breadcrumbs}
      metrics={metrics}
    />
  );
}
