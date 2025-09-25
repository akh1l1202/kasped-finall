import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useState } from "react";
import { makeFleet, buildRowsFromFleet } from "@/components/planner/fleet";
import { Row, compositeScore } from "@/components/planner/InductionTable";
import WeightSliders from "@/components/planner/WeightSliders";
import TrackViz from "@/components/planner/TrackViz";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Simulator() {
  const defaultWeights = { readiness: 40, reliability: 30, cost: 20, branding: 10 };
  const baseFleet = makeFleet();
  const [rows, setRows] = useState<Row[]>(() => buildRowsFromFleet(defaultWeights, baseFleet));

  const [selectedTrainId, setSelectedTrainId] = useState<number | null>(rows[0]?.id ?? null);
  const [selectedMethod, setSelectedMethod] = useState<string>("rule-engine");
  const [selectedObjective, setSelectedObjective] = useState<string>("fitness");
  // inputValue used for numeric objectives; for boolean objectives we use selectedBool
  const [inputValue, setInputValue] = useState<number | "">("");
  const [selectedBool, setSelectedBool] = useState<boolean>(true);
  const [changeResult, setChangeResult] = useState<{ prev: string | number; next: string | number; applied: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onTrainChange(val: string) {
    const id = val ? Number(val) : null;
    setSelectedTrainId(id);
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    // set defaults for input based on objective
    if (["fitness", "telecom", "signalling", "cleaning"].includes(selectedObjective)) {
      let curr = true;
      switch (selectedObjective) {
        case "fitness":
          curr = r.fitnessOK;
          break;
        case "telecom":
          curr = r.telecomOK;
          break;
        case "signalling":
          curr = r.signallingOK;
          break;
        case "cleaning":
          curr = r.cleaningReady;
          break;
      }
      setSelectedBool(curr);
      setInputValue("");
    } else {
      if (selectedObjective === "brand") setInputValue(r.brandingPriority);
      if (selectedObjective === "jobs") setInputValue(r.maximoOpenJobs);
      setSelectedBool(true);
    }
  }

  function applyObjectiveChange() {
    if (!selectedTrainId) return;
    const prevRow = rows.find((r) => r.id === selectedTrainId);
    if (!prevRow) return;

    // determine prev and new numeric for comparison
    let prevNumeric: number;
    let newNumeric: number;
    if (["fitness", "telecom", "signalling", "cleaning"].includes(selectedObjective)) {
      let prevBool = false;
      switch (selectedObjective) {
        case "fitness":
          prevBool = prevRow.fitnessOK;
          break;
        case "telecom":
          prevBool = prevRow.telecomOK;
          break;
        case "signalling":
          prevBool = prevRow.signallingOK;
          break;
        case "cleaning":
          prevBool = prevRow.cleaningReady;
          break;
      }
      prevNumeric = prevBool ? 1 : 0;
      newNumeric = selectedBool ? 1 : 0;
    } else {
      prevNumeric = selectedObjective === "brand" ? prevRow.brandingPriority : prevRow.maximoOpenJobs;
      if (inputValue === "") return;
      newNumeric = Number(inputValue);
      if (isNaN(newNumeric)) return;
    }

    // compare: if newNumeric > prevNumeric -> apply; else no change
    const apply = newNumeric > prevNumeric;

    // prepare display values
    const prevDisplay = ["fitness", "telecom", "signalling", "cleaning"].includes(selectedObjective)
      ? (prevNumeric ? "true" : "false")
      : prevNumeric;
    const nextDisplay = ["fitness", "telecom", "signalling", "cleaning"].includes(selectedObjective)
      ? (newNumeric ? "true" : "false")
      : newNumeric;

    if (!apply) {
      setChangeResult({ prev: prevDisplay, next: nextDisplay, applied: false });
      setMessage("No changes");
      return;
    }

    // apply change
    const draft = rows.map((r) => ({ ...r }));
    const target = draft.find((r) => r.id === selectedTrainId);
    if (!target) return;
    if (["fitness", "telecom", "signalling", "cleaning"].includes(selectedObjective)) {
      const boolVal = newNumeric === 1;
      switch (selectedObjective) {
        case "fitness":
          target.fitnessOK = boolVal;
          break;
        case "telecom":
          target.telecomOK = boolVal;
          break;
        case "signalling":
          target.signallingOK = boolVal;
          break;
        case "cleaning":
          target.cleaningReady = boolVal;
          break;
      }
    } else if (selectedObjective === "brand") {
      target.brandingPriority = newNumeric;
    } else if (selectedObjective === "jobs") {
      target.maximoOpenJobs = Math.max(0, Math.floor(newNumeric));
    }

    const rebuilt = buildRowsFromFleet(defaultWeights, draft as any);
    setRows(rebuilt);

    // save base fleet to localStorage so Index picks up changes
    try {
      const base = draft.map((d) => ({
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
      }));
      localStorage.setItem("fleet_saved", JSON.stringify(base));
      try {
        window.dispatchEvent(new Event('fleet-updated'));
      } catch {}
    } catch {}

    setChangeResult({ prev: prevDisplay, next: nextDisplay, applied: true });
    setMessage("Changes made successfully");
  }

  const [weights, setWeights] = useState(defaultWeights);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <main className="container py-8">
        <div className="space-y-6">
          <div className="p-4 rounded-md border bg-card flex flex-col gap-4">
            {/* Train selector at top */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium w-24">Train</label>
              <select
                className="rounded-md border px-2 py-1 min-w-[180px]"
                value={selectedTrainId ?? ""}
                onChange={(e) => onTrainChange(e.target.value)}
              >
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Attribute buttons (green) */}
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium w-24">Attribute</div>
              <div className="flex items-center gap-2">
                <button
                  className={"px-3 py-1 rounded-md bg-emerald-600 text-white" + (selectedMethod === "rule-engine" ? " ring-2 ring-emerald-700" : "")}
                  onClick={() => setSelectedMethod("rule-engine")}
                >
                  Rule engine
                </button>
                <button
                  className={"px-3 py-1 rounded-md bg-emerald-600 text-white" + (selectedMethod === "constraint" ? " ring-2 ring-emerald-700" : "")}
                  onClick={() => setSelectedMethod("constraint")}
                >
                  Constraint programming
                </button>
                <button
                  className={"px-3 py-1 rounded-md bg-emerald-600 text-white" + (selectedMethod === "ai" ? " ring-2 ring-emerald-700" : "")}
                  onClick={() => setSelectedMethod("ai")}
                >
                  AI / ML
                </button>
              </div>
            </div>

            {/* Objective selector at top */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium w-24">Objective</label>
              <select value={selectedObjective} onChange={(e) => {
                  const val = e.target.value;
                  setSelectedObjective(val);
                  const r = rows.find((x) => x.id === selectedTrainId);
                  if (!r) return;
                  if (["fitness","telecom","signalling","cleaning"].includes(val)) {
                    let curr=true;
                    switch(val) {
                      case 'fitness': curr = r.fitnessOK; break;
                      case 'telecom': curr = r.telecomOK; break;
                      case 'signalling': curr = r.signallingOK; break;
                      case 'cleaning': curr = r.cleaningReady; break;
                    }
                    setSelectedBool(curr);
                    setInputValue("");
                  } else {
                    if (val === 'brand') setInputValue(r.brandingPriority);
                    if (val === 'jobs') setInputValue(r.maximoOpenJobs);
                  }
                }} className="rounded-md border px-2 py-1 min-w-[180px]">
                <option value="fitness">Fitness</option>
                <option value="telecom">Telecom</option>
                <option value="signalling">Signalling</option>
                <option value="cleaning">Cleaning</option>
                <option value="brand">Brand</option>
                <option value="jobs">Jobs</option>
              </select>
            </div>

            {/* Input area */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium w-24">Value</label>
              {/* boolean objectives show checkbox toggle */}
              {["fitness", "telecom", "signalling", "cleaning"].includes(selectedObjective) ? (
                <div className="flex items-center gap-2">
                  <button
                    className={"px-3 py-1 rounded-md " + (selectedBool ? "bg-emerald-600 text-white" : "border")}
                    onClick={() => setSelectedBool(true)}
                  >
                    True
                  </button>
                  <button
                    className={"px-3 py-1 rounded-md " + (!selectedBool ? "bg-red-600 text-white" : "border")}
                    onClick={() => setSelectedBool(false)}
                  >
                    False
                  </button>
                </div>
              ) : (
                <input
                  type="number"
                  className="w-36 rounded-md border px-2 py-1"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="enter number"
                />
              )}

              <button className="px-3 py-1 rounded-md bg-emerald-600 text-white ml-auto" onClick={applyObjectiveChange}>
                Apply
              </button>
            </div>
          </div>

          {/* Changes result box */}
          {changeResult && (
            <div className={"p-4 rounded-md border " + (changeResult.applied ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900")}>
              <div className="font-semibold">{changeResult.applied ? "Changes made successfully" : "No changes"}</div>
              <div className="mt-2 text-sm">Previous: <span className="font-mono">{changeResult.prev}</span> → New: <span className="font-mono">{changeResult.next}</span></div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-1">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>What‑if simulation</CardTitle>
                  <CardDescription>Adjust weights and simulate outcomes</CardDescription>
                </CardHeader>
                <CardContent>
                  <WeightSliders weights={weights} onChange={setWeights} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conflict Monitor</CardTitle>
                  <CardDescription>Automatic alerts that impact service readiness</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {sorted.slice(0, 20).map((t) => {
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

            <div>
              <TrackViz />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
