export default function TrackViz() {
  const pathD = "M40,140 C220,20 420,20 600,140 S980,260 1180,140";
  const trains = Array.from({ length: 6 }).map((_, i) => ({ id: i, delay: i * 1.6 }));
  return (
    <div className="w-full rounded-lg border bg-card p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium">Depot Turnout Simulation</p>
        <p className="text-xs text-muted-foreground">Animated path — scaled to viewport</p>
      </div>

      {/* make SVG span full page width respecting container padding (2rem each side) */}
      <svg
        viewBox="0 0 1220 300"
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block w-[calc(100vw-4rem)] max-w-none h-[45vh] lg:h-[70vh]"
        role="img"
        aria-label="Depot turnout simulation"
      >
        <defs>
          <linearGradient id="trackGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#9AE6B4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#63B3ED" stopOpacity="0.9" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* guide path for animation */}
        <path id="p" d={pathD} fill="none" stroke="transparent" />

        {/* visible track */}
        <path d={pathD} fill="none" stroke="url(#trackGrad)" strokeWidth="10" strokeLinecap="round" />
        <path d={pathD} fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="8 10" opacity="0.7" />

        {trains.map((t) => (
          <g key={t.id} filter="url(#glow)">
            {/* metro train group */}
            <g>
              {/* Use transform to center the train around motion point */}
              <g>
                {/* train body with nose */}
                <path
                  d="M-28 -8 h40 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-40 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6 z"
                  fill="hsl(var(--primary))"
                  stroke="rgba(0,0,0,0.08)"
                />
                {/* nose triangle */}
                <path d="M12 -8 L22 0 L12 8 Z" fill="#2b6cb0" />
                {/* windows */}
                <rect x={-20} y={-4} width={8} height={6} rx={1} fill="#fff" opacity={0.95} />
                <rect x={-8} y={-4} width={8} height={6} rx={1} fill="#fff" opacity={0.95} />
                <rect x={4} y={-4} width={8} height={6} rx={1} fill="#fff" opacity={0.95} />
                {/* small headlight */}
                <circle cx={18} cy={0} r={1.5} fill="#fff" opacity={0.9} />
                {/* bogies */}
                <circle cx={-10} cy={12} r={2.5} fill="#111" />
                <circle cx={8} cy={12} r={2.5} fill="#111" />

                <animateMotion dur="10s" begin={`${t.delay}s`} repeatCount="indefinite" rotate="auto">
                  <mpath href="#p" />
                </animateMotion>
              </g>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
