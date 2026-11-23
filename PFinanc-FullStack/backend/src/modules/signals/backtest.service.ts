import { QueryHelper } from '../../database/queryHelper.js';
import { runBacktest } from './backtest.js';
import { BENCHMARK, loadCandles, resolveTarget } from './candles.service.js';
import { DEFAULT_SIGNAL_CONFIG, mergeConfig, SignalConfig, validateConfig } from './config.js';
import { httpError, SignalsService } from './signals.service.js';
import { Candle, DISCLAIMER } from './types.js';

const MAX_SYMBOLS = 60;
const PAST_NOTE = 'Past performance of this ruleset on historical data. It does not predict future results.';

const downsample = <T>(arr: T[], max: number): T[] => {
  if (arr.length <= max) return arr;
  const step = (arr.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)]);
};

export interface BacktestParams { symbols?: string[]; from?: string; to?: string; config?: Record<string, any> }

/**
 * Replay the ruleset over the stored candles. Nothing is fetched from Angel One here: run the signals job first so
 * candles exist. Results are saved so the UI can show "historical performance of this ruleset".
 */
export async function runBacktestFor(householdId: string | null, userId: string | null, params: BacktestParams = {}, baseConfig?: SignalConfig) {
  let cfg = baseConfig ?? (householdId ? (await SignalsService.getSettings(householdId)).config : DEFAULT_SIGNAL_CONFIG);
  if (params.config) {
    try { cfg = mergeConfig(cfg, params.config); validateConfig(cfg); } catch (e: any) { throw httpError(400, 'INVALID_CONFIG', e.message); }
  }
  for (const d of [params.from, params.to]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw httpError(400, 'INVALID_DATE', 'Dates must look like 2024-03-15.');

  let symbols = params.symbols?.map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (!symbols?.length && householdId) symbols = (await SignalsService.buildUniverse(householdId, cfg)).map((u) => u.symbol);
  symbols = Array.from(new Set(symbols ?? []));
  if (symbols.length === 0) throw httpError(400, 'NO_SYMBOLS', 'Pass symbols, or add holdings, watchlist items or preset symbols to the universe.');
  const notes: string[] = [];
  if (symbols.length > MAX_SYMBOLS) { notes.push(`Only the first ${MAX_SYMBOLS} symbols were used.`); symbols = symbols.slice(0, MAX_SYMBOLS); }

  const candles = new Map<string, Candle[]>();
  const issues: Array<{ symbol: string; message: string }> = [];
  for (const sym of symbols) {
    const t = await resolveTarget(sym);
    if (!t) { issues.push({ symbol: sym, message: 'Symbol not found in the Angel One instrument list' }); continue; }
    const cs = await loadCandles(t);
    if (cs.length < cfg.universe.minCandles + 30) { issues.push({ symbol: sym, message: `Only ${cs.length} stored candles; the signals job must load more history` }); continue; }
    candles.set(sym, cs);
  }
  if (candles.size === 0) throw httpError(400, 'NO_DATA', 'No usable candle history. Run the signals job first to load candles.');
  const bench = await loadCandles(BENCHMARK);
  if (bench.length === 0) notes.push('Nifty 50 history is missing, so there is no benchmark comparison.');

  const result = runBacktest(candles, bench, cfg, { from: params.from, to: params.to });
  const trades = result.trades;
  const equity = downsample(result.equityCurve, 600);
  const saved = await QueryHelper.queryOne<{ id: string; created_at: string }>(
    `INSERT INTO backtest_runs (household_id, created_by, params, symbols_count, metrics, trades, equity_curve) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
    [householdId, userId, JSON.stringify({ symbols: [...candles.keys()], from: params.from ?? null, to: params.to ?? null, config: params.config ?? null, costs: cfg.backtest, issues, notes }), candles.size,
     JSON.stringify(result.metrics), JSON.stringify(trades.slice(-5000)), JSON.stringify(equity)]
  );
  return { id: saved!.id, createdAt: saved!.created_at, symbols: [...candles.keys()], metrics: result.metrics, trades: trades.slice(-5000), tradesTotal: trades.length, equityCurve: equity, issues, notes, pastPerformanceNote: PAST_NOTE, disclaimer: DISCLAIMER };
}

const shapeRun = (row: any, full: boolean) => ({
  available: true, id: row.id, createdAt: row.created_at, symbolsCount: row.symbols_count,
  symbols: row.params?.symbols ?? [], from: row.params?.from ?? null, to: row.params?.to ?? null,
  costs: row.params?.costs ?? null, issues: row.params?.issues ?? [], notes: row.params?.notes ?? [],
  metrics: row.metrics, ...(full ? { trades: row.trades, tradesTotal: (row.trades as any[]).length, equityCurve: row.equity_curve } : {}),
  pastPerformanceNote: PAST_NOTE, disclaimer: DISCLAIMER,
});

export async function latestBacktest(householdId: string) {
  const row = await QueryHelper.queryOne<any>(`SELECT * FROM backtest_runs WHERE household_id = $1 ORDER BY created_at DESC LIMIT 1`, [householdId]);
  if (!row) return { available: false, pastPerformanceNote: PAST_NOTE, disclaimer: DISCLAIMER };
  return shapeRun(row, true);
}

/** Every saved backtest, newest first, with headline metrics only. */
export async function backtestHistory(householdId: string, limit = 50) {
  const rows = await QueryHelper.query<any>(
    `SELECT id, created_at, params, symbols_count, metrics FROM backtest_runs WHERE household_id = $1 ORDER BY created_at DESC LIMIT $2`, [householdId, Math.min(Math.max(limit, 1), 200)]
  );
  return { items: rows.map((r) => shapeRun({ ...r, trades: [], equity_curve: [] }, false)), pastPerformanceNote: PAST_NOTE, disclaimer: DISCLAIMER };
}

export async function backtestById(householdId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw httpError(404, 'NOT_FOUND', 'Backtest not found.');
  const row = await QueryHelper.queryOne<any>(`SELECT * FROM backtest_runs WHERE household_id = $1 AND id = $2`, [householdId, id]);
  if (!row) throw httpError(404, 'NOT_FOUND', 'Backtest not found.');
  return shapeRun(row, true);
}
