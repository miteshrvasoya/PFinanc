import React, { useCallback, useEffect, useState } from 'react';
import { PlugZap, RefreshCw, Download, Search, CheckCircle2, AlertTriangle, Info, TrendingUp, TrendingDown, KeyRound } from 'lucide-react';
import { api } from '../../lib/api';

interface Status {
  configured: boolean;
  available: boolean;
  reason?: string;
  requiredEnv: string[];
  coverage: { stocksAndEtfs: string; mutualFunds: string };
  clientCode?: string;
  autoRefreshPrices?: boolean;
  priceRefreshMinutes?: number;
  instruments?: { count: number; loadedAt: string | null };
  lastSync?: Record<string, { status: string; at: string; summary?: any; error?: string }>;
}
interface PreviewHolding {
  symbol: string; exchange: string; isin: string; quantity: number; averagePrice: number; ltp: number;
  investedValue: number; currentValue: number; pnl: number; pnlPct: number; isNewSecurity: boolean; pfinancQuantity: number;
}
interface Preview { fetchedAt: string; totals: { holdingsCount: number; invested: number; currentValue: number; pnl: number; pnlPct: number }; holdings: PreviewHolding[] }
interface Quote { symbol: string; found: boolean; price?: number; open?: number | null; high?: number | null; low?: number | null; previousClose?: number | null; changePct?: number | null; priceDate?: string }

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const inr2 = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ago = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never');

const Card: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">{title}</h3>{right}</div>
    {children}
  </section>
);

const Btn: React.FC<{ onClick: () => void; busy?: boolean; disabled?: boolean; icon: React.ReactNode; children: React.ReactNode; tone?: 'primary' | 'ghost' }> = ({ onClick, busy, disabled, icon, children, tone = 'primary' }) => (
  <button onClick={onClick} disabled={busy || disabled}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${tone === 'primary' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 border border-slate-700 text-slate-200 hover:border-slate-500'}`}>
    {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : icon}{children}
  </button>
);

export const AngelOnePanel: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [symbols, setSymbols] = useState('');
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  const load = useCallback(async () => {
    const res = await api.getAngelOneStatus();
    if (res.success) setStatus(res.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<any>, onOk: (data: any) => string | void) => {
    setBusy(key);
    setMessage(null);
    const res = await fn();
    setBusy(null);
    if (!res.success) return setMessage({ ok: false, text: res.error?.message || 'Something went wrong.' });
    const text = onOk(res.data);
    if (text) setMessage({ ok: true, text });
    load();
  };

  const test = () => run('test', () => api.testAngelOne(), (d) => `Connected as ${d.name} (${d.clientCode}).`);
  const prices = () => run('prices', () => api.syncAngelOnePrices(), (d) => {
    const src = Object.entries(d.bySource || {}).map(([k, v]) => `${v} from ${k.replace('_', ' ').toLowerCase()}`).join(', ');
    return `Prices refreshed: ${d.updated} of ${d.total} updated${d.stale ? `, ${d.stale} could not be priced` : ''}${src ? ` (${src})` : ''}.`;
  });
  const loadPreview = () => run('preview', () => api.previewAngelOneHoldings(), (d) => { setPreview(d); });
  const sync = () => {
    if (!window.confirm('Import these holdings into PFinanc? They are saved on a separate "Angel One (Demat)" account. Re-running updates them and never duplicates.')) return;
    run('sync', () => api.syncAngelOneHoldings(), (d) => {
      setPreview(null);
      return `Imported ${d.snapshotsSaved} holdings into "${d.account}"${d.securitiesCreated ? `, ${d.securitiesCreated} new securities` : ''}${d.closedPositions ? `, ${d.closedPositions} sold positions closed` : ''}.`;
    });
  };
  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    const list = symbols.split(/[ ,]+/).filter(Boolean);
    if (list.length) run('quotes', () => api.getAngelOneQuotes(list), (d) => { setQuotes(d); });
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  if (!status) return <p className="text-sm text-slate-400">Could not load the integration status.</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="bg-gradient-to-r from-sky-900/30 to-indigo-900/20 border border-sky-500/30 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white flex items-center gap-2"><PlugZap className="w-5 h-5 text-sky-400" /> Angel One</h2>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">Live NSE/BSE prices for your stocks and ETFs, and your demat holdings, straight from Angel One SmartAPI.</p>
        <div className="flex items-start gap-2 mt-3 text-xs text-slate-400"><Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />{status.coverage.mutualFunds}</div>
      </div>

      {message && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm border ${message.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          {message.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}{message.text}
        </div>
      )}

      {!status.available ? (
        <Card title="Set up Angel One">
          <p className="text-sm text-slate-300">{status.reason}</p>
          {!status.configured && (
            <>
              <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-1.5">
                <li>Create an app at <a href="https://smartapi.angelone.in" target="_blank" rel="noreferrer" className="text-indigo-400 underline">smartapi.angelone.in</a> to get an <strong>API key</strong>.</li>
                <li>In your Angel One account enable <strong>TOTP</strong>. Copy the secret text shown beside the QR code.</li>
                <li>Add these to <code className="text-indigo-300">backend/.env</code> on your server, then restart the backend:</li>
              </ol>
              <pre className="bg-slate-950/70 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">{status.requiredEnv.map((k) => `${k}=`).join('\n')}</pre>
              <p className="flex items-start gap-2 text-[11px] text-amber-300"><KeyRound className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />These are secrets. They stay on your server (never in the web or mobile app); keep the file private and never commit it.</p>
            </>
          )}
        </Card>
      ) : (
        <>
          <Card title="Connection" right={<span className="text-[11px] text-slate-500">Client {status.clientCode}</span>}>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={test} busy={busy === 'test'} icon={<PlugZap className="w-4 h-4" />}>Test connection</Btn>
              <Btn onClick={prices} busy={busy === 'prices'} icon={<RefreshCw className="w-4 h-4" />} tone="ghost">Refresh prices now</Btn>
            </div>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>Prices: {status.autoRefreshPrices ? `refreshed automatically every ${status.priceRefreshMinutes} minutes during market hours` : 'manual refresh only'}.</li>
              <li>Last price refresh: {ago(status.lastSync?.prices?.at)}{status.lastSync?.prices?.status === 'FAILED' ? ' (failed)' : ''}. Last holdings import: {ago(status.lastSync?.holdings?.at)}{status.lastSync?.holdings?.status === 'FAILED' ? ' (failed)' : ''}.</li>
              <li>Symbol list: {status.instruments?.count ? `${status.instruments.count.toLocaleString('en-IN')} instruments, updated ${ago(status.instruments.loadedAt || undefined)}` : 'downloads on first use'}.</li>
            </ul>
          </Card>

          <Card title="Your Angel One holdings" right={<Btn onClick={loadPreview} busy={busy === 'preview'} icon={<Download className="w-4 h-4" />} tone="ghost">{preview ? 'Reload' : 'Preview holdings'}</Btn>}>
            {!preview ? (
              <p className="text-xs text-slate-400">Preview reads your demat account from Angel One without saving anything. Then import it into PFinanc in one click.</p>
            ) : preview.holdings.length === 0 ? (
              <p className="text-sm text-slate-400">Angel One reports no holdings on this account.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[['Holdings', String(preview.totals.holdingsCount)], ['Invested', inr(preview.totals.invested)], ['Current value', inr(preview.totals.currentValue)], ['Profit / loss', `${preview.totals.pnl >= 0 ? '+' : '-'}${inr(Math.abs(preview.totals.pnl))} (${preview.totals.pnlPct}%)`]].map(([k, v]) => (
                    <div key={k} className="bg-slate-800/50 rounded-lg px-3 py-2"><p className="text-slate-500">{k}</p><p className="text-white font-semibold mt-0.5">{v}</p></div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-slate-500 text-left"><th className="py-1.5 pr-3 font-medium">Symbol</th><th className="pr-3 font-medium text-right">Qty</th><th className="pr-3 font-medium text-right">Avg cost</th><th className="pr-3 font-medium text-right">Price</th><th className="pr-3 font-medium text-right">Value</th><th className="font-medium text-right">P&amp;L</th></tr></thead>
                    <tbody>
                      {preview.holdings.map((h) => (
                        <tr key={h.isin} className="border-t border-slate-800">
                          <td className="py-2 pr-3 text-slate-200 font-medium">{h.symbol} <span className="text-slate-500 font-normal">{h.exchange}</span>{h.isNewSecurity && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px]">new</span>}</td>
                          <td className="pr-3 text-right text-slate-300">{h.quantity}</td>
                          <td className="pr-3 text-right text-slate-300">{inr2(h.averagePrice)}</td>
                          <td className="pr-3 text-right text-slate-300">{inr2(h.ltp)}</td>
                          <td className="pr-3 text-right text-slate-200">{inr(h.currentValue)}</td>
                          <td className={`text-right font-medium ${h.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{h.pnl >= 0 ? '+' : '-'}{inr(Math.abs(h.pnl))} <span className="opacity-70">({h.pnlPct}%)</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Btn onClick={sync} busy={busy === 'sync'} icon={<Download className="w-4 h-4" />}>Import into PFinanc</Btn>
              </>
            )}
          </Card>

          <Card title="Look up live prices">
            <form onSubmit={lookup} className="flex gap-2">
              <input value={symbols} onChange={(e) => setSymbols(e.target.value)} placeholder="e.g. RELIANCE, TCS, NIFTYBEES" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none" />
              <Btn onClick={() => undefined} busy={busy === 'quotes'} icon={<Search className="w-4 h-4" />}>Look up</Btn>
            </form>
            {quotes && (
              <ul className="divide-y divide-slate-800">
                {quotes.map((q) => (
                  <li key={q.symbol} className="py-2 flex items-center justify-between text-sm">
                    <span className="text-slate-200 font-medium">{q.symbol}</span>
                    {q.found ? (
                      <span className="flex items-center gap-3">
                        <span className="text-white font-semibold">{inr2(q.price!)}</span>
                        {q.changePct != null && <span className={`flex items-center gap-1 text-xs ${q.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{q.changePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{q.changePct}%</span>}
                      </span>
                    ) : <span className="text-xs text-slate-500">not found</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-500">NSE by default. Prices come from Angel One and can be delayed; mutual funds are not covered.</p>
          </Card>
        </>
      )}
    </div>
  );
};
