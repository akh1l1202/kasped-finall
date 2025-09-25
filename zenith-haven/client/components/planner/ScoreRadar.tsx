import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type RadarDatum = { metric: string; value: number };

export default function ScoreRadar({ data }: { data: RadarDatum[] }) {
  return (
    <div className="h-56 md:h-64 overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius={90} cx="50%" cy="50%" margin={{ top: 18, right: 24, bottom: 24, left: 24 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          <Tooltip contentStyle={{ background: "hsl(var(--popover))", borderColor: "hsl(var(--border))" }} />
          <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
