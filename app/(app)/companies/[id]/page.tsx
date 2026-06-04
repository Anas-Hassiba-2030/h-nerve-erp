import Link from "next/link";
import { getLocale } from "@/lib/i18n/i18n.server";
import { notFound } from "next/navigation";
import {
  Pencil,
  ArrowLeft,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { DaylightShell, DaylightHeader } from "@/components/orrery/daylight";
import { PinButton } from "@/components/PinButton";
import { enterWorkspace } from "@/app/actions/workspace";
import { getCompanyDetail } from "./data";
import { CompanyBrandCover } from "./_components/CompanyBrandCover";
import { CompanyKpis } from "./_components/CompanyKpis";
import { OperationsColumn } from "./_components/OperationsColumn";
import { SignalsColumn } from "./_components/SignalsColumn";
import "../../daylight.css";

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getCompanyDetail(params.id);

  if (!data) notFound();

  const {
    company,
    brand,
    pinnedNow,
    incomeTotal,
    expenseTotal,
    netTotal,
    totalRooms,
    recentLiters,
    totalDunum,
    age,
    latestEsg,
  } = data;

  const en = getLocale() === "en";

  return (
    <DaylightShell dir={en ? "ltr" : "rtl"}>
      <DaylightHeader
        eyebrow={en ? "Company profile" : "ملف الشركة"}
        title={en ? company.nameEn : company.name}
        subtitle={en ? company.name : company.nameEn}
        actions={
          <div className="flex items-center gap-2">
            {/* The descent: enter THIS company's scoped ERP back-office. Sets
                the workspace + tenant cookies (enterWorkspace) and lands on
                /workspace — every query then auto-scopes to this company. */}
            <form action={enterWorkspace}>
              <input type="hidden" name="companyId" value={company.id} />
              <button type="submit" className="dl-btn dl-btn-primary">
                <Building2 className="h-4 w-4" />
                {en ? "Open back-office" : "دخول نظام الشركة"}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
            <Link href="/companies" className="dl-btn dl-btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              {en ? "Register" : "السجل"}
            </Link>
            <PinButton
              entityType="COMPANY"
              entityId={company.id}
              label={company.name}
              labelEn={company.nameEn}
              href={`/companies/${company.id}`}
              icon="Building2"
              initial={pinnedNow}
              tone="default"
              locale="ar"
            />
            <Link href={`/companies/${company.id}/edit`} className="dl-btn dl-btn-secondary">
              <Pencil className="h-4 w-4" />
              {en ? "Edit" : "تعديل"}
            </Link>
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* ---------------------------------------------------------------- */}
        {/* Brand cover                                                       */}
        {/* ---------------------------------------------------------------- */}
        <CompanyBrandCover company={company} brand={brand} age={age} en={en} />

        <CompanyKpis
          company={company}
          incomeTotal={incomeTotal}
          expenseTotal={expenseTotal}
          netTotal={netTotal}
          totalRooms={totalRooms}
          recentLiters={recentLiters}
          totalDunum={totalDunum}
          latestEsg={latestEsg}
          en={en}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Two-column body                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          {/* Left column: operational entities */}
          <OperationsColumn company={company} en={en} />

          {/* Right column: capital + signals */}
          <SignalsColumn company={company} latestEsg={latestEsg} en={en} />
        </div>
      </div>
    </DaylightShell>
  );
}
