import { theme } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { pct, t, tl, tl0 } from '../i18n';

export type ChartPoint = { x: number; margin: number; profit: number };
export type ChartSeries = { id: string; name: string; slot: number; dashed?: boolean; points: ChartPoint[] };
export type ChartBand = { from: number; to: number; label: string };

const H = 280;
const PAD = { top: 20, right: 104, bottom: 32, left: 56 };

function ticks(min: number, max: number) {
  const span = max - min || 0.1;
  const raw = span / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  const top = Math.ceil(max / step - 1e-9) * step;
  for (let v = Math.floor(min / step) * step; v <= top + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Margin % by order quantity, one line per series, with a crosshair readout. */
export function MarginChart({ series, metric = 'margin', bands = [] }: { series: ChartSeries[]; metric?: 'margin' | 'profit'; bands?: ChartBand[] }) {
  const val = (p: ChartPoint) => (metric === 'margin' ? p.margin : p.profit);
  const fmt = (v: number) => (metric === 'margin' ? pct(v) : tl0(v));
  const { token } = theme.useToken();
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  if (!xs.length) return null;
  const ys = series.flatMap((s) => s.points.map(val));
  const yt = ticks(Math.min(0, ...ys), Math.max(...ys, metric === 'margin' ? 0.05 : 10));
  const y0 = yt[0], y1 = yt[yt.length - 1];
  const iw = w - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + (xs.length === 1 ? iw / 2 : ((x - xs[0]) / (xs[xs.length - 1] - xs[0])) * iw);
  const sy = (y: number) => PAD.top + (1 - (y - y0) / (y1 - y0 || 1)) * ih;
  const every = Math.ceil(xs.length / Math.max(2, Math.floor(iw / 36)));

  // end labels, nudged apart so they never overlap
  const ends = series.map((s) => ({ s, y: sy(val(s.points[s.points.length - 1] ?? { x: 0, margin: 0, profit: 0 })) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    let best = xs[0];
    for (const x of xs) if (Math.abs(sx(x) - px) < Math.abs(sx(best) - px)) best = x;
    setHover(best);
  };
  const hx = hover !== null ? sx(hover) : 0;

  return (
    <div ref={ref} className="viz-root" style={{ position: 'relative' }}>
      <div className="viz-legend">
        {series.map((s) => (
          <span key={s.id}><svg width="18" height="8" aria-hidden="true"><line x1="1" y1="4" x2="17" y2="4" stroke={`var(--series-${s.slot})`} strokeWidth="2" strokeDasharray={s.dashed ? '4 3' : undefined} strokeLinecap="round" /></svg>{s.name}</span>
        ))}
      </div>
      <svg width={w} height={H} role="img" aria-label={metric === 'margin' ? t('Margin by quantity') : t('Profit')} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
        {bands.map((b, i) => {
          const half = xs.length > 1 ? (sx(xs[1]) - sx(xs[0])) / 2 : iw / 2;
          const x1 = Math.max(PAD.left, sx(b.from) - half), x2 = Math.min(w - PAD.right, sx(b.to) + half);
          return (
            <g key={i}>
              {i % 2 === 0 && <rect x={x1} y={PAD.top} width={Math.max(0, x2 - x1)} height={ih} fill={token.colorFillQuaternary} />}
              <text x={(x1 + x2) / 2} y={PAD.top + 12} textAnchor="middle" fontSize="11" fill={token.colorTextTertiary}>{b.label}</text>
            </g>
          );
        })}
        {yt.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={w - PAD.right} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? token.colorTextTertiary : token.colorBorderSecondary} strokeWidth={1} />
            <text x={PAD.left - 8} y={sy(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={token.colorTextSecondary}>{fmt(v)}</text>
          </g>
        ))}
        {xs.map((x, i) => (i % every === 0 || x === xs[xs.length - 1]) && (
          <text key={x} x={sx(x)} y={H - PAD.bottom + 18} textAnchor="middle" fontSize="11" fill={token.colorTextSecondary}>{x}</text>
        ))}
        <text x={w - PAD.right} y={H - 4} textAnchor="end" fontSize="11" fill={token.colorTextTertiary}>{t('pcs')}</text>
        {hover !== null && <line x1={hx} x2={hx} y1={PAD.top} y2={H - PAD.bottom} stroke={token.colorTextTertiary} strokeWidth={1} />}
        {series.map((s) => (
          <g key={s.id}>
            <polyline fill="none" stroke={`var(--series-${s.slot})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined}
              points={s.points.map((p) => `${sx(p.x)},${sy(val(p))}`).join(' ')} />
            {hover !== null && s.points.filter((p) => p.x === hover).map((p) => (
              <circle key={p.x} cx={sx(p.x)} cy={sy(val(p))} r={4} fill={`var(--series-${s.slot})`} stroke={token.colorBgContainer} strokeWidth={2} />
            ))}
          </g>
        ))}
        {ends.map(({ s, y }) => (
          <text key={s.id} x={w - PAD.right + 8} y={y} dy="0.32em" fontSize="12" fill={token.colorText}>
            {s.dashed ? '' : `${s.name.length > 10 ? `${s.name.slice(0, 9)}…` : s.name} `}{fmt(val(s.points[s.points.length - 1] ?? { x: 0, margin: 0, profit: 0 }))}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div className="viz-tip" style={{ left: Math.min(hx + 12, w - 200), top: PAD.top, background: token.colorBgElevated, boxShadow: token.boxShadowSecondary, color: token.colorText }}>
          <div className="viz-tip-head">{hover} {t('pcs')}</div>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === hover);
            if (!p) return null;
            return (
              <div key={s.id} className="viz-tip-row">
                <svg width="14" height="6" aria-hidden="true"><line x1="1" y1="3" x2="13" y2="3" stroke={`var(--series-${s.slot})`} strokeWidth="2" strokeDasharray={s.dashed ? '3 2' : undefined} /></svg>
                <b>{pct(p.margin)}</b><span style={{ color: token.colorTextSecondary }}>{tl(p.profit)} TL · {s.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
