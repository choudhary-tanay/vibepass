interface MetricRibbonProps {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "teal" | "indigo" | "sky" | "rose" | "amber" | "emerald" | "slate";
}

const toneStyles: Record<NonNullable<MetricRibbonProps["tone"]>, string> = {
  teal: "from-teal-500 to-cyan-500 text-teal-700 dark:text-teal-200",
  indigo: "from-indigo-500 to-violet-500 text-indigo-700 dark:text-indigo-200",
  sky: "from-sky-500 to-blue-500 text-sky-700 dark:text-sky-200",
  rose: "from-rose-500 to-pink-500 text-rose-700 dark:text-rose-200",
  amber: "from-amber-400 to-orange-500 text-amber-700 dark:text-amber-200",
  emerald: "from-emerald-500 to-teal-500 text-emerald-700 dark:text-emerald-200",
  slate: "from-slate-600 to-slate-800 text-slate-700 dark:text-slate-200",
};

export function MetricRibbon({
  label,
  value,
  detail,
  tone = "teal",
}: MetricRibbonProps) {
  return (
    <div className="metric-ribbon rounded-[1.35rem] p-4">
      <div className={`mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${toneStyles[tone]}`} />
      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {detail}
        </p>
      )}
    </div>
  );
}

export function RingGauge({
  value,
  label,
  tone = "teal",
}: {
  value: number;
  label: string;
  tone?: MetricRibbonProps["tone"];
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  const dash = `${safeValue} ${100 - safeValue}`;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 42 42" className="h-24 w-24 shrink-0 -rotate-90">
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="none"
          stroke="url(#ringGradient)"
          strokeDasharray={dash}
          strokeLinecap="round"
          strokeWidth="3"
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={tone === "sky" ? "#38bdf8" : tone === "indigo" ? "#818cf8" : "#2dd4bf"} />
            <stop offset="100%" stopColor={tone === "rose" ? "#fb7185" : tone === "amber" ? "#f59e0b" : "#10b981"} />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <p className="text-3xl font-black text-slate-950 dark:text-white">
          {safeValue}%
        </p>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

export function TrendLine({
  points,
  label,
  valuePrefix = "",
}: {
  points: number[];
  label?: string;
  valuePrefix?: string;
}) {
  const safePoints = points.length > 0 ? points : [0, 0, 0, 0];
  const max = Math.max(...safePoints, 1);
  const min = Math.min(...safePoints);
  const spread = Math.max(max - min, 1);
  const coords = safePoints
    .map((point, index) => {
      const x = safePoints.length === 1 ? 140 : (index / (safePoints.length - 1)) * 280;
      const y = 116 - ((point - min) / spread) * 86;
      return `${x},${y}`;
    })
    .join(" ");
  const latest = safePoints[safePoints.length - 1] ?? 0;

  return (
    <div className="visual-panel rounded-[1.75rem] p-5">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          {label && (
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
              {label}
            </p>
          )}
          <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
            {valuePrefix}
            {latest.toLocaleString("en-IN")}
          </p>
        </div>
        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
          Live
        </span>
      </div>
      <svg viewBox="0 0 280 130" className="h-36 w-full overflow-visible">
        <path
          d="M0 118 C 56 110, 84 126, 140 112 S 224 86, 280 94"
          fill="none"
          stroke="currentColor"
          strokeDasharray="4 8"
          strokeLinecap="round"
          className="text-slate-200 dark:text-slate-700"
        />
        <polyline
          points={coords}
          fill="none"
          stroke="url(#trendGradient)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="7"
          className="chart-line-draw"
        />
        {safePoints.map((point, index) => {
          const x = safePoints.length === 1 ? 140 : (index / (safePoints.length - 1)) * 280;
          const y = 116 - ((point - min) / spread) * 86;
          return (
            <circle
              key={`${point}-${index}`}
              cx={x}
              cy={y}
              r="5"
              fill="#fff"
              stroke="#14b8a6"
              strokeWidth="3"
            />
          );
        })}
        <defs>
          <linearGradient id="trendGradient" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="52%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function WaveBars({
  items,
  tone = "teal",
  valuePrefix = "",
}: {
  items: { label: string; value: number }[];
  tone?: MetricRibbonProps["tone"];
  valuePrefix?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const gradient =
    tone === "sky"
      ? "from-sky-400 to-blue-600"
      : tone === "indigo"
        ? "from-indigo-400 to-violet-600"
        : tone === "rose"
          ? "from-rose-400 to-pink-600"
          : tone === "amber"
            ? "from-amber-300 to-orange-500"
            : "from-teal-400 to-emerald-600";

  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400 dark:border-slate-700">
        No chart data yet.
      </div>
    );
  }

  return (
    <div className="grid min-h-72 grid-cols-[repeat(auto-fit,minmax(4rem,1fr))] items-end gap-3 rounded-[1.75rem] bg-white/60 p-4 dark:bg-slate-950/30">
      {items.map((item, index) => {
        const height = Math.max(14, Math.round((item.value / max) * 100));
        return (
          <div key={item.label} className="flex min-w-0 flex-col items-center gap-2">
            <div className="relative flex h-48 w-full items-end justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`w-full rounded-full bg-gradient-to-t ${gradient}`}
                style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }}
              />
            </div>
            <p className="w-full truncate text-center text-xs font-black text-slate-700 dark:text-slate-200">
              {valuePrefix}
              {item.value.toLocaleString("en-IN")}
            </p>
            <p className="w-full truncate text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function AvatarBadge({
  name,
  role,
  imageUrl,
  tone = "teal",
}: {
  name: string;
  role?: string;
  imageUrl?: string;
  tone?: MetricRibbonProps["tone"];
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "C";
  const bg =
    tone === "indigo"
      ? "from-indigo-400 to-violet-500"
      : tone === "sky"
        ? "from-sky-400 to-blue-500"
        : "from-teal-400 to-emerald-500";

  return (
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <div
          className="h-12 w-12 rounded-2xl bg-cover bg-center shadow-lg"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${bg} text-lg font-black text-white shadow-lg`}>
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-950 dark:text-white">
          {name}
        </p>
        {role && (
          <p className="truncate text-xs font-semibold capitalize text-slate-500 dark:text-slate-400">
            {role}
          </p>
        )}
      </div>
    </div>
  );
}
