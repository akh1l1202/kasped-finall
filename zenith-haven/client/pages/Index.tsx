import { useMemo, useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InductionTable, Row, compositeScore } from "@/components/planner/InductionTable";
import WeightSliders, { Weights, normaliseWeights } from "@/components/planner/WeightSliders";
import CognitiveLoadMeter from "@/components/planner/CognitiveLoadMeter";
import { makeFleet, buildRowsFromFleet } from "@/components/planner/fleet";

function aggregateAlerts(rows: Row[]) {
  const all: Record<string, number> = {};
  const totalAlerts = rows.reduce((acc, t) => {
    const alerts: string[] = [];
    if (!t.telecomOK) alerts.push("Telecom pending");
    if (!t.fitnessOK) alerts.push("Fitness pending");
    if (!t.signallingOK) alerts.push("Signalling pending");
    if (!t.cleaningReady) alerts.push("Cleaning not ready");
    if (t.maximoOpenJobs > 0) alerts.push("Open job-cards");
    alerts.forEach((a) => (all[a] = (all[a] ?? 0) + 1));
    return acc + alerts.length;
  }, 0);
  const top = Object.entries(all)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));
  return { top, totalAlerts };
}

function CognitiveLoadWidget({ rows }: { rows: Row[] }) {
  const resolved = rows.filter((r) => r.overrideStatus || r.manualRank != null).length;
  const { totalAlerts } = aggregateAlerts(rows);
  const pending = Math.max(0, totalAlerts - resolved);
  const confidence = (resolved / Math.max(1, resolved + pending)) * 100;
  return <CognitiveLoadMeter confidence={confidence} resolved={resolved} pending={pending} />;
}

function HandoverControls({ rows }: { rows: Row[] }) {
  const snapshot = {
    at: new Date().toISOString(),
    topRisks: aggregateAlerts(rows).top,
    allocations: rows.slice(0, 25).map((r, i) => ({ rank: i + 1, code: r.code, status: r.status })),
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    } catch {}
  }
  return (
    <div className="mt-6 rounded-md border p-4 bg-secondary/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Shift Handover Mode</p>
          <p className="text-xs text-muted-foreground">One-click snapshot with annotated decision trails</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90">Copy snapshot</button>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Top risks tonight: {snapshot.topRisks.map((r) => `${r.label} (${r.count})`).join(" • ")}
      </div>
    </div>
  );
}

export default function Index() {
  const [weights, setWeights] = useState<Weights>({ readiness: 40, reliability: 30, cost: 20, branding: 10 });
  const [rows, setRows] = useState<Row[]>(() => {
    try {
      const saved = localStorage.getItem("fleet_saved");
      if (saved) {
        const parsed = JSON.parse(saved) as any[];
        // rebuild ranks using buildRowsFromFleet so statuses are computed
        return buildRowsFromFleet({ readiness: 40, reliability: 30, cost: 20, branding: 10 }, parsed as any);
      }
    } catch {}
    // default
    return buildRowsFromFleet({ readiness: 40, reliability: 30, cost: 20, branding: 10 }, makeFleet());
  });

  const sorted = useMemo(() => {
    const withScores = rows.map((r) => ({ r, score: compositeScore(r, weights).score }));
    withScores.sort((a, b) => {
      const ra = a.r.manualRank ?? Number.POSITIVE_INFINITY;
      const rb = b.r.manualRank ?? Number.POSITIVE_INFINITY;
      if (ra !== rb) return ra - rb;
      return b.score - a.score;
    });
    const ranked = withScores.map((x) => x.r);
    ranked.forEach((r, i) => {
      const auto: Row["status"] = i < 17 ? "Revenue" : i < 20 ? "Standby" : "IBL";
      r.status = r.overrideStatus ?? auto;
    });
    return ranked;
  }, [rows, weights]);

  const norm = normaliseWeights(weights);

  const [crowd, setCrowd] = useState<string>("normal");

  useEffect(() => {
    function handler() {
      try {
        const saved = localStorage.getItem("fleet_saved");
        if (saved) {
          const parsed = JSON.parse(saved) as any[];
          setRows(buildRowsFromFleet({ readiness: 40, reliability: 30, cost: 20, branding: 10 }, parsed as any));
        }
      } catch {}
    }
    window.addEventListener("fleet-updated", handler);
    return () => window.removeEventListener("fleet-updated", handler);
  }, []);

  function applyCrowd() {
    const pctMap: Record<string, number> = {
      "very-low": 0.18,
      low: 0.36,
      normal: 0.6,
      high: 0.8,
      "very-high": 1.0,
    };
    const pct = pctMap[crowd] ?? 0.6;
    const rsIds = sorted.filter((r) => r.status === "Revenue" || r.status === "Standby");
    const tot = rsIds.length;
    if (tot === 0) return;
    const desiredRevenue = Math.round(tot * pct);
    const standbyCount = tot - desiredRevenue;

    const ids = sorted.map((s) => s.id);
    const newRows = rows.map((r) => ({ ...r }));

    // assign overrides based on sorted ranking
    let revenueAssigned = 0;
    let standbyAssigned = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const idx = newRows.findIndex((nr) => nr.id === id);
      if (idx === -1) continue;
      if (revenueAssigned < desiredRevenue && (sorted[i].status === "Revenue" || sorted[i].status === "Standby")) {
        newRows[idx].overrideStatus = "Revenue";
        revenueAssigned++;
      } else if (standbyAssigned < standbyCount && (sorted[i].status === "Revenue" || sorted[i].status === "Standby")) {
        newRows[idx].overrideStatus = "Standby";
        standbyAssigned++;
      } else {
        newRows[idx].overrideStatus = null;
      }
    }

    setRows(newRows);
    try {
      const base = newRows.map((d) => ({
        id: d.id,
        code: d.code,
        fitnessOK: d.fitnessOK,
        telecomOK: d.telecomOK,
        signallingOK: d.signallingOK,
        maximoOpenJobs: d.maximoOpenJobs,
        brandingPriority: d.brandingPriority,
        mileageKm: d.mileageKm,
        cleaningReady: d.cleaningReady,
        bayIndex: d.bayIndex,
        overrideStatus: d.overrideStatus ?? null,
      }));
      localStorage.setItem("fleet_saved", JSON.stringify(base));
      window.dispatchEvent(new Event("fleet-updated"));
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <main>
        <section className="border-b">
          <div className="container py-14 grid gap-10 items-center">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">Decision Support</Badge>
                <Badge variant="secondary">Multi‑Objective Optimisation</Badge>
                <Badge variant="secondary">Explainable AI</Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Nightly trainset induction for Kochi Metro — precise, explainable, and optimised.
              </h1>
              <p className="mt-4 text-muted-foreground text-lg">
                Consolidate certificates, Maximo job‑cards, branding commitments, mileage, cleaning slots, and stabling geometry into a single, auditable platform that generates a ranked induction list with conflict alerts and what‑if simulation.
              </p>
              <div className="mt-6 flex gap-3">
                <Button asChild>
                  <a href="#induction">Generate Induction List</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="#what-if">Run What‑if</a>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { k: "Fitness Certificates", v: "Rolling‑Stock, S&T" },
                  { k: "Job‑Card Status", v: "IBM Maximo" },
                  { k: "Branding Priorities", v: "SLA exposure" },
                  { k: "Mileage Balancing", v: "Wear equalisation" },
                  { k: "Cleaning Slots", v: "Bay & manpower" },
                  { k: "Stabling Geometry", v: "Shunting efficiency" },
                ].map((x) => (
                  <Card key={x.k}>
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm">{x.k}</CardTitle>
                      <CardDescription>{x.v}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="what-if" className="container py-14 grid gap-6 lg:grid-cols-[1fr_.7fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">What‑if simulation</h2>
            <p className="text-muted-foreground mt-1">
              Adjust weights to emphasise readiness, reliability, cost or branding. Scores renormalise automatically.
            </p>
            <Card className="mt-6">
              <CardContent className="pt-6">
                <WeightSliders weights={weights} onChange={setWeights} />
                <div className="mt-4 text-sm text-muted-foreground">
                  Current weights — Readiness {norm.readiness.toFixed(0)}% · Reliability {norm.reliability.toFixed(0)}% · Cost {norm.cost.toFixed(0)}% · Branding {norm.branding.toFixed(0)}%
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conflict Monitor</CardTitle>
                <CardDescription>Automatic alerts that impact service readiness</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {sorted.slice(0, 10).map((t) => {
                    const conflicts: string[] = [];
                    if (!t.telecomOK) conflicts.push("Telecom clearance missing");
                    if (!t.fitnessOK) conflicts.push("Fitness certificate expired");
                    if (t.maximoOpenJobs > 0) conflicts.push(`${t.maximoOpenJobs} job‑card(s) open`);
                    if (!t.cleaningReady) conflicts.push("Cleaning slot not ready");
                    if (conflicts.length === 0) return null;
                    return (
                      <li key={t.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{t.code}</span>
                        <span className="text-xs text-muted-foreground">{conflicts.join(" • ")}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="induction" className="container py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Ranked induction list</h2>
              <p className="text-muted-foreground mt-1">{sorted.filter(r=>r.status==='Revenue').length} revenue • {sorted.filter(r=>r.status==='Standby').length} standby • {sorted.filter(r=>r.status==='IBL').length} IBL — editable</p>
            </div>
            <div className="flex items-center gap-4">
              <CognitiveLoadWidget rows={sorted} />
              <div className="hidden md:flex gap-2">
                <Badge className="bg-emerald-600 text-white">Revenue</Badge>
                <Badge className="bg-amber-500 text-black">Standby</Badge>
                <Badge className="bg-red-600 text-white">IBL</Badge>
              </div>
            </div>
          </div>

          {/* Crowd selector + Top summary table: Revenue | Standby | IBL */}
          <div className="mt-6">
            <div className="rounded-md border p-4 bg-card">
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium">Crowd</label>
                  <select id="crowd" className="rounded-md border px-2 py-1" onChange={(e)=>{setCrowd(e.target.value)}} value={crowd}>
                    <option value="very-low">Very low</option>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="very-high">Very high</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <button className="px-3 py-1 rounded-md bg-primary text-white" onClick={applyCrowd}>Apply</button>
                </div>
              </div>

              <h3 className="text-sm font-medium mb-3">Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-3 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-emerald-700">Revenue</div>
                    <div className="text-sm font-mono text-emerald-900">{sorted.filter(r => r.status === 'Revenue').length}</div>
                  </div>
                  <ul className="grid grid-cols-3 gap-3 text-sm">
                    {sorted.filter(r => r.status === 'Revenue').map(t => (
                      <li key={t.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/20 hover:bg-muted/30">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold bg-emerald-600 text-white">{t.id}</span>
                        <span className="truncate">{t.code}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-amber-700">Standby</div>
                    <div className="text-sm font-mono text-amber-900">{sorted.filter(r => r.status === 'Standby').length}</div>
                  </div>
                  <ul className="grid grid-cols-3 gap-3 text-sm">
                    {sorted.filter(r => r.status === 'Standby').map(t => (
                      <li key={t.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/20 hover:bg-muted/30">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold bg-amber-500 text-black">{t.id}</span>
                        <span className="truncate">{t.code}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-red-700">IBL</div>
                    <div className="text-sm font-mono text-red-900">{sorted.filter(r => r.status === 'IBL').length}</div>
                  </div>
                  <ul className="grid grid-cols-3 gap-3 text-sm">
                    {sorted.filter(r => r.status === 'IBL').map(t => (
                      <li key={t.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/20 hover:bg-muted/30">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold bg-red-600 text-white">{t.id}</span>
                        <span className="truncate">{t.code}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <HandoverControls rows={sorted} />

          <div className="mt-6">
            <InductionTable
              rows={sorted}
              weights={weights}
              onChange={(id, patch) =>
                setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
              }
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
