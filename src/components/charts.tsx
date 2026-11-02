// EXAMFORGE — hand-built SVG charts (no chart dependency).

import type { DayPoint } from '../engine/analytics';

const LAV = '#b3a6d6';
const EM = '#5fb08a';
const GRID = '#35332c';
const INK3 = '#9c968c';

export function BarSeries({
  data,
  height = 150,
  tone = LAV,
}: {
  data: { label: string; value: number; hint?: string }[];
  height?: number;
  tone?: string;
}) {
  const max = Math.max(100, ...data.map((d) => d.value));
  const bw = 100 / Math.max(data.length, 1);
  return (
    <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      {[0, 25, 50, 75, 100].map((p) => (
        <line key={p} x1="0" x2="100" y1={height - (p / 100) * (height - 24) - 18} y2={height - (p / 100) * (height - 24) - 18} stroke={GRID} strokeWidth="0.3" />
      ))}
      {data.map((d, i) => {
        const h = (Math.max(0, Math.min(100, d.value)) / max) * (height - 24);
        return (
          <g key={d.label}>
            <rect
              x={i * bw + bw * 0.22}
              y={height - 18 - h}
              width={bw * 0.56}
              height={h}
              rx="1.6"
              fill={tone}
              opacity={0.92}
            >
              <title>{`${d.label}: ${Math.round(d.value)}%${d.hint ? ` · ${d.hint}` : ''}`}</title>
            </rect>
            <text x={i * bw + bw / 2} y={height - 5} fontSize="3.4" fill={INK3} textAnchor="middle">
              {d.label.length > 9 ? `${d.label.slice(0, 8)}…` : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  series,
  height = 160,
  yMax = 100,
  labelEvery = 1,
}: {
  series: { label: string; points: { x: string; y: number }[]; tone?: string }[];
  height?: number;
  yMax?: number;
  labelEvery?: number;
}) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return <div className="empty">No data recorded yet.</div>;
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const w = 100;
  const pad = 6;
  const xAt = (i: number) => pad + (i / Math.max(n - 1, 1)) * (w - pad * 2);
  const yAt = (v: number) => height - 20 - (Math.max(0, Math.min(yMax, v)) / yMax) * (height - 32);

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      {[0, 50, 100].map((p) => (
        <g key={p}>
          <line x1="0" x2={w} y1={yAt((p / 100) * yMax)} y2={yAt((p / 100) * yMax)} stroke={GRID} strokeWidth="0.3" />
          <text x="1" y={yAt((p / 100) * yMax) - 1.5} fontSize="3.2" fill={INK3}>
            {Math.round((p / 100) * yMax)}
          </text>
        </g>
      ))}
      {series.map((s, si) => {
        const tone = s.tone ?? (si === 0 ? LAV : EM);
        const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(p.y)}`).join(' ');
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={tone} strokeWidth="0.9" strokeLinejoin="round" />
            {s.points.map((p, i) => (
              <circle key={`${s.label}-${p.x}-${i}`} cx={xAt(i)} cy={yAt(p.y)} r="1.1" fill={tone}>
                <title>{`${s.label} ${p.x}: ${Math.round(p.y)}%`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {series[0]?.points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text key={p.x + i} x={xAt(i)} y={height - 5} fontSize="3.1" fill={INK3} textAnchor="middle">
            {p.x.slice(5)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export function WeekBars({ week, target }: { week: DayPoint[]; target: number }) {
  const max = Math.max(target * 1.4, ...week.map((d) => d.minutes), 60);
  const H = 132;
  const bw = 100 / Math.max(week.length, 1);
  return (
    <svg viewBox={`0 0 100 ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img">
      <line
        x1="0"
        x2="100"
        y1={H - 18 - (target / max) * (H - 26)}
        y2={H - 18 - (target / max) * (H - 26)}
        stroke={EM}
        strokeDasharray="1.5 1.5"
        strokeWidth="0.4"
      />
      {week.map((d, i) => {
        const h = (d.minutes / max) * (H - 26);
        return (
          <g key={d.date}>
            <rect x={i * bw + bw * 0.24} y={H - 18 - h} width={bw * 0.52} height={Math.max(h, 0.6)} rx="1.4" fill={d.minutes >= target ? EM : LAV} opacity="0.9">
              <title>{`${d.label}: ${d.minutes} min`}</title>
            </rect>
            <text x={i * bw + bw / 2} y={H - 5} fontSize="3.4" fill={INK3} textAnchor="middle">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function heatColor(pct: number): string {
  if (pct <= 0) return '#24231e';
  if (pct < 25) return '#3a3145';
  if (pct < 50) return '#5b4d75';
  if (pct < 75) return '#7f6fa4';
  if (pct < 100) return '#9f92c8';
  return '#6fd7a4';
}

export function Heatmap({
  rows,
}: {
  rows: { subjectId: string; subject: string; units: { unitId: string; name: string; percent: number }[] }[];
}) {
  const maxCols = Math.max(...rows.map((r) => r.units.length), 1);
  return (
    <div>
      {rows.map((r) => (
        <div key={r.subjectId} className="heat-row" style={{ gridTemplateColumns: `96px repeat(${maxCols}, 1fr)` }}>
          <span className="small muted">{r.subject}</span>
          {r.units.map((u) => (
            <div
              key={u.unitId}
              className="heat-cell"
              style={{ background: heatColor(u.percent) }}
              title={`${r.subject} · ${u.name}: ${Math.round(u.percent)}% mastered`}
            />
          ))}
          {Array.from({ length: maxCols - r.units.length }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
        </div>
      ))}
      <div className="chart-legend" style={{ marginTop: 10 }}>
        <span><i style={{ background: '#24231e' }} />0%</span>
        <span><i style={{ background: '#5b4d75' }} />25–50%</span>
        <span><i style={{ background: '#9f92c8' }} />75%</span>
        <span><i style={{ background: '#6fd7a4' }} />100% mastered</span>
      </div>
    </div>
  );
}

export function Donut({
  slices,
  size = 132,
  center,
}: {
  slices: { label: string; value: number; tone: string }[];
  size?: number;
  center?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox="0 0 132 132" role="img" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="#221f1a" strokeWidth="14" />
        {slices.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx="66"
              cy="66"
              r={r}
              fill="none"
              stroke={s.tone}
              strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="col" style={{ gap: 6 }}>
        {center && <span className="stat-label">{center}</span>}
        {slices.map((s) => (
          <span key={s.label} className="small muted">
            <i style={{ width: 8, height: 8, borderRadius: 2, background: s.tone, display: 'inline-block', marginRight: 6 }} />
            {s.label}: <b style={{ color: '#f4f0e8' }}>{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
