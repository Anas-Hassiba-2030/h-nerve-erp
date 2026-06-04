// /workspace/operations — the deep sector operations module.
//
// Flagship: Maha Dairy gets a full production board (status columns),
// QC pass-rate, expiry watch list, throughput. Other sectors get a
// respectable module of their own. Everything is auto-scoped to the
// active company.

import { redirect } from "next/navigation";
import { getUserIfRole } from "@/lib/auth/authz";
import { prismaUnscoped } from "@/lib/db/db";
import { getActiveWorkspaceId } from "@/lib/tenancy/workspace";
import { getLocale } from "@/lib/i18n/i18n.server";
import {
  getDairyOpsData,
  getHospitalityOpsData,
  getAgricultureOpsData,
  getEducationOpsData,
  getHoldingOpsData,
} from "./data";
import { DairyOps } from "./_components/DairyOps";
import { HospitalityOps } from "./_components/HospitalityOps";
import { AgricultureOps } from "./_components/AgricultureOps";
import { EducationOps } from "./_components/EducationOps";
import { HoldingOps } from "./_components/HoldingOps";
import "../../daylight.css";

export const dynamic = "force-dynamic";

export default async function WorkspaceOperationsPage() {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) redirect("/companies");
  const company = await prismaUnscoped.company.findUnique({
    where: { id: workspaceId },
    select: { sector: true },
  });
  if (!company) redirect("/companies");

  const locale = getLocale();
  const ar = locale === "ar";
  // W6 — only MANAGER+ may mutate; STAFF get the read-only board.
  const canMutate = !!(await getUserIfRole("MANAGER"));

  if (company.sector === "DAIRY") return <DairyOps ar={ar} canMutate={canMutate} data={await getDairyOpsData(ar)} />;
  if (company.sector === "HOSPITALITY") return <HospitalityOps ar={ar} data={await getHospitalityOpsData(ar)} />;
  if (company.sector === "AGRICULTURE") return <AgricultureOps ar={ar} data={await getAgricultureOpsData(ar)} />;
  if (company.sector === "EDUCATION") return <EducationOps ar={ar} data={await getEducationOpsData(ar)} />;
  return <HoldingOps ar={ar} data={await getHoldingOpsData(ar)} />;
}
