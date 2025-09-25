import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Weights, normaliseWeights } from "./WeightSliders";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { useState, Fragment } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import ScoreRadar from "@/components/planner/ScoreRadar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export type Train = {
  id: number;
  code: string; // e.g., KMRL-01
  fitnessOK: boolean;
  telecomOK: boolean;
  signallingOK: boolean;
  maximoOpenJobs: number;
  brandingPriority: number; // 0-100
  mileageKm: number; // total daily km planned
  cleaningReady: boolean;
  bayIndex: number; // lower is nearer turnout
};

export function computeObjectives(t: Train) {
  const readiness =
    (t.fitnessOK && t.telecomOK && t.signallingOK ? 1 : 0) * 60 +
    (t.cleaningReady ? 40 : 0);
  const reliability = Math.max(0, 100 - t.maximoOpenJobs * 12);
  const cost = Math.max(0, 100 - Math.abs(200 - t.mileageKm));
  const branding = t.brandingPriority;
  const shunting = Math.max(0, 100 - t.bayIndex * 8);
  return { readiness, reliability, cost, branding, shunting };
}

export function compositeScore(t: Train, weights: Weights) {
  const w = normaliseWeights(weights);
  const o = computeObjectives(t);
  const score =
    o.readiness * (w.readiness / 100) +
    o.reliability * (w.reliability / 100) +
    o.cost * (w.cost / 100) +
    o.branding * (w.branding / 100);
  return { score, objectives: o };
}

export type Status = "Revenue" | "Standby" | "IBL";
export type Row = Train & {
  status: Status;
  manualRank?: number | null;
  overrideStatus?: Status | null;
};

export function InductionTable({
  rows,
  weights,
  onChange,
}: {
  rows: Row[];
  weights: Weights;
  onChange?: (id: number, patch: Partial<Row>) => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const sorted = rows;

  const rankMap = new Map(sorted.map((t, i) => [t.id, i + 1]));

  function alertDetails(t: Row) {
    const list: { label: string; detail: string }[] = [];
    if (!t.telecomOK) list.push({ label: "Telecom pending", detail: `Telecom cert expires in ${(t.id % 6) + 1}h` });
    if (!t.fitnessOK) list.push({ label: "Fitness pending", detail: `RS fitness window lapsed ${(t.id % 3) + 1}d ago` });
    if (!t.signallingOK) list.push({ label: "Signalling pending", detail: `ATP validation due in ${(t.id % 5) + 1}h` });
    if (!t.cleaningReady) list.push({ label: "Cleaning not ready", detail: `Bay ${t.bayIndex + 1} occupied until ${6 + (t.id % 4)}:00` });
    if (t.maximoOpenJobs > 0) list.push({ label: "Open job-cards", detail: `${t.maximoOpenJobs} work order(s) open in Maximo` });
    const exposure = Math.max(0, Math.min(100, Math.round((t.brandingPriority + (t.mileageKm % 100)) % 100)));
    list.push({ label: "Branding SLA", detail: `${exposure}% exposure met` });
    return list;
  }

  function RowItem({ t }: { t: Row }) {
    const comp = compositeScore(t, weights);
    const isExpanded = expandedId === t.id;
    const rank = rankMap.get(t.id) ?? 0;
    return (
      <Fragment key={t.id}>
        <TableRow
          className={cn(
            "relative border-l-4",
            t.status === "Revenue" ? "bg-emerald-500/5 border-l-emerald-600" : t.status === "Standby" ? "bg-amber-500/5 border-l-amber-500" : "bg-red-500/5 border-l-red-600",
          )}
        >
          <TableCell className="w-10">
            <button
              className="p-1 rounded hover:bg-muted"
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </TableCell>
          <TableCell className="w-16 font-mono text-xs text-muted-foreground">#{rank}</TableCell>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center justify-center w-8 h-6 rounded text-xs font-semibold",
                t.status === "Revenue" ? "bg-emerald-600 text-white" : t.status === "Standby" ? "bg-amber-500 text-black" : "bg-red-600 text-white",
              )}>{t.id}</span>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span>{t.code}</span>
                  <span className="text-xs text-muted-foreground">Bay {t.bayIndex + 1}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent sideOffset={6} className="w-56">
                    <DropdownMenuLabel className="text-sm">#{rank} — {t.code}</DropdownMenuLabel>
                    <div className="px-3 py-1">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Status</div>
                        <div>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                            t.status === "Revenue" ? "bg-emerald-600 text-white" : t.status === "Standby" ? "bg-amber-500 text-black" : "bg-red-600 text-white",
                          )}>{t.status}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs">Composite <span className="font-semibold">{comp.score.toFixed(0)}</span></div>
                      <DropdownMenuSeparator />
                      <div className="mt-2 space-y-1 text-xs">
                        {Object.entries(computeObjectives(t)).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="capitalize text-muted-foreground">{k}</span>
                            <span className="font-mono text-sm">{Math.round(Number(v))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setExpandedId(isExpanded ? null : t.id)}>Open details</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <div className="flex flex-wrap gap-2">
              <Badge variant={t.fitnessOK ? "default" : "destructive"}>Fitness</Badge>
              <Badge variant={t.telecomOK ? "default" : "destructive"}>Telecom</Badge>
              <Badge variant={t.signallingOK ? "default" : "destructive"}>Signalling</Badge>
              <Badge variant={t.cleaningReady ? "secondary" : "outline"}>Cleaning</Badge>
              <Badge variant="outline">Brand {t.brandingPriority}</Badge>
              <Badge variant="outline">Jobs {t.maximoOpenJobs}</Badge>
            </div>
          </TableCell>
          <TableCell className="w-20 font-semibold tabular-nums">{comp.score.toFixed(0)}</TableCell>
          <TableCell className="w-32 whitespace-nowrap">
            <Badge
              className={cn(
                t.status === "Revenue"
                  ? "bg-emerald-600 text-white hover:bg-emerald-600"
                  : t.status === "Standby"
                    ? "bg-amber-500 text-black hover:bg-amber-500"
                    : "bg-red-600 text-white hover:bg-red-600",
              )}
            >
              {t.status}
            </Badge>
          </TableCell>
          <TableCell className="hidden lg:table-cell w-[420px]">
            <div className="flex flex-wrap gap-1">
              {alertDetails(t).map((a, i) => (
                <HoverCard key={i}>
                  <HoverCardTrigger asChild>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hover:-translate-y-0.5 transition-transform cursor-help bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200">
                      {a.label}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent align="start" className="text-xs">
                    {a.detail}
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && (
          <TableRow className="bg-muted/30">
            <TableCell colSpan={7}>
              <div className="grid gap-6 md:grid-cols-3 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Manual overrides</p>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select
                    value={(t.overrideStatus ?? t.status) as string}
                    onValueChange={(v) => onChange?.(t.id, { overrideStatus: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Revenue">Revenue</SelectItem>
                      <SelectItem value="Standby">Standby</SelectItem>
                      <SelectItem value="IBL">IBL</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="text-xs text-muted-foreground">Manual rank (1–40)</label>
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={t.manualRank ?? ""}
                    placeholder="auto"
                    onChange={(e) =>
                      onChange?.(t.id, { manualRank: e.currentTarget.value ? Number(e.currentTarget.value) : null })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Operational data</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <label className="col-span-1 text-muted-foreground">Branding</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={t.brandingPriority}
                      onChange={(e) => onChange?.(t.id, { brandingPriority: Number(e.currentTarget.value) })}
                    />
                    <label className="col-span-1 text-muted-foreground">Mileage km</label>
                    <Input
                      type="number"
                      min={0}
                      max={400}
                      value={t.mileageKm}
                      onChange={(e) => onChange?.(t.id, { mileageKm: Number(e.currentTarget.value) })}
                    />
                    <label className="col-span-1 text-muted-foreground">Bay index</label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={t.bayIndex}
                      onChange={(e) => onChange?.(t.id, { bayIndex: Number(e.currentTarget.value) })}
                    />
                    <label className="col-span-1 text-muted-foreground">Open jobs</label>
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={t.maximoOpenJobs}
                      onChange={(e) => onChange?.(t.id, { maximoOpenJobs: Number(e.currentTarget.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Objective breakdown</p>
                  {Object.entries(computeObjectives(t)).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-muted-foreground capitalize">{k}</span>
                      <div className="flex-1 h-2 rounded bg-muted">
                        <div className="h-2 rounded bg-primary" style={{ width: `${v}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs tabular-nums">{Math.round(v)}</span>
                    </div>
                  ))}

                  <div className="mt-4 min-w-[220px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold">{t.code}</div>
                      <div className="text-sm text-muted-foreground">Composite {comp.score.toFixed(0)}</div>
                    </div>
                    <ScoreRadar
                      data={[
                        { metric: "Readiness", value: computeObjectives(t).readiness },
                        { metric: "Reliability", value: computeObjectives(t).reliability },
                        { metric: "Cost", value: computeObjectives(t).cost },
                        { metric: "Branding", value: computeObjectives(t).branding },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </Fragment>
    );
  }

  function TableBlock({ data }: { data: Row[] }) {
    return (
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Trainset</TableHead>
              <TableHead className="hidden md:table-cell">Objectives</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Alerts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t) => (
              <RowItem key={t.id} t={t} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div>
      <TableBlock data={sorted} />
    </div>
  );
}
