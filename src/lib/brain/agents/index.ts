// lib/brain/agents/ — the council members.
//
// Each specialist is an AgentDef. The Moderator is separate (it runs after,
// with the specialists' transcript as input). See base.ts for the contract.
//
// Phase 3 of docs/PHASES-INTELLIGENCE.md.

import type { AgentDef } from "./base";
import { HospitalityExpert } from "./HospitalityExpert";
import { DairyExpert } from "./DairyExpert";
import { AgriExpert } from "./AgriExpert";
import { FinanceBrain } from "./FinanceBrain";
import { RiskOfficer } from "./RiskOfficer";
import { SalesPipelineExpert } from "./SalesPipelineExpert";

export { HospitalityExpert, DairyExpert, AgriExpert, FinanceBrain, RiskOfficer };
// Phase 27 — CRM voice. Available to convene on sales/pipeline topics and
// surfaced on /crm. Intentionally NOT added to SPECIALIST_AGENTS below (the
// council roster is asserted to be exactly 5 in agents.test.ts).
export { SalesPipelineExpert };
export { runAgent } from "./base";
export { runModerator } from "./Moderator";
export type { AgentDef, AgentInput } from "./base";

/** Council roster — runs in parallel when convene() is called. */
export const SPECIALIST_AGENTS: AgentDef[] = [
  HospitalityExpert,
  DairyExpert,
  AgriExpert,
  FinanceBrain,
  RiskOfficer,
];

/** Backward-compat with Phase 1 stub registry. */
export const AGENTS = SPECIALIST_AGENTS;
