import { Row, Train, compositeScore } from "@/components/planner/InductionTable";
import { Weights } from "@/components/planner/WeightSliders";

export function makeFleet(): Train[] {
  const arr: Train[] = [];
  for (let i = 0; i < 25; i++) {
    const code = `KMRL-${String(i + 1).padStart(2, "0")}`;
    arr.push({
      id: i + 1,
      code,
      fitnessOK: i % 7 !== 0,
      telecomOK: i % 5 !== 0,
      signallingOK: i % 11 !== 0,
      maximoOpenJobs: (i * 3) % 5,
      brandingPriority: 30 + ((i * 17) % 70),
      mileageKm: 150 + ((i * 13) % 160),
      cleaningReady: i % 4 !== 0,
      bayIndex: i % 12,
    });
  }
  return arr;
}

export function buildRowsFromFleet(weights: Weights, base: Train[] = makeFleet()): Row[] {
  const rows: Row[] = base.map((t) => ({ ...t, status: "IBL" as const }));
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
}
