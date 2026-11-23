'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { AlertTriangle, Activity, ArrowLeft, Eye, FlaskConical, Info, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { SignalChart } from '../components/signals/SignalChart';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const DISCLAIMER = 'Educational/technical signals only. Not investment advice. Do your own research.';
const inr = (n: number | null | undefined) => (n == null ? '–' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const LABEL_STYLE: Record<string, string> = {
  STRONG_BUY: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', BUY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  WATCH: 'bg-sky-500/10 text-sky-300 border-sky-500/30', HOLD: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  REDUCE: 'bg-amber-500/10 text-amber-300 border-amber-500/30', SELL: 'bg-rose-500/15 text-rose-300 border-rose-500/40', AVOID: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};
const Badge: React.FC<{ label: string; text?: string }> = ({ label, text }) => (
  <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold whitespace-nowrap ${LABEL_STYLE[label] || LABEL_STYLE.HOLD}`}>{text || label.replace('_', ' ')}</span>
);
const ago = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never');

const Disclaimer: React.FC = () => (
  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl px-4 py-2.5 text-xs">
    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><p><span className="font-bold">{DISCLAIMER}</span> Signals are produced by fixed rules on past prices and can be wrong. This screen never places orders.</p>
  </div>
);

const Levels: React.FC<{ l: any; size?: any }> = ({ l, size }) => l ? (
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
    {[['Entry zone', `${inr(l.entryLow)} – ${inr(l.entryHigh)}`, 'text-emerald-300'], ['Stop', inr(l.stop), 'text-rose-300'], ['Target 1', inr(l.target1), 'text-violet-300'], ['Target 2', inr(l.target2), 'text-violet-300'], ['Risk : reward', l.riskReward ? `1 : ${l.riskReward}` : '–', 'text-slate-200']].map(([k, v, c]) => (
      <div key={k as string} className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">{k}</p><p className={`font-semibold ${c}`}>{v}</p></div>
    ))}
    {size && <div className="col-span-2 sm:col-span-5 text-slate-400">Illustrative size: {size.quantity} shares (about {inr(size.capitalRequired)}), risking {inr(size.riskAmount)}.{size.cappedByConcentration ? ' Capped by the position-size limit.' : ''}</div>}
    {l.extended && <div className="col-span-2 sm:col-span-5 text-amber-300">Price is extended above its 20-day average. The entry zone waits for a pullback instead of chasing.</div>}
  </div>
) : null;

type Tab = 'top' | 'all' | 'holdings' | 'watchlist' | 'backtest' | 'history' | 'settings';

function SignalsPage() {
  const router = useRouter();
  const { currentHousehold } = useAuth();
  const canEdit = currentHousehold?.role === 'OWNER' || currentHousehold?.role === 'ADMIN';
  const [tab, setTab] = useState<Tab>('top');
  const [status, setStatus] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [holdings, setHoldings] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [openBt, setOpenBt] = useState<any>(null);
  const poll = useRef<any>(null);

  const loadAll = useCallback(async () => {
    const [s, t, h] = await Promise.all([api.getSignalsStatus(), api.getTopBuys(10), api.getHoldingSignals()]);
    if (s.success) setStatus(s.data);
    if (t.success) setTop(t.data); else setError(t.error?.message || '');
    if (h.success) setHoldings(h.data);
    return s.success ? s.data : null;
  }, []);

  useEffect(() => { loadAll(); return () => clearInterval(poll.current); }, [loadAll]);
  useEffect(() => { if (typeof router.query.symbol === 'string') openDetail(router.query.symbol); /* eslint-disable-next-line */ }, [router.query.symbol]);

  const runNow = async () => {
    setError('');
    const r = await api.runSignals();
    if (!r.success) return setError(r.error?.message || 'Could not start the update.');
    setStatus((s: any) => ({ ...s, running: true }));
    clearInterval(poll.current);
    poll.current = setInterval(async () => { const s = await loadAll(); if (s && !s.running) clearInterval(poll.current); }, 8000);
  };

  const openDetail = async (symbol: string) => {
    setDetailLoading(true); setError('');
    const r = await api.getSignalDetail(symbol);
    setDetailLoading(false);
    if (!r.success) return setError(r.error?.message || 'Could not load this symbol.');
    setDetail(r.data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (detail) return <Detail d={detail} onBack={() => setDetail(null)} />;

  const stale = status?.lastRun && (Date.now() - new Date(status.lastRun.updatedAt).getTime()) > 4 * 86_400_000;
  const tabs: Array<[Tab, string]> = [['top', 'Top buys'], ['all', 'All signals'], ['holdings', 'My holdings'], ['watchlist', 'Watchlist'], ['backtest', 'Backtest'], ['history', 'History'], ['settings', 'Settings']];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-400" /> Stock Signals</h1>
            <p className="text-xs text-slate-400 mt-1">{status?.lastRun ? `Based on closing prices of ${status.lastRun.asOfDate} · updated ${ago(status.lastRun.updatedAt)}` : 'No signals generated yet'}</p>
          </div>
          {canEdit && (
            <button onClick={runNow} disabled={status?.running || !status?.angelOneConfigured} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${status?.running ? 'animate-spin' : ''}`} />{status?.running ? 'Updating…' : 'Update now'}
            </button>
          )}
        </div>
        <Disclaimer />
        {status && !status.angelOneConfigured && <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">Angel One is not configured on the server, so no new data can be fetched. See Integrations.</p>}
        {stale && <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">These signals are more than 4 days old. The daily job may not be running.</p>}
        {status?.running && <p className="text-sm text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-xl px-4 py-2.5">Fetching price history. This takes a few minutes because Angel One limits how fast candles can be requested.</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${tab === id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'}`}>{label}</button>)}
        </div>
        {detailLoading && <p className="text-sm text-slate-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading…</p>}

        {tab === 'top' && <TopBuys data={top} onOpen={openDetail} />}
        {tab === 'all' && <AllSignals onOpen={openDetail} />}
        {tab === 'holdings' && <Holdings data={holdings} onOpen={openDetail} />}
        {tab === 'watchlist' && <Watchlist canEdit={canEdit} onOpen={openDetail} onChanged={loadAll} />}
        {tab === 'backtest' && <Backtest canEdit={canEdit} preset={openBt} />}
        {tab === 'history' && <HistoryTab onOpenBacktest={(b) => { setOpenBt(b); setTab('backtest'); }} />}
        {tab === 'settings' && <SettingsPanel canEdit={canEdit} onSaved={loadAll} />}
        <p className="text-[11px] text-slate-500 text-center pt-2">{DISCLAIMER}</p>
      </div>
    </AppLayout>
  );
}

const TopBuys: React.FC<{ data: any; onOpen: (s: string) => void }> = ({ data, onOpen }) => {
  if (!data) return <p className="text-slate-500 text-sm">Loading…</p>;
  if (data.items.length === 0) return <p className="text-slate-400 text-sm bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">{data.note || 'No stock currently passes all the buy rules and the minimum risk-reward. That is a normal result on many days.'}</p>;
  return (
    <div className="space-y-3">
      {data.items.map((it: any, i: number) => (
        <div key={it.symbol} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3"><span className="text-slate-500 text-sm w-5">{i + 1}</span><div><p className="text-white font-bold">{it.symbol}</p><p className="text-xs text-slate-400">Close {inr(it.price)} · RSI {it.rsi ?? '–'}</p></div></div>
            <div className="flex items-center gap-2"><span className="text-xs text-slate-400">score {it.score} · confidence {Math.round((it.confidence || 0) * 100)}%</span><Badge label={it.label} text={it.labelText} /></div>
          </div>
          <Levels l={it.levels} size={it.suggestedSize} />
          <ul className="text-xs text-slate-300 list-disc pl-5 space-y-0.5">{it.reasons.slice(0, 5).map((r: string, k: number) => <li key={k}>{r}</li>)}</ul>
          {it.warnings?.length > 0 && <p className="text-xs text-amber-300">⚠ {it.warnings.join(' · ')}</p>}
          <button onClick={() => onOpen(it.symbol)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">View chart and indicators →</button>
        </div>
      ))}
      {(data.excluded?.illiquid > 0 || data.excluded?.lowRiskReward > 0) && <p className="text-xs text-slate-500 flex gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5" />Left out: {data.excluded.illiquid} too thinly traded, {data.excluded.lowRiskReward} with a risk-reward below the minimum.</p>}
      {data.dataIssues?.length > 0 && <details className="text-xs text-slate-400"><summary className="cursor-pointer">Data warnings ({data.dataIssues.length})</summary><ul className="mt-1 space-y-0.5">{data.dataIssues.map((d: any, i: number) => <li key={i}>{d.symbol}: {d.message}</li>)}</ul></details>}
    </div>
  );
};

const Holdings: React.FC<{ data: any; onOpen: (s: string) => void }> = ({ data, onOpen }) => {
  if (!data) return <p className="text-slate-500 text-sm">Loading…</p>;
  if (data.items.length === 0) return <p className="text-slate-400 text-sm bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">No stock or ETF holdings found. Add trades or sync from Angel One in Portfolio.</p>;
  return (
    <div className="space-y-3">
      {data.items.map((h: any) => (
        <div key={h.symbol} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-white font-bold">{h.symbol}</p><p className="text-xs text-slate-400">{h.quantity} @ avg {inr(h.averageCost)} · now {inr(h.currentPrice)}</p></div>
            {h.signal ? <Badge label={h.signal.label} text={h.signal.labelText} /> : <span className="text-xs text-slate-500">No signal</span>}
          </div>
          {h.signal ? <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">Unrealised P&amp;L</p><p className={`font-semibold ${h.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{inr(h.unrealizedPnl)} ({h.unrealizedPnlPct}%)</p></div>
              <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">Trailing stop</p><p className={`font-semibold ${h.trailingStopHit ? 'text-rose-400' : 'text-slate-200'}`}>{inr(h.trailingStop)}{h.trailingStopHit ? ' (hit)' : ''}</p></div>
              <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">Score</p><p className="font-semibold text-slate-200">{h.signal.score}</p></div>
              <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">Confidence</p><p className="font-semibold text-slate-200">{Math.round(h.signal.confidence * 100)}%</p></div>
            </div>
            <ul className="text-xs text-slate-300 list-disc pl-5 space-y-0.5">{h.signal.reasons.slice(0, 5).map((r: string, k: number) => <li key={k}>{r}</li>)}</ul>
            {h.longTermNotes?.length > 0 && <div className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">{h.longTermNotes.map((n: string, i: number) => <p key={i}>{n}</p>)}</div>}
            <button onClick={() => onOpen(h.symbol)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">View chart and indicators →</button>
          </> : <p className="text-xs text-amber-300">{h.note}</p>}
        </div>
      ))}
      {data.notCovered?.length > 0 && <p className="text-xs text-slate-500">Not covered: {data.notCovered.map((n: any) => n.symbol).join(', ')} (technical signals cover stocks and ETFs only).</p>}
    </div>
  );
};

const SignalHistory: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.getSignalHistory(symbol).then((r) => { if (r.success) setItems(r.data.items); }); }, [symbol]);
  if (items.length < 2) return null;
  const W = 800, H = 90, lo = -100, hi = 100;
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 12);
  const d = items.map((p, i) => `${i ? 'L' : 'M'}${(i / (items.length - 1)) * W},${y(p.score)}`).join(' ');
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
      <p className="text-sm font-semibold text-white">Score history <span className="text-xs text-slate-500 font-normal">({items.length} stored daily runs)</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto"><line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#334155" strokeDasharray="3 3" /><path d={d} fill="none" stroke="#818cf8" strokeWidth="2" /></svg>
      <div className="max-h-40 overflow-y-auto text-xs divide-y divide-slate-800">
        {[...items].reverse().slice(0, 30).map((p) => <div key={p.date} className="flex justify-between py-1.5"><span className="text-slate-400">{p.date}</span><span className="text-slate-300">score {p.score}</span><Badge label={p.label} text={p.labelText} /></div>)}
      </div>
    </div>
  );
};

const Detail: React.FC<{ d: any; onBack: () => void }> = ({ d, onBack }) => (
  <AppLayout>
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Back to signals</button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-bold text-white">{d.symbol}</h1><p className="text-xs text-slate-400">{d.asOfDate ? `As of ${d.asOfDate} close` : ''}{d.held ? ' · you hold this' : ''}</p></div>
        {d.signal && <div className="flex items-center gap-2"><span className="text-xs text-slate-400">score {d.signal.score} · confidence {Math.round(d.signal.confidence * 100)}%</span><Badge label={d.signal.label} text={d.signal.labelText} /></div>}
      </div>
      <Disclaimer />
      {d.dataUnreliable && <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">Data unreliable, so no signal is given: {d.note}{d.dataNotes?.length ? ` (${d.dataNotes.join('; ')})` : ''}</p>}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3"><SignalChart series={d.series} levels={d.levels} /></div>
      {d.signal && <>
        <Levels l={d.levels} size={d.suggestedSize} />
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-white">Why</p>
          <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">{d.signal.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
          {d.signal.warnings?.length > 0 && <p className="text-xs text-amber-300">⚠ {d.signal.warnings.join(' · ')}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Object.entries(d.signal.components || {}).map(([k, v]: any) => <div key={k} className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p><p className={`font-semibold ${v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{Math.round(v)}</p></div>)}
        </div>
        {d.holding && <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 space-y-1">
          <p className="font-semibold text-white">Your position</p>
          <p>{d.holding.quantity} shares at avg {inr(d.holding.averageCost)} · P&amp;L {inr(d.holding.unrealizedPnl)} ({d.holding.unrealizedPnlPct}%) · trailing stop {inr(d.holding.trailingStop)}</p>
          {d.holding.longTermNotes?.map((n: string, i: number) => <p key={i} className="text-sky-300 text-xs">{n}</p>)}
        </div>}
      </>}
      <SignalHistory symbol={d.symbol} />
      {d.dataNotes?.length > 0 && !d.dataUnreliable && <p className="text-xs text-slate-500">Data notes: {d.dataNotes.join('; ')}</p>}
      <p className="text-[11px] text-slate-500 text-center">{DISCLAIMER}</p>
    </div>
  </AppLayout>
);

const Watchlist: React.FC<{ canEdit: boolean; onOpen: (s: string) => void; onChanged: () => void }> = ({ canEdit, onOpen, onChanged }) => {
  const [items, setItems] = useState<any[]>([]);
  const [sym, setSym] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => { const r = await api.getWatchlist(); if (r.success) setItems(r.data.items); }, []);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    setErr(''); if (!sym.trim()) return;
    const r = await api.addToWatchlist(sym.trim());
    if (!r.success) return setErr(r.error?.message || 'Could not add.');
    setSym(''); load(); onChanged();
  };
  return (
    <div className="space-y-3">
      {canEdit && <div className="flex gap-2"><input value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Symbol, e.g. RELIANCE" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" /><button onClick={add} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"><Plus className="w-4 h-4" />Add</button></div>}
      {err && <p className="text-xs text-rose-400">{err}</p>}
      {items.length === 0 ? <p className="text-slate-400 text-sm bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">Your watchlist is empty. Added symbols are scored on the next update.</p> : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          {items.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <button onClick={() => onOpen(w.symbol)} className="flex items-center gap-2 text-left"><Eye className="w-4 h-4 text-slate-500" /><span className="text-white font-semibold text-sm">{w.symbol}</span>{w.label && <Badge label={w.label} />}</button>
              {canEdit && <button onClick={async () => { await api.removeFromWatchlist(w.symbol); load(); onChanged(); }} className="text-slate-500 hover:text-rose-400" aria-label={`Remove ${w.symbol}`}><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ k: string; v: any }> = ({ k, v }) => <div className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500 text-xs">{k}</p><p className="text-white font-semibold text-sm">{v ?? '–'}</p></div>;

const Backtest: React.FC<{ canEdit: boolean; preset?: any }> = ({ canEdit, preset }) => {
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (preset) { api.getBacktestById(preset.id).then((r) => { if (r.success) setRes(r.data); }); return; }
    api.getLatestBacktest().then((r) => { if (r.success && r.data.available) setRes(r.data); });
  }, [preset]);
  const run = async () => {
    setBusy(true); setErr('');
    const r = await api.runSignalBacktest({});
    setBusy(false);
    if (!r.success) return setErr(r.error?.message || 'Backtest failed.');
    setRes(r.data);
  };
  const m = res?.metrics;
  const eq: number[] = (res?.equityCurve || []).map((p: any) => (typeof p === 'number' ? p : p.equity ?? p.value));
  return (
    <div className="space-y-3">
      <div className="bg-violet-500/10 border border-violet-500/30 text-violet-200 rounded-xl px-4 py-2.5 text-xs flex gap-2"><FlaskConical className="w-4 h-4 flex-shrink-0 mt-0.5" /><p><b>Past performance.</b> This replays the same rules over stored history, with brokerage, taxes and slippage included. It shows how the ruleset behaved before, not how it will behave. {DISCLAIMER}</p></div>
      {canEdit && <button onClick={run} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Running…' : 'Run backtest on my universe'}</button>}
      {err && <p className="text-sm text-rose-400">{err}</p>}
      {m ? <>
        <p className="text-xs text-slate-400">{m.startDate} to {m.endDate} · {res.symbols?.length ?? res.symbolsCount} symbols · generated {ago(res.createdAt)}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat k="Trades" v={m.trades} /><Stat k="Win rate" v={`${m.winRatePct}%`} /><Stat k="Average R" v={m.avgR} /><Stat k="Expectancy (R)" v={m.expectancyR} />
          <Stat k="CAGR" v={`${m.cagrPct}%`} /><Stat k="Nifty 50 CAGR" v={m.benchmarkCagrPct == null ? null : `${m.benchmarkCagrPct}%`} /><Stat k="Max drawdown" v={`${m.maxDrawdownPct}%`} /><Stat k="Profit factor" v={m.profitFactor} />
        </div>
        {eq.length > 2 && <EquityLine values={eq} />}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat k="Avg win (R)" v={m.avgWinR} /><Stat k="Avg loss (R)" v={m.avgLossR} /><Stat k="Total return" v={`${m.totalReturnPct}%`} /><Stat k="Time invested" v={`${m.exposurePct}%`} />
          <Stat k="Costs paid" v={inr(m.totalCosts)} /><Stat k="Wins / losses" v={`${m.wins} / ${m.losses}`} /><Stat k="Nifty 50 return" v={m.benchmarkTotalReturnPct == null ? null : `${m.benchmarkTotalReturnPct}%`} /><Stat k="Years" v={m.years} />
        </div>
        {res.symbols?.length > 0 && <p className="text-xs text-slate-500">Symbols: {res.symbols.join(', ')}</p>}
        {res.costs?.costs && <p className="text-xs text-slate-500">Costs modelled: brokerage {(res.costs.costs.brokeragePct * 100).toFixed(3)}% (cap ₹{res.costs.costs.brokerageCapInr}), STT {(res.costs.costs.sttPct * 100).toFixed(2)}%, slippage {(res.costs.costs.slippagePct * 100).toFixed(2)}%.</p>}
        {res.notes?.map((n: string, i: number) => <p key={i} className="text-xs text-amber-300">{n}</p>)}
        {res.issues?.length > 0 && <details className="text-xs text-slate-400"><summary className="cursor-pointer">Skipped symbols ({res.issues.length})</summary><ul className="mt-1">{res.issues.map((x: any, i: number) => <li key={i}>{x.symbol}: {x.message}</li>)}</ul></details>}
        {res.trades?.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 overflow-x-auto">
            <p className="text-xs text-slate-500 mb-2">All trades ({res.tradesTotal ?? res.trades.length}), newest first</p>
            <table className="w-full text-xs text-left"><thead className="text-slate-500"><tr><th className="py-1 pr-3">Symbol</th><th className="pr-3">Entry</th><th className="pr-3">Exit</th><th className="pr-3">Why</th><th className="pr-3 text-right">R</th><th className="text-right">P&amp;L</th></tr></thead>
              <tbody>{[...res.trades].reverse().map((t: any, i: number) => (
                <tr key={i} className="border-t border-slate-800 text-slate-300"><td className="py-1 pr-3 font-semibold">{t.symbol}</td><td className="pr-3">{t.entryDate} @ {t.entryPrice}</td><td className="pr-3">{t.exitDate} @ {t.exitPrice}</td><td className="pr-3">{String(t.reason).replace('_', ' ')}</td><td className={`pr-3 text-right ${t.rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{t.rMultiple}</td><td className={`text-right ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{inr(t.pnl)}</td></tr>
              ))}</tbody></table>
          </div>
        )}
      </> : !busy && <p className="text-sm text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">No backtest yet. Run the signals update first so price history is stored, then run a backtest.</p>}
    </div>
  );
};

const AllSignals: React.FC<{ onOpen: (s: string) => void }> = ({ onOpen }) => {
  const [data, setData] = useState<any>(null);
  const [label, setLabel] = useState('');
  useEffect(() => { api.getAllSignals(label || undefined).then((r) => { if (r.success) setData(r.data); }); }, [label]);
  if (!data) return <p className="text-slate-500 text-sm">Loading…</p>;
  const labels = ['STRONG_BUY', 'BUY', 'WATCH', 'HOLD', 'REDUCE', 'SELL', 'AVOID'];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setLabel('')} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${!label ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>All</button>
        {labels.map((l) => <button key={l} onClick={() => setLabel(l)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${label === l ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{l.replace('_', ' ')} ({data.counts?.[l] ?? 0})</button>)}
      </div>
      {data.items.length === 0 ? <p className="text-slate-400 text-sm bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">No signals{label ? ' with this label' : ''} yet.</p> : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          {data.items.map((it: any) => (
            <button key={it.symbol} onClick={() => onOpen(it.symbol)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40">
              <div><p className="text-white font-semibold text-sm">{it.symbol}</p><p className="text-xs text-slate-500">Close {inr(it.price)} · RSI {it.rsi ?? '–'}{it.liquid === false ? ' · thinly traded' : ''}</p></div>
              <div className="flex items-center gap-3"><span className="text-xs text-slate-400">{it.score}</span><Badge label={it.label} text={it.labelText} /></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const HistoryTab: React.FC<{ onOpenBacktest: (b: any) => void }> = ({ onOpenBacktest }) => {
  const [runs, setRuns] = useState<any[]>([]);
  const [bts, setBts] = useState<any[]>([]);
  useEffect(() => { api.getSignalRuns().then((r) => r.success && setRuns(r.data.items)); api.getBacktestHistory().then((r) => r.success && setBts(r.data.items)); }, []);
  return (
    <div className="space-y-5">
      <div><p className="text-sm font-semibold text-white mb-2">Daily runs</p>
        {runs.length === 0 ? <p className="text-xs text-slate-500">No runs stored yet.</p> : <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          {runs.map((r) => <details key={r.id} className="px-4 py-2.5 text-xs"><summary className="cursor-pointer flex justify-between gap-2 text-slate-300"><span className="font-semibold">{r.asOfDate}</span><span>{r.scored}/{r.universe} scored · {r.skipped} skipped</span><span className={r.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}>{r.status}</span></summary>
            <p className="text-slate-500 mt-1">{r.trigger} · finished {ago(r.completedAt)}</p>
            {(r.issues || []).map((x: any, i: number) => <p key={i} className="text-slate-400">{x.symbol}: {x.message}</p>)}</details>)}
        </div>}</div>
      <div><p className="text-sm font-semibold text-white mb-2">Saved backtests <span className="text-xs text-slate-500 font-normal">(past performance)</span></p>
        {bts.length === 0 ? <p className="text-xs text-slate-500">No backtests saved yet.</p> : <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          {bts.map((b) => <button key={b.id} onClick={() => onOpenBacktest(b)} className="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-800/40 flex justify-between gap-2 text-slate-300"><span>{ago(b.createdAt)} · {b.symbolsCount} symbols</span><span>{b.metrics.trades} trades · win {b.metrics.winRatePct}% · CAGR {b.metrics.cagrPct}%</span></button>)}
        </div>}</div>
    </div>
  );
};

const EquityLine: React.FC<{ values: number[] }> = ({ values }) => {
  const lo = Math.min(...values), hi = Math.max(...values), W = 800, H = 140;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i / (values.length - 1)) * W},${H - 8 - ((v - lo) / (hi - lo || 1)) * (H - 16)}`).join(' ');
  return <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3"><p className="text-xs text-slate-500 mb-1">Equity curve (past performance)</p><svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto"><path d={d} fill="none" stroke="#818cf8" strokeWidth="2" /></svg></div>;
};

const FIELDS: Array<[string, string, string]> = [
  ['sizing.capital', 'Capital for position sizing (₹)', 'Used only to illustrate share counts.'], ['sizing.riskPct', 'Risk per trade (%)', 'Share of capital lost if the stop is hit.'],
  ['sizing.maxPositionPct', 'Max position size (% of capital)', 'Concentration cap.'], ['trade.minRiskReward', 'Minimum risk : reward', 'Setups below this are not shown.'],
  ['trade.atrStopMultiple', 'Stop distance (× ATR)', ''], ['holdings.trailingAtrMultiple', 'Trailing stop (× ATR)', 'For stocks you hold.'],
  ['universe.minAvgTradedValue', 'Min 20-day avg traded value (₹)', 'Liquidity filter.'], ['universe.minCandles', 'Min daily candles', 'History needed before scoring.'],
];
const getPath = (o: any, p: string) => p.split('.').reduce((a, k) => a?.[k], o);

const SettingsPanel: React.FC<{ canEdit: boolean; onSaved: () => void }> = ({ canEdit, onSaved }) => {
  const [s, setS] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [preset, setPreset] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { api.getSignalSettings().then((r) => { if (r.success) { setS(r.data); setForm(Object.fromEntries(FIELDS.map(([p]) => [p, String(getPath(r.data.config, p))]))); setPreset((r.data.config.universe.presetSymbols || []).join(', ')); } }); }, []);
  if (!s) return <p className="text-slate-500 text-sm">Loading…</p>;
  const save = async (extra: any = {}) => {
    setMsg('');
    const config: any = {};
    for (const [p] of FIELDS) { const [a, b] = p.split('.'); (config[a] ||= {})[b] = Number(form[p]); }
    config.universe.presetSymbols = preset.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
    const r = await api.updateSignalSettings({ config, ...extra });
    if (!r.success) return setMsg(r.error?.message || 'Could not save.');
    setS(r.data); setMsg('Saved.'); onSaved();
  };
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" disabled={!canEdit} checked={s.enabled} onChange={(e) => save({ enabled: e.target.checked })} /> Run the daily update automatically (about 4 PM IST on trading days)</label>
      <div className="grid sm:grid-cols-2 gap-3">
        {FIELDS.map(([p, label, help]) => (
          <label key={p} className="block text-xs text-slate-400">{label}
            <input type="number" step="any" disabled={!canEdit} value={form[p] ?? ''} onChange={(e) => setForm({ ...form, [p]: e.target.value })} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            {help && <span className="text-slate-500">{help}</span>}
          </label>
        ))}
      </div>
      <label className="block text-xs text-slate-400">Preset universe symbols (optional, e.g. index constituents)
        <textarea rows={3} disabled={!canEdit} value={preset} onChange={(e) => setPreset(e.target.value)} placeholder="RELIANCE, TCS, INFY…" className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
        <span className="text-slate-500">Scored together with your holdings and watchlist. Large lists take longer to update because of Angel One rate limits.</span>
      </label>
      {canEdit ? <div className="flex items-center gap-3"><button onClick={() => save()} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold">Save settings</button>{msg && <span className={`text-xs ${msg === 'Saved.' ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</span>}</div> : <p className="text-xs text-slate-500">Only the household owner or an admin can change these settings.</p>}
    </div>
  );
};

export default SignalsPage;
