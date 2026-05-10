// Renders structured-passage chart specs (bar / line / stacked_bar / grouped_bar / pie / venn).
// Falls back to plain text if the passage isn't a valid chart spec.
'use client';
import { arc as d3arc } from 'd3-shape';

type Series = { key: string; label: string };
type DataRow = Record<string, string | number>;

type BaseSpec = {
  __chart__: true;
  title?: string;
  yLabel?: string;
  xKey: string;
  series: Series[];
  data?: DataRow[];
  note?: string;
};

type VennSet = { label: string; value: number; color?: string };
type VennIntersection = { sets: string[]; value: number };
type VennSpec = BaseSpec & { type: 'venn'; sets: VennSet[]; intersections: VennIntersection[] };

type ChartSpec =
  | (BaseSpec & { type: 'bar' | 'line' | 'stacked_bar' | 'grouped_bar' | 'pie' })
  | VennSpec;

const PALETTE = ['#0d9488', '#1e3a5f', '#7c3aed', '#f59e0b', '#dc2626'];

export default function ChartPassage({ passage }: { passage: string | null }) {
  if (!passage) return null;
  const trimmed = passage.trim();
  if (!trimmed.startsWith('{')) {
    return <p className="whitespace-pre-line">{passage}</p>;
  }
  let spec: ChartSpec;
  try {
    spec = JSON.parse(trimmed);
  } catch {
    return <p className="whitespace-pre-line">{passage}</p>;
  }
  if (!spec.__chart__) {
    return <p className="whitespace-pre-line">{passage}</p>;
  }

  return (
    <div className="bg-white border border-line rounded-md p-4 mb-5">
      {spec.title && (
        <h3 className="text-[14px] font-bold text-navy mb-3 text-center">{spec.title}</h3>
      )}
      <Chart spec={spec} />
      {spec.note && (
        <p className="text-[11px] text-ink-muted italic mt-2 text-center">{spec.note}</p>
      )}
    </div>
  );
}

function Chart({ spec }: { spec: ChartSpec }) {
  switch (spec.type) {
    case 'bar': return <BarChart spec={spec as BaseSpec & { type: 'bar' }} />;
    case 'grouped_bar': return <GroupedBarChart spec={spec as BaseSpec & { type: 'grouped_bar' }} />;
    case 'stacked_bar': return <StackedBarChart spec={spec as BaseSpec & { type: 'stacked_bar' }} />;
    case 'line': return <LineChart spec={spec as BaseSpec & { type: 'line' }} />;
    case 'pie': return <PieChart spec={spec as BaseSpec & { type: 'pie' }} />;
    case 'venn': return <VennDiagram spec={spec as VennSpec} />;
    default: return <pre className="text-[11px]">{JSON.stringify(spec, null, 2)}</pre>;
  }
}

// ----------------------- shared layout -----------------------
const W = 600, H = 360;
const M = { top: 16, right: 24, bottom: 50, left: 56 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

function niceMax(maxVal: number): number {
  if (maxVal <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const norm = maxVal / exp;
  if (norm <= 1) return exp;
  if (norm <= 2) return 2 * exp;
  if (norm <= 5) return 5 * exp;
  return 10 * exp;
}

function YAxis({ max, label }: { max: number; label?: string }) {
  const ticks = 5;
  const step = max / ticks;
  return (
    <g>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = M.top + PH - (i * PH) / ticks;
        const v = i * step;
        return (
          <g key={i}>
            <line x1={M.left} x2={M.left + PW} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={i === 0 ? '0' : '2 3'} />
            <text x={M.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
              {Number.isInteger(step) ? v.toFixed(0) : v.toFixed(1)}
            </text>
          </g>
        );
      })}
      {label && (
        <text x={M.left} y={M.top - 4} fontSize="10" fill="#64748b">{label}</text>
      )}
    </g>
  );
}

function XAxis({ labels }: { labels: string[] }) {
  const bandW = PW / labels.length;
  return (
    <g>
      {labels.map((l, i) => (
        <text
          key={i}
          x={M.left + bandW * (i + 0.5)}
          y={M.top + PH + 18}
          textAnchor="middle"
          fontSize="11"
          fill="#1e293b"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

function Legend({ series, palette }: { series: Series[]; palette: string[] }) {
  return (
    <g>
      {series.map((s, i) => (
        <g key={s.key} transform={`translate(${M.left + i * 130}, ${H - 8})`}>
          <rect width="12" height="12" fill={palette[i % palette.length]} />
          <text x="16" y="10" fontSize="11" fill="#1e293b">{s.label}</text>
        </g>
      ))}
    </g>
  );
}

// ----------------------- Bar (single series) -----------------------
function BarChart({ spec }: { spec: BaseSpec & { type: 'bar' } }) {
  const data = spec.data ?? [];
  const sKey = spec.series[0]?.key;
  const max = niceMax(Math.max(...data.map((d) => Number(d[sKey] ?? 0))));
  const bandW = PW / Math.max(data.length, 1);
  const barW = bandW * 0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={spec.title}>
      <YAxis max={max} label={spec.yLabel} />
      <XAxis labels={data.map((d) => String(d[spec.xKey]))} />
      {data.map((d, i) => {
        const v = Number(d[sKey] ?? 0);
        const h = (v / max) * PH;
        const x = M.left + bandW * i + (bandW - barW) / 2;
        const y = M.top + PH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={PALETTE[0]} rx="2" />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#1e293b">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ----------------------- Grouped bar (multi-series side by side) -----------------------
function GroupedBarChart({ spec }: { spec: BaseSpec & { type: 'grouped_bar' } }) {
  const data = spec.data ?? [];
  const max = niceMax(Math.max(...data.flatMap((d) => spec.series.map((s) => Number(d[s.key] ?? 0)))));
  const bandW = PW / Math.max(data.length, 1);
  const groupW = bandW * 0.85;
  const barW = groupW / spec.series.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={spec.title}>
      <YAxis max={max} label={spec.yLabel} />
      <XAxis labels={data.map((d) => String(d[spec.xKey]))} />
      {data.map((d, i) =>
        spec.series.map((s, j) => {
          const v = Number(d[s.key] ?? 0);
          const h = (v / max) * PH;
          const x = M.left + bandW * i + (bandW - groupW) / 2 + barW * j;
          const y = M.top + PH - h;
          return <rect key={`${i}-${j}`} x={x} y={y} width={barW - 1} height={h} fill={PALETTE[j % PALETTE.length]} rx="1" />;
        })
      )}
      <Legend series={spec.series} palette={PALETTE} />
    </svg>
  );
}

// ----------------------- Stacked bar -----------------------
function StackedBarChart({ spec }: { spec: BaseSpec & { type: 'stacked_bar' } }) {
  const data = spec.data ?? [];
  const totals = data.map((d) => spec.series.reduce((s, ser) => s + Number(d[ser.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals));
  const bandW = PW / Math.max(data.length, 1);
  const barW = bandW * 0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={spec.title}>
      <YAxis max={max} label={spec.yLabel} />
      <XAxis labels={data.map((d) => String(d[spec.xKey]))} />
      {data.map((d, i) => {
        const x = M.left + bandW * i + (bandW - barW) / 2;
        let yCursor = M.top + PH;
        return (
          <g key={i}>
            {spec.series.map((s, j) => {
              const v = Number(d[s.key] ?? 0);
              const h = (v / max) * PH;
              yCursor -= h;
              return <rect key={s.key} x={x} y={yCursor} width={barW} height={h} fill={PALETTE[j % PALETTE.length]} />;
            })}
          </g>
        );
      })}
      <Legend series={spec.series} palette={PALETTE} />
    </svg>
  );
}

// ----------------------- Line (multi-series) -----------------------
function LineChart({ spec }: { spec: BaseSpec & { type: 'line' } }) {
  const data = spec.data ?? [];
  const max = niceMax(Math.max(...data.flatMap((d) => spec.series.map((s) => Number(d[s.key] ?? 0)))));
  const bandW = PW / Math.max(data.length, 1);
  const xAt = (i: number) => M.left + bandW * (i + 0.5);
  const yAt = (v: number) => M.top + PH - (v / max) * PH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={spec.title}>
      <YAxis max={max} label={spec.yLabel} />
      <XAxis labels={data.map((d) => String(d[spec.xKey]))} />
      {spec.series.map((s, j) => {
        const color = PALETTE[j % PALETTE.length];
        const points = data.map((d, i) => `${xAt(i)},${yAt(Number(d[s.key] ?? 0))}`).join(' ');
        return (
          <g key={s.key}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
            {data.map((d, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(Number(d[s.key] ?? 0))} r="3.5" fill={color} />
            ))}
          </g>
        );
      })}
      <Legend series={spec.series} palette={PALETTE} />
    </svg>
  );
}

// ----------------------- Pie -----------------------
function PieChart({ spec }: { spec: BaseSpec & { type: 'pie' } }) {
  const data = spec.data ?? [];
  const sKey = spec.series[0]?.key;
  const total = data.reduce((s, d) => s + Number(d[sKey] ?? 0), 0);
  const cx = W / 2, cy = H / 2 - 8, R = 130;
  const arcGen = d3arc<{ start: number; end: number }>()
    .innerRadius(0)
    .outerRadius(R)
    .startAngle((d) => d.start)
    .endAngle((d) => d.end);

  let cursor = 0;
  const slices = data.map((d, i) => {
    const v = Number(d[sKey] ?? 0);
    const angle = (v / total) * 2 * Math.PI;
    const start = cursor;
    const end = cursor + angle;
    cursor = end;
    return { d, i, v, start, end, label: String(d[spec.xKey]) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={spec.title}>
      <g transform={`translate(${cx}, ${cy})`}>
        {slices.map(({ i, start, end, label, v }) => {
          const path = arcGen({ start, end })!;
          const mid = (start + end) / 2;
          const lx = Math.sin(mid) * (R + 18);
          const ly = -Math.cos(mid) * (R + 18);
          return (
            <g key={i}>
              <path d={path} fill={PALETTE[i % PALETTE.length]} stroke="white" strokeWidth="1.5" />
              <text x={lx} y={ly} textAnchor={lx > 0 ? 'start' : 'end'} fontSize="11" fill="#1e293b">
                {label} ({v})
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ----------------------- Venn (2-set or 3-set) -----------------------
function VennDiagram({ spec }: { spec: VennSpec }) {
  const sets = spec.sets;
  const cx = W / 2, cy = H / 2 - 10, R = 90;

  // Find region values from intersections
  const findVal = (names: string[]): number => {
    const target = [...names].sort().join('|');
    const hit = spec.intersections.find((i) => [...i.sets].sort().join('|') === target);
    return hit?.value ?? 0;
  };

  const colorFor = (i: number) => sets[i]?.color ?? PALETTE[i % PALETTE.length];

  if (sets.length === 2) {
    const [A, B] = sets;
    const aOnly = findVal([A.label]) - findVal([A.label, B.label]);
    const bOnly = findVal([B.label]) - findVal([A.label, B.label]);
    const both = findVal([A.label, B.label]);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={spec.title}>
        <circle cx={cx - R * 0.55} cy={cy} r={R} fill={colorFor(0)} fillOpacity="0.35" stroke={colorFor(0)} strokeWidth="2" />
        <circle cx={cx + R * 0.55} cy={cy} r={R} fill={colorFor(1)} fillOpacity="0.35" stroke={colorFor(1)} strokeWidth="2" />
        <text x={cx - R * 0.55 - 30} y={cy - R - 8} fontSize="13" fontWeight="bold" fill="#1e293b" textAnchor="middle">{A.label}</text>
        <text x={cx + R * 0.55 + 30} y={cy - R - 8} fontSize="13" fontWeight="bold" fill="#1e293b" textAnchor="middle">{B.label}</text>
        <text x={cx - R * 0.85} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{aOnly}</text>
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{both}</text>
        <text x={cx + R * 0.85} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{bOnly}</text>
      </svg>
    );
  }

  if (sets.length === 3) {
    const [A, B, C] = sets;
    // Equilateral-triangle layout. Side length = 1.4r → circumradius = 0.808r.
    // Wider than the standard ~r so the 7 region label positions below land
    // unambiguously in their intended region.
    const r = 80;
    const d = (r * 1.4) / Math.sqrt(3); // ≈ 0.808r
    const aC = { x: cx, y: cy - d };
    const bC = { x: cx - d * Math.cos(Math.PI / 6), y: cy + d * Math.sin(Math.PI / 6) };
    const cC = { x: cx + d * Math.cos(Math.PI / 6), y: cy + d * Math.sin(Math.PI / 6) };
    // Inclusion-exclusion: |X|/|X∩Y| from intersections[] are TOTALS, so
    // exclusive-only counts have to be computed.
    const ab = findVal([A.label, B.label]);
    const ac = findVal([A.label, C.label]);
    const bc = findVal([B.label, C.label]);
    const abc = findVal([A.label, B.label, C.label]);
    const aOnly = findVal([A.label]) - ab - ac + abc;
    const bOnly = findVal([B.label]) - ab - bc + abc;
    const cOnly = findVal([C.label]) - ac - bc + abc;
    const abOnly = ab - abc;
    const acOnly = ac - abc;
    const bcOnly = bc - abc;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={spec.title}>
        <circle cx={aC.x} cy={aC.y} r={r} fill={colorFor(0)} fillOpacity="0.3" stroke={colorFor(0)} strokeWidth="2" />
        <circle cx={bC.x} cy={bC.y} r={r} fill={colorFor(1)} fillOpacity="0.3" stroke={colorFor(1)} strokeWidth="2" />
        <circle cx={cC.x} cy={cC.y} r={r} fill={colorFor(2)} fillOpacity="0.3" stroke={colorFor(2)} strokeWidth="2" />
        {/* Set name labels — outside their circles */}
        <text x={aC.x} y={aC.y - r - 6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{A.label}</text>
        <text x={bC.x - r * 0.5} y={bC.y + r + 18} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{B.label}</text>
        <text x={cC.x + r * 0.5} y={cC.y + r + 18} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{C.label}</text>
        {/* 7 region values — positions per the standard 3-set Venn layout */}
        <text x={cx}            y={cy - r * 0.55} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{aOnly}</text>
        <text x={cx - r * 0.7}  y={cy + r * 0.45} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{bOnly}</text>
        <text x={cx + r * 0.7}  y={cy + r * 0.45} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{cOnly}</text>
        <text x={cx - r * 0.42} y={cy - r * 0.05} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{abOnly}</text>
        <text x={cx + r * 0.42} y={cy - r * 0.05} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{acOnly}</text>
        <text x={cx}            y={cy + r * 0.5}  textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{bcOnly}</text>
        <text x={cx}            y={cy + r * 0.15} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{abc}</text>
      </svg>
    );
  }

  return <pre className="text-[11px]">{JSON.stringify(spec, null, 2)}</pre>;
}
