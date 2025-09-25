import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";

const STATIONS = [
  "ALVA","PNCU","CPPY","ATTK","MUTT","KLMT","CCUV","PDPM","EDAP","CGPP","PARV","JLSD","KALR","TNHL","MGRD","MACE","ERSH","KVTR","EMKM","VYTA","THYK","PETT","VAKK","SNJN","TPHT",
] as const;

import { Row, Train as HomeTrain } from "@/components/planner/InductionTable";
import { buildRowsFromFleet, makeFleet } from "@/components/planner/fleet";
import { Weights } from "@/components/planner/WeightSliders";

type Status = "Revenue" | "Standby" | "IBL";

type VizTrain = {
  id: number;
  code: string;
  status: Status;
  // visual motion state
  lane: "up" | "down";
};

function useNow(tickMs = 120) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setT((x) => x + tickMs / 1000), tickMs);
    return () => clearInterval(h);
  }, [tickMs]);
  return t;
}

export default function Network() {
  const now = useNow();
  const [selected, setSelected] = useState<Row | null>(null);
  const defaultWeights: Weights = { readiness: 40, reliability: 30, cost: 20, branding: 10 };
  const rows = useMemo(() => buildRowsFromFleet(defaultWeights, makeFleet()), []);
  const rowMap = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows]);
  const activeRows = rows.filter((r) => r.status === "Revenue");
  const standbyRows = rows.filter((r) => r.status === "Standby");
  const iblRows = rows.filter((r) => r.status === "IBL");
  // single-track visualization: all Revenue trains move same direction with station dwells

  const W = 1200;
  const H = 500;
  const margin = { l: 60, r: 60, t: 80, b: 120 };
  const yMain = 200;
  const x = (i: number) => margin.l + (i * (W - margin.l - margin.r)) / (STATIONS.length - 1);

  // single mainline yard anchors
  const standbyBase = { x: margin.l + 180, y: yMain + 100 };
  const iblBase = { x: W - margin.r - 250, y: yMain + 160 };

  function color(status: Status) {
    if (status === "Revenue") return "#059669";
    if (status === "Standby") return "#f59e0b";
    return "#dc2626";
  }

  function onClickTrain(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(rowMap[id] ?? null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" onClick={() => setSelected(null)}>
      <Header />
      <main className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kochi Metro — Network Schematic</h1>
            <p className="text-muted-foreground text-sm">Mock diagram • single mainline with station dwells, standby siding, IBL maintenance yard</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge className="bg-emerald-600 text-white">Active: {activeRows.length}</Badge>
            <Badge className="bg-amber-500 text-black">Standby: {standbyRows.length}</Badge>
            <Badge className="bg-red-600 text-white">IBL: {iblRows.length}</Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 overflow-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[520px] min-w-[800px]">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>
            {/* Mainline single track */}
            <line x1={margin.l} y1={yMain} x2={W - margin.r} y2={yMain} stroke="hsl(var(--border))" strokeWidth={12} strokeLinecap="round"/>
            <line x1={margin.l} y1={yMain} x2={W - margin.r} y2={yMain} stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="8 8" markerEnd="url(#arrow)"/>

            {/* Station ticks and labels */}
            {STATIONS.map((s, i) => (
              <g key={s}>
                <line x1={x(i)} y1={yMain-18} x2={x(i)} y2={yMain+18} stroke="hsl(var(--foreground))" strokeWidth={2} />
                <circle cx={x(i)} cy={yMain} r={4} fill="hsl(var(--foreground))" />
                <text x={x(i)} y={yMain+36} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
                  {s}
                </text>
                <text x={x(i)} y={yMain+52} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  Zone {s}
                </text>
              </g>
            ))}

            {/* Standby siding */}
            <path d={`M ${standbyBase.x-120},${yMain} C ${standbyBase.x-60},${yMain+40} ${standbyBase.x-40},${standbyBase.y} ${standbyBase.x},${standbyBase.y}`} fill="none" stroke="hsl(var(--border))" strokeWidth={8} />
            <text x={standbyBase.x} y={standbyBase.y+40} className="fill-muted-foreground text-xs">Standby Siding</text>

            {/* IBL yard */}
            <path d={`M ${iblBase.x-120},${yMain} C ${iblBase.x-60},${iblBase.y-40} ${iblBase.x-40},${iblBase.y} ${iblBase.x},${iblBase.y}`} fill="none" stroke="#dc2626" strokeWidth={8} />
            <text x={iblBase.x} y={iblBase.y+40} className="fill-red-600 text-xs">IBL Maintenance</text>

            {/* Revenue trains with station dwells on single mainline, evenly phased to avoid overlap */}
            {(() => {
              const items = [] as JSX.Element[];
              const travel = 4; // seconds between stations
              const dwell = 1.5; // seconds stopped at station
              const block = travel + dwell;
              const segments = STATIONS.length - 1;
              const lap = segments * block;
              const n = activeRows.length || 1;
              for (let i = 0; i < activeRows.length; i++) {
                const r = activeRows[i];
                const phase = (i / n) * lap;
                const local = (now + phase) % lap;
                const seg = Math.floor(local / block);
                const tIn = local - seg * block;
                const moving = tIn < travel;
                const frac = moving ? tIn / travel : 1;
                const i0 = Math.min(segments - 1, Math.max(0, seg));
                const xPos = x(i0) + frac * (x(i0 + 1) - x(i0));
                items.push(
                  <g key={`rev-${r.id}`} transform={`translate(${xPos},${yMain})`} onClick={(e)=>onClickTrain(r.id,e)} className="cursor-pointer">
                    <rect x={-12} y={-6} width={24} height={12} rx={2} fill={color("Revenue")} />
                    {[0,1,2,3].map((k)=> (<rect key={k} x={-12 + k*6} y={-6} width={5} height={12} fill="rgba(255,255,255,0.2)" />))}
                    <title>{`${r.code} • Revenue`}</title>
                  </g>
                );
              }
              return items;
            })()}

            {/* Standby trains in siding */}
            {standbyRows.map((t, i) => (
              <g key={t.id} transform={`translate(${standbyBase.x + i*26},${standbyBase.y})`} onClick={(e)=>onClickTrain(t.id,e)} className="cursor-pointer">
                <rect x={-12} y={-6} width={24} height={12} rx={2} fill={color("Standby")} />
                {[0,1,2,3].map((k)=> (
                  <rect key={k} x={-12 + k*6} y={-6} width={5} height={12} fill="rgba(0,0,0,0.15)" />
                ))}
                <title>{`${t.code} • Standby`}</title>
              </g>
            ))}

            {/* IBL trains in maintenance yard */}
            {iblRows.map((t, i) => (
              <g key={t.id} transform={`translate(${iblBase.x + i*26},${iblBase.y})`} onClick={(e)=>onClickTrain(t.id,e)} className="cursor-pointer">
                <rect x={-12} y={-6} width={24} height={12} rx={2} fill={color("IBL")} />
                {[0,1,2,3].map((k)=> (
                  <rect key={k} x={-12 + k*6} y={-6} width={5} height={12} fill="rgba(255,255,255,0.25)" />
                ))}
                <title>{`${t.code} • IBL`}</title>
              </g>
            ))}
          </svg>

          {selected && (
            <div className="mt-4 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{selected.code}</div>
                <Badge className={selected.status === 'Revenue' ? 'bg-emerald-600 text-white' : selected.status==='Standby' ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'}>
                  {selected.status}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">Bay</div><div>#{selected.bayIndex + 1}</div>
                <div className="text-muted-foreground">Fitness</div><div>{selected.fitnessOK ? 'OK' : 'Expired'}</div>
                <div className="text-muted-foreground">Telecom</div><div>{selected.telecomOK ? 'OK' : 'Pending'}</div>
                <div className="text-muted-foreground">Signalling</div><div>{selected.signallingOK ? 'OK' : 'Pending'}</div>
                <div className="text-muted-foreground">Open jobs</div><div>{selected.maximoOpenJobs}</div>
                <div className="text-muted-foreground">Branding priority</div><div>{selected.brandingPriority}</div>
                <div className="text-muted-foreground">Mileage (km)</div><div>{selected.mileageKm}</div>
                <div className="text-muted-foreground">Cleaning</div><div>{selected.cleaningReady ? 'Ready' : 'Not ready'}</div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
