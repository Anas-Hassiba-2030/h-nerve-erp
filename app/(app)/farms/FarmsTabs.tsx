"use client";

import { useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteFarm, deleteCrop } from "./actions";

// Tab shell for /farms, mirroring docs/design/system/sections/loran.html:
// three .ops-tab pills (overview / farms / crops) toggling three .ops-panel
// blocks. Tab switching is the only client behaviour the reference needs, so
// the page stays a Server Component and feeds fully-rendered, serializable
// slot trees in. The circular sensor gauges replicate the loran-ops.js gauge()
// SVG (full-ring, stroke-dashoffset) exactly.

type Tab = "overview" | "farms" | "crops";

export type GaugeReading = { value: number; label: string; unit: string; color: string; fill: number };

export type FarmTile = {
  id: string;
  name: string;
  meta: string;
  gauges: GaugeReading[];
  footLabel: string;
  footValue: string;
  deleteLabel: string;
  deleteDescription: string;
  detailsLabel: string;
};

export type CropRow = {
  id: string;
  crop: string;
  farm: string;
  qty: string;
  dest: string;
  statusLabel: string;
  statusTag: "ok" | "warn" | "crit" | "info";
  deleteLabel: string;
  deleteDescription: string;
};

function Gauge({ g }: { g: GaugeReading }) {
  const C = 2 * Math.PI * 34;
  const off = C * (1 - Math.max(0, Math.min(100, g.fill)) / 100);
  return (
    <div className="gauge">
      <svg width="86" height="86">
        <circle cx="43" cy="43" r="34" fill="none" stroke="rgba(46,107,87,.14)" strokeWidth="8" />
        <circle
          className="gring"
          cx="43"
          cy="43"
          r="34"
          fill="none"
          stroke={g.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={off}
        />
      </svg>
      <span className="gv">{g.value}{g.unit}</span>
      <div className="gl">{g.label}</div>
    </div>
  );
}

export function FarmsTabs({
  labels,
  overview,
  farms,
  crops,
  newFarmHref,
  newCropHref,
  emptyFarms,
  emptyCrops,
}: {
  labels: {
    overview: string; farms: string; crops: string;
    newFarm: string; newCrop: string; cropsTitle: string;
    colCrop: string; colFarm: string; colQty: string; colDest: string; colStatus: string;
  };
  overview: React.ReactNode;
  farms: FarmTile[];
  crops: CropRow[];
  newFarmHref: string;
  newCropHref: string;
  emptyFarms: { title: string; sub: string };
  emptyCrops: { title: string; sub: string };
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <div className="ops-tabs">
        <button className={`ops-tab${tab === "overview" ? " on" : ""}`} onClick={() => setTab("overview")}>{labels.overview}</button>
        <button className={`ops-tab${tab === "farms" ? " on" : ""}`} onClick={() => setTab("farms")}>{labels.farms}</button>
        <button className={`ops-tab${tab === "crops" ? " on" : ""}`} onClick={() => setTab("crops")}>{labels.crops}</button>
      </div>

      {/* overview */}
      <div className={`ops-panel${tab === "overview" ? " on" : ""}`}>{overview}</div>

      {/* farms */}
      <div className={`ops-panel${tab === "farms" ? " on" : ""}`}>
        <div className="ops-toolbar">
          <h2>{labels.farms}</h2>
          <div className="ops-actions">
            <Link href={newFarmHref} className="ops-add">＋ {labels.newFarm}</Link>
          </div>
        </div>
        {farms.length === 0 ? (
          <div className="ops-empty">
            <div className="oe-ic">🌱</div>
            <div className="oe-t">{emptyFarms.title}</div>
            <div className="oe-s">{emptyFarms.sub}</div>
            <Link href={newFarmHref} className="ops-add">＋ {labels.newFarm}</Link>
          </div>
        ) : (
          <div className="ops-portfolio">
            {farms.map((f) => (
              <div key={f.id} className="co-tile">
                <div className="co-nm">{f.name}</div>
                <div className="co-sec">{f.meta}</div>
                {f.gauges.length > 0 ? (
                  <div className="gauges">{f.gauges.map((g, i) => <Gauge key={i} g={g} />)}</div>
                ) : null}
                <div className="co-meta">
                  <span>{f.footLabel}</span>
                  <span style={{ fontFamily: "monospace" }}>{f.footValue}</span>
                </div>
                <div className="ops-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
                  <Link href={`/farms/${f.id}`} className="ops-export" style={{ flex: 1, justifyContent: "center" }}>{f.detailsLabel}</Link>
                  <DeleteButton action={deleteFarm} payload={{ id: f.id }} label={f.deleteLabel} description={f.deleteDescription} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* crops */}
      <div className={`ops-panel${tab === "crops" ? " on" : ""}`}>
        <div className="ops-toolbar">
          <h2>{labels.cropsTitle}</h2>
          <div className="ops-actions">
            <Link href={newCropHref} className="ops-add">＋ {labels.newCrop}</Link>
          </div>
        </div>
        {crops.length === 0 ? (
          <div className="ops-empty">
            <div className="oe-ic">🌾</div>
            <div className="oe-t">{emptyCrops.title}</div>
            <div className="oe-s">{emptyCrops.sub}</div>
            <Link href={newCropHref} className="ops-add">＋ {labels.newCrop}</Link>
          </div>
        ) : (
          <div className="ops-table">
            <div className="ops-tr head" style={{ gridTemplateColumns: "1fr 1fr .9fr 1.2fr .9fr 28px" }}>
              <div className="ops-cell">{labels.colCrop}</div>
              <div className="ops-cell">{labels.colFarm}</div>
              <div className="ops-cell num">{labels.colQty}</div>
              <div className="ops-cell">{labels.colDest}</div>
              <div className="ops-cell">{labels.colStatus}</div>
              <div className="ops-cell" />
            </div>
            {crops.map((c) => (
              <div key={c.id} className="ops-tr row" style={{ gridTemplateColumns: "1fr 1fr .9fr 1.2fr .9fr 28px" }}>
                <div className="ops-cell name">{c.crop}</div>
                <div className="ops-cell">{c.farm}</div>
                <div className="ops-cell num">{c.qty}</div>
                <div className="ops-cell">{c.dest}</div>
                <div className="ops-cell"><span className={`ops-tag ${c.statusTag}`}>{c.statusLabel}</span></div>
                <div className="ops-cell"><DeleteButton action={deleteCrop} payload={{ id: c.id }} label={c.deleteLabel} description={c.deleteDescription} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
