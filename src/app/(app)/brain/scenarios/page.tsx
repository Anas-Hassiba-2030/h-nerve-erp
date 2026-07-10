// /brain/scenarios — Phase 2 of docs/governance/PHASES-INTELLIGENCE.md.
//
// The What-If lab — verbatim port of docs/design/system/sections/whatif.html.
// Levers → causal flow → KPIs. The brain narrates. Auto-solve animates levers
// to an optimum. All choreography lives in WhatIfLab.tsx (client island).

import { DaylightShell } from "@/components/orrery/daylight";
import { WhatIfLab } from "./WhatIfLab";
import { getLocale } from "@/lib/i18n/i18n.server";
import "../../daylight.css";
import "./whatif.css";

export const dynamic = "force-dynamic";

export default async function BrainScenariosPage() {
  const ar = (await getLocale()) === "ar";
  return (
    <DaylightShell dir={ar ? "rtl" : "ltr"}>
      <WhatIfLab ar={ar} />
    </DaylightShell>
  );
}
