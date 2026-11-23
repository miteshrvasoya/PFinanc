import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, CalendarDays, Info } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface Point { t: string; o: number | null; h: number | null; l: number | null; c: number; v: number | null }
interface ChartData {
  symbol: string; range: string; interval: string; source: 'ANGEL_ONE' | 'STORED_PRICES'; from: string; to: string;
  points: Point[];
  summary: { start: number; end: number; change: number; changePct: number; high: number; low: number } | null;
  position: { quantity: number; averageCost: number; currentPrice: number; unrealizedPnl: number; unrealizedPnlPct: number } | null;
  buys: Array<{ date: string; quantity: number; price: number }>;
  firstBuyDate: string | null; buyDateSource: 'TRADES' | 'SAVED' | null; sinceBuyAvailable: boolean; notes: string[];
}

const RANGES = [
  { id: '1D', label: '1D' }, { id: '1W', label: '1W' }, { id: '1M', label: '1M' },
  { id: '3M', label: '3M' }, { id: '6M', label: '6M' }, { id: '1Y', label: '1Y' },
  { id: 'SINCE_BUY', label: 'Since I bought' },
];

const W = 800, H = 280, PAD = { l: 8, r: 64, t: 14, b: 26 };
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayFmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' });
const timeFmt = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export const PriceChart: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { viewMode } = useAuth();
  const [range, setRange] = useState('1D'); // one day by default
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [buyDate, setBuyDate] = useState('');
  const [needsBuyDate, setNeedsBuyDate] = useState(false);
  const [knownBuyAvailable, setKnownBuyAvailable] = useState<boolean | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const load = useCallback(async (r: string) => {
    setLoading(true);
    setError(null);
    setNeedsBuyDate(false);
    const res = await api.getPriceChart(symbol, r, viewMode === 'household' ? 'household' : 'personal');
    setLoading(false);
    if (!res.success) {
      if (res.error?.code === 'BUY_DATE_UNKNOWN') { setNeedsBuyDate(true); setKnownBuyAvailable(false); return; }
      setError({ code: res.error?.code, message: res.error?.message || 'Could not load the chart.' });
      return;
    }
    setData(res.data);
    setKnownBuyAvailable(res.data.sinceBuyAvailable);
  }, [symbol, viewMode]);

  useEffect(() => { load(range); setHover(null); }, [load, range]);

  const saveBuyDate = async () => {
    if (!buyDate) return;
    const res = await api.setHoldingBuyDate(symbol, buyDate);
    if (!res.success) return setError({ message: res.error?.message || 'Could not save the date.' });
    setNeedsBuyDate(false);
    load('SINCE_BUY');
  };

  const geom = useMemo(() => {
    if (!data || data.points.length < 2) return null;
    const pts = data.points;
    const ys = pts.map((p) => p.c);
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (hi === lo) { hi += 1; lo -= 1; }
    // Show the average-cost line only when it is near the price range; a far-away line would squash the chart flat.
    const span = hi - lo;
    const rawAvg = data.position?.averageCost;
    const avg = rawAvg && rawAvg >= lo - 0.35 * span && rawAvg <= hi + 0.35 * span ? rawAvg : undefined;
    if (avg) { lo = Math.min(lo, avg); hi = Math.max(hi, avg); }
    const pad = (hi - lo) * 0.08;
    lo -= pad; hi += pad;
    const x = (i: number) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ');
    const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`;
    const markers = data.buys.map((b) => {
      const idx = pts.findIndex((p) => p.t.slice(0, 10) >= b.date);
      return idx >= 0 ? { ...b, cx: x(idx), cy: y(pts[idx].c) } : null;
    }).filter(Boolean) as Array<{ date: string; quantity: number; price: number; cx: number; cy: number }>;
    const ticks = [0, 0.5, 1].map((f) => ({ v: lo + (hi - lo) * (1 - f), y: PAD.t + f * (H - PAD.t - PAD.b) }));
    return { pts, x, y, line, area, markers, ticks, avgY: avg ? y(avg) : null };
  }, [data]);

  const up = (data?.summary?.change ?? 0) >= 0;
  const color = up ? '#34d399' : '#fb7185';
  const intraday = data && data.interval !== 'ONE_DAY';

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!geom || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (geom.pts.length - 1));
    setHover(Math.max(0, Math.min(geom.pts.length - 1, i)));
  };

  const shown = hover != null && geom ? geom.pts[hover] : null;
  const labelFor = (p: Point) => (intraday ? `${dayFmt(p.t)}, ${timeFmt(p.t)}` : dayFmt(p.t));

  return (
    <div className="space-y-3">
      {/* Range filters: 1D is the default, "Since I bought" tracks from your purchase */}
      <div className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button key={r.id} onClick={() => setRange(r.id)} title={r.id === 'SINCE_BUY' ? 'Track the price from the day you bought' : undefined}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${range === r.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'}`}>
            {r.id === 'SINCE_BUY' && <CalendarDays className="w-3 h-3" />}{r.label}
          </button>
        ))}
      </div>

      {needsBuyDate && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-sm text-slate-200 font-medium">When did you buy {symbol}?</p>
          <p className="text-xs text-slate-400">This holding has no trade history (for example it was imported from your broker), so we cannot tell. Enter the date once and PFinanc will chart the price from then on.</p>
          <div className="flex gap-2">
            <input type="date" value={buyDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBuyDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            <button onClick={saveBuyDate} disabled={!buyDate} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50">Show chart</button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error.message}</p>}

      {!needsBuyDate && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          {loading && !data ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm"><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading chart…</div>
          ) : data ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-2 mb-2 px-1">
                <div>
                  <p className="text-xl font-bold text-white">{inr(shown ? shown.c : data.summary?.end ?? 0)}</p>
                  <p className="text-[11px] text-slate-400 min-h-[16px]">{shown ? labelFor(shown) : `${data.from} to ${data.to}`}</p>
                </div>
                {data.summary && (
                  <div className="text-right">
                    <p className={`text-sm font-semibold flex items-center gap-1 justify-end ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {up ? '+' : ''}{inr(data.summary.change)} ({up ? '+' : ''}{data.summary.changePct}%)
                    </p>
                    <p className="text-[11px] text-slate-500">High {inr(data.summary.high)} · Low {inr(data.summary.low)}</p>
                  </div>
                )}
              </div>

              {geom ? (
                <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`${symbol} price chart`}>
                  <defs>
                    <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>
                  </defs>
                  {geom.ticks.map((t, i) => (
                    <g key={i}>
                      <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="#1e293b" strokeWidth="1" />
                      <text x={W - PAD.r + 6} y={t.y + 4} fill="#64748b" fontSize="11">{t.v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</text>
                    </g>
                  ))}
                  <path d={geom.area} fill="url(#pc-fill)" />
                  <path d={geom.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  {geom.avgY != null && data.position && (
                    <g>
                      <line x1={PAD.l} x2={W - PAD.r} y1={geom.avgY} y2={geom.avgY} stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="5 4" />
                      <text x={W - PAD.r + 6} y={geom.avgY + 4} fill="#fbbf24" fontSize="10">avg {data.position.averageCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</text>
                    </g>
                  )}
                  {geom.markers.map((m, i) => (
                    <g key={i}><circle cx={m.cx} cy={m.cy} r="5" fill="#6366f1" stroke="#fff" strokeWidth="1.5"><title>{`Bought ${m.quantity} @ ${inr(m.price)} on ${m.date}`}</title></circle></g>
                  ))}
                  {hover != null && (
                    <g>
                      <line x1={geom.x(hover)} x2={geom.x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx={geom.x(hover)} cy={geom.y(geom.pts[hover].c)} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />
                    </g>
                  )}
                  <text x={PAD.l} y={H - 8} fill="#64748b" fontSize="11">{labelFor(geom.pts[0])}</text>
                  <text x={W - PAD.r} y={H - 8} fill="#64748b" fontSize="11" textAnchor="end">{labelFor(geom.pts[geom.pts.length - 1])}</text>
                </svg>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500 text-sm text-center px-6">
                  {data.points.length === 1 ? 'Only one price point so far.' : 'No price history for this range yet.'}
                </div>
              )}

              {/* Since-bought: what your purchase has done */}
              {data.range === 'SINCE_BUY' && data.position && (
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">Bought</p><p className="text-white font-semibold">{data.firstBuyDate && dayFmt(data.firstBuyDate)}{data.buyDateSource === 'SAVED' ? ' *' : ''}</p></div>
                  <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">Your average cost</p><p className="text-white font-semibold">{inr(data.position.averageCost)}</p></div>
                  <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">Your return</p><p className={`font-semibold ${data.position.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{data.position.unrealizedPnl >= 0 ? '+' : ''}{data.position.unrealizedPnlPct}%</p></div>
                </div>
              )}
              {data.range === 'SINCE_BUY' && data.buyDateSource === 'SAVED' && (
                <button onClick={async () => { await api.clearHoldingBuyDate(symbol); setRange('1D'); setKnownBuyAvailable(false); }} className="mt-2 text-[11px] text-slate-500 hover:text-slate-300 underline">* Buy date entered by you. Remove it</button>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 px-1 text-[10px] text-slate-500">
                <span className={`px-1.5 py-0.5 rounded font-semibold ${data.source === 'ANGEL_ONE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                  {data.source === 'ANGEL_ONE' ? 'Live via Angel One' : 'Stored prices'}
                </span>
                {data.buys.length > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1" />your buys</span>}
                {data.position && geom?.avgY != null && <span><span className="inline-block w-3 border-t border-dashed border-amber-400 mr-1 align-middle" />average cost</span>}
                {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
              {data.notes.map((n, i) => <p key={i} className="flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-300/90"><Info className="w-3 h-3 flex-shrink-0 mt-0.5" />{n}</p>)}
            </>
          ) : null}
        </div>
      )}
      {knownBuyAvailable === false && !needsBuyDate && range !== 'SINCE_BUY' && (
        <p className="text-[11px] text-slate-500">Tip: choose <strong>Since I bought</strong> to track this stock from your purchase date.</p>
      )}
    </div>
  );
};
