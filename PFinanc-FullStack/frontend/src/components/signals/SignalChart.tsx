import React, { useMemo, useRef, useState } from 'react';

export interface SeriesPoint {
  date: string; open: number; high: number; low: number; close: number; volume: number;
  sma20: number | null; sma50: number | null; sma200: number | null;
  bbUpper: number | null; bbMiddle: number | null; bbLower: number | null;
  rsi: number | null; macd: number | null; macdSignal: number | null; macdHist: number | null;
}
export interface ChartLevels { entryLow?: number; entryHigh?: number; stop?: number; target1?: number; target2?: number; valid?: boolean }

const W = 800, PAD = { l: 8, r: 58 };
const P_H = 260, R_H = 90, M_H = 100;
const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Price (with SMA 20/50/200, Bollinger Bands, trade levels), RSI and MACD panels sharing one x axis. */
export const SignalChart: React.FC<{ series: SeriesPoint[]; levels?: ChartLevels | null }> = ({ series, levels }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = series.length;

  const g = useMemo(() => {
    if (n < 2) return null;
    const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
    const vals: number[] = [];
    for (const p of series) for (const v of [p.low, p.high, p.bbUpper, p.bbLower, p.sma200]) if (v != null) vals.push(v);
    if (levels?.valid) for (const v of [levels.stop, levels.target1]) if (v) vals.push(v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
    const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (P_H - 16);
    const path = (key: keyof SeriesPoint, yf: (v: number) => number) => {
      let d = ''; let pen = false;
      series.forEach((p, i) => { const v = p[key] as number | null; if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${yf(v).toFixed(1)} `; pen = true; });
      return d;
    };
    const band = (() => {
      const up: string[] = [], dn: string[] = [];
      series.forEach((p, i) => { if (p.bbUpper != null && p.bbLower != null) { up.push(`${x(i).toFixed(1)},${y(p.bbUpper).toFixed(1)}`); dn.unshift(`${x(i).toFixed(1)},${y(p.bbLower).toFixed(1)}`); } });
      return up.length ? `M${up.join(' L')} L${dn.join(' L')} Z` : '';
    })();
    const ry = (v: number) => 6 + (1 - v / 100) * (R_H - 12);
    const mv = series.flatMap((p) => [p.macd, p.macdSignal, p.macdHist]).filter((v): v is number => v != null);
    const mm = Math.max(0.0001, ...mv.map(Math.abs)) * 1.1;
    const my = (v: number) => M_H / 2 - (v / mm) * (M_H / 2 - 6);
    const bw = Math.max(1, ((W - PAD.l - PAD.r) / n) * 0.7);
    return { x, y, ry, my, bw, lo, hi, band, close: path('close', y), sma20: path('sma20', y), sma50: path('sma50', y), sma200: path('sma200', y),
      bbUpper: path('bbUpper', y), bbLower: path('bbLower', y), rsi: path('rsi', ry), macd: path('macd', my), macdSignal: path('macdSignal', my),
      ticks: [0, 0.5, 1].map((f) => ({ v: hi - (hi - lo) * f, y: 8 + f * (P_H - 16) })) };
  }, [series, levels, n]);

  if (!g) return <p className="text-sm text-slate-500 py-8 text-center">Not enough price history to draw a chart.</p>;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1)))));
  };
  const sel = series[hover ?? n - 1];
  const lines = [['sma20', '#38bdf8', 'SMA 20'], ['sma50', '#fbbf24', 'SMA 50'], ['sma200', '#f472b6', 'SMA 200']] as const;

  const levelLine = (v: number | undefined, color: string, label: string) => v ? (
    <g key={label}><line x1={PAD.l} x2={W - PAD.r} y1={g.y(v)} y2={g.y(v)} stroke={color} strokeWidth="1" strokeDasharray="4 4" /><text x={W - PAD.r + 4} y={g.y(v) + 3} fill={color} fontSize="10">{label} {fmt(v)}</text></g>
  ) : null;

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-2 px-1">
        <span className="text-slate-300 font-semibold">{sel.date} · close {fmt(sel.close)}</span>
        {lines.map(([k, c, l]) => <span key={k} style={{ color: c }}>{l} {sel[k] != null ? fmt(sel[k] as number) : '–'}</span>)}
        <span className="text-slate-400">RSI {sel.rsi != null ? sel.rsi.toFixed(1) : '–'}</span>
        <span className="text-slate-400">MACD {sel.macd != null ? sel.macd.toFixed(2) : '–'} / {sel.macdSignal != null ? sel.macdSignal.toFixed(2) : '–'}</span>
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${P_H + R_H + M_H + 24}`} className="w-full h-auto select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Price chart with moving averages, Bollinger Bands, RSI and MACD">
        {/* price panel */}
        {g.ticks.map((t, i) => <g key={i}><line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="#1e293b" /><text x={W - PAD.r + 4} y={t.y + 3} fill="#64748b" fontSize="10">{fmt(t.v)}</text></g>)}
        <path d={g.band} fill="#64748b" fillOpacity="0.10" />
        <path d={g.bbUpper} fill="none" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2 3" />
        <path d={g.bbLower} fill="none" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2 3" />
        {lines.map(([k, c]) => <path key={k} d={g[k]} fill="none" stroke={c} strokeWidth="1.2" />)}
        <path d={g.close} fill="none" stroke="#e2e8f0" strokeWidth="1.8" strokeLinejoin="round" />
        {levels?.valid && <>{levelLine(levels.stop, '#fb7185', 'Stop')}{levelLine(levels.entryLow, '#34d399', 'Entry')}{levelLine(levels.target1, '#a78bfa', 'T1')}{levelLine(levels.target2, '#8b5cf6', 'T2')}</>}

        {/* RSI panel */}
        <g transform={`translate(0 ${P_H + 8})`}>
          <rect x={PAD.l} y={g.ry(70)} width={W - PAD.l - PAD.r} height={g.ry(30) - g.ry(70)} fill="#6366f1" fillOpacity="0.06" />
          {[30, 70].map((v) => <g key={v}><line x1={PAD.l} x2={W - PAD.r} y1={g.ry(v)} y2={g.ry(v)} stroke="#334155" strokeDasharray="3 3" /><text x={W - PAD.r + 4} y={g.ry(v) + 3} fill="#64748b" fontSize="10">{v}</text></g>)}
          <path d={g.rsi} fill="none" stroke="#c084fc" strokeWidth="1.4" />
          <text x={PAD.l + 2} y={10} fill="#94a3b8" fontSize="10">RSI 14</text>
        </g>

        {/* MACD panel */}
        <g transform={`translate(0 ${P_H + R_H + 16})`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={g.my(0)} y2={g.my(0)} stroke="#334155" />
          {series.map((p, i) => p.macdHist == null ? null : <rect key={i} x={g.x(i) - g.bw / 2} width={g.bw} y={Math.min(g.my(0), g.my(p.macdHist))} height={Math.abs(g.my(p.macdHist) - g.my(0))} fill={p.macdHist >= 0 ? '#34d399' : '#fb7185'} fillOpacity="0.55" />)}
          <path d={g.macd} fill="none" stroke="#38bdf8" strokeWidth="1.3" />
          <path d={g.macdSignal} fill="none" stroke="#fbbf24" strokeWidth="1.3" />
          <text x={PAD.l + 2} y={10} fill="#94a3b8" fontSize="10">MACD 12,26,9</text>
        </g>
        {hover != null && <line x1={g.x(hover)} x2={g.x(hover)} y1={0} y2={P_H + R_H + M_H + 16} stroke="#94a3b8" strokeDasharray="3 3" />}
      </svg>
    </div>
  );
};
