// components/empire/CausalDriverList.tsx — Phase 19 (empire boardroom).
//
// Top causal drivers across the whole group: the 3 highest-confidence
// BrainEdges (causal/learned), each showing the cause→effect pair, the
// signed weight, and the brain's confidence. Server component, pure props.
// Quiet Authority.

import { ArrowRight } from "lucide-react";
import type { CausalDriver } from "@/lib/empire/summary";

export function CausalDriverList({ drivers, ar }: { drivers: CausalDriver[]; ar: boolean }) {
  return (
    <section className="emp-panel">
      <header className="emp-panel-head">
        <span className="emp-panel-title">{ar ? "أقوى المحرّكات السببية" : "Top causal drivers"}</span>
        <span className="emp-panel-meta">{drivers.length}</span>
      </header>

      {drivers.length === 0 ? (
        <p className="emp-panel-empty">
          {ar ? "لا روابط سببية بعد." : "No causal edges yet."}
        </p>
      ) : (
        <ul className="emp-drivers">
          {drivers.map((d) => {
            const sign = d.weight > 0 ? "+" : d.weight < 0 ? "−" : "·";
            return (
              <li key={d.id} className="emp-driver-row">
                <div className="emp-driver-pair">
                  <span className="emp-driver-node">{d.fromLabel}</span>
                  <ArrowRight
                    className="h-3 w-3 emp-driver-arrow"
                    strokeWidth={1.6}
                    style={{ transform: ar ? "scaleX(-1)" : undefined }}
                  />
                  <span className="emp-driver-node">{d.toLabel}</span>
                </div>
                {d.rationale ? (
                  <p className="emp-driver-rationale">{d.rationale}</p>
                ) : null}
                <div className="emp-driver-meta">
                  <span className="emp-driver-weight" data-dir={d.weight >= 0 ? "up" : "down"}>
                    {sign}
                    {Math.abs(d.weight).toFixed(2)}
                  </span>
                  <span className="emp-driver-conf">
                    {ar ? "ثقة" : "conf"} {Math.round(d.confidence * 100)}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
