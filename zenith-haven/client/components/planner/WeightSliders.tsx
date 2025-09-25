import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type Weights = {
  readiness: number;
  reliability: number;
  cost: number;
  branding: number;
};

export function normaliseWeights(w: Weights): Weights {
  const sum = w.readiness + w.reliability + w.cost + w.branding;
  if (sum === 0) return { readiness: 25, reliability: 25, cost: 25, branding: 25 };
  return {
    readiness: (w.readiness / sum) * 100,
    reliability: (w.reliability / sum) * 100,
    cost: (w.cost / sum) * 100,
    branding: (w.branding / sum) * 100,
  };
}

export default function WeightSliders({
  weights,
  onChange,
  className,
}: {
  weights: Weights;
  onChange: (w: Weights) => void;
  className?: string;
}) {
  const norm = useMemo(() => normaliseWeights(weights), [weights]);

  return (
    <div className={cn("grid gap-5", className)}>
      <WeightRow
        label="Service readiness"
        value={weights.readiness}
        percent={norm.readiness}
        onValueChange={(v) => onChange({ ...weights, readiness: v })}
      />
      <WeightRow
        label="Reliability"
        value={weights.reliability}
        percent={norm.reliability}
        onValueChange={(v) => onChange({ ...weights, reliability: v })}
      />
      <WeightRow
        label="Cost"
        value={weights.cost}
        percent={norm.cost}
        onValueChange={(v) => onChange({ ...weights, cost: v })}
      />
      <WeightRow
        label="Branding exposure"
        value={weights.branding}
        percent={norm.branding}
        onValueChange={(v) => onChange({ ...weights, branding: v })}
      />
      <p className="text-xs text-muted-foreground">Weights auto-normalise to 100%.</p>
    </div>
  );
}

function WeightRow({
  label,
  value,
  percent,
  onValueChange,
}: {
  label: string;
  value: number;
  percent: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{percent.toFixed(0)}%</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={(vals) => onValueChange(vals[0] ?? 0)}
      />
    </div>
  );
}
