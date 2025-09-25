export default function CognitiveLoadMeter({
  confidence,
  resolved,
  pending,
}: {
  confidence: number; // 0-100
  resolved: number;
  pending: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(confidence)));
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const risk = clamped < 40 ? "text-red-600" : clamped < 70 ? "text-amber-600" : "text-emerald-600";
  const stroke = clamped < 40 ? "#dc2626" : clamped < 70 ? "#f59e0b" : "#059669";
  return (
    <div className="flex items-center gap-3">
      <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
        <circle cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 24 24)"
        />
        <text x="24" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill={stroke}>
          {clamped}
        </text>
      </svg>
      <div className="leading-tight">
        <div className={`text-sm font-semibold ${risk}`}>Decision confidence</div>
        <div className="text-xs text-muted-foreground">Resolved {resolved} · Pending {pending}</div>
      </div>
    </div>
  );
}
