import "server-only";
import type { ExportAnalytics } from "@/lib/export/exportAnalytics";
import { renderFinance } from "./finance";
import { renderHotels } from "./hotels";
import { renderDairy } from "./dairy";
import { renderFarms } from "./farms";
import { renderSupplyChain } from "./supplyChain";
import { renderSustainability } from "./sustainability";
import { renderProjects } from "./projects";
import { renderMarkets } from "./markets";
import { renderAll } from "./all";

export type ExportRenderResult = {
  title: string;
  subtitle: string;
  html: string;
  analytics: ExportAnalytics | null;
  recordCount: number;
};

export type ExportRenderer = (ar: boolean) => Promise<ExportRenderResult>;

// Registry mapping export type string -> per-type renderer.
export const EXPORT_RENDERERS: Record<string, ExportRenderer> = {
  finance: renderFinance,
  hotels: renderHotels,
  dairy: renderDairy,
  farms: renderFarms,
  "supply-chain": renderSupplyChain,
  sustainability: renderSustainability,
  projects: renderProjects,
  markets: renderMarkets,
  all: renderAll,
};

export function getExportRenderer(type: string): ExportRenderer | undefined {
  return EXPORT_RENDERERS[type];
}
