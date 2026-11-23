import { SignalConfig } from './config.js';
import { computeIndicators, IndicatorSet } from './indicators.js';
import { scoreAt } from './scoring.js';
import { computeTradeLevels } from './tradeLevels.js';
import { Candle, SignalLabel, TradeLevels } from './types.js';

/**
 * Replays the scoring and trade-level rules over history, one trading day at a time, using only data that was
 * available on each day (no look-ahead):
 *   - a decision is made on the CLOSE of day d, and filled at the OPEN of day d+1 (with slippage and costs);
 *   - indicators are causal (tests prove it), so scoring bar d never sees later bars;
 *   - when a stop and a target are both inside one day's range, the stop is assumed to fill first (conservative);
 *   - gaps through a stop fill at the open, not at the stop.
 * Pure: candles in, results out. Same input, same output.
 */

export interface DaySignal { label: SignalLabel; levels: TradeLevels | null; avgTradedValue: number | null }
export type SignalProvider = (symbol: string, index: number) => DaySignal | null;

export interface BacktestOptions {
  from?: string;
  to?: string;
  minCandles?: number;
  /** Override the signal source (used by tests to exercise the execution engine with handcrafted signals). */
  signalProvider?: SignalProvider;
}

export type ExitReason = 'STOP' | 'TARGET' | 'SIGNAL_EXIT' | 'TIME' | 'END';

export interface BacktestTrade {
  symbol: string;
  entryDate: string; entryPrice: number;
  exitDate: string; exitPrice: number;       // average exit price over the exit legs
  quantity: number;
  reason: ExitReason;
  grossPnl: number; costs: number; pnl: number;
  rMultiple: number;
  barsHeld: number;
}

export interface BacktestMetrics {
  trades: number; wins: number; losses: number;
  winRatePct: number; avgR: number; expectancyR: number; avgWinR: number; avgLossR: number; profitFactor: number | null;
  totalReturnPct: number; cagrPct: number; maxDrawdownPct: number;
  benchmarkCagrPct: number | null; benchmarkTotalReturnPct: number | null;
  startDate: string; endDate: string; years: number;
  exposurePct: number; totalCosts: number;
}

export interface BacktestResult {
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: Array<{ date: string; equity: number }>;
}

interface Position {
  symbol: string; entryDate: string; entryIndexDay: number;
  entryPrice: number; initialQty: number; qty: number;
  stop: number; t1: number; t2: number; initialRisk: number;
  scaled: boolean;
  proceeds: number; costs: number;          // realised so far (sell legs and all fees, including the buy)
  exitQty: number; exitValue: number;       // for the average exit price
  lastReason: ExitReason;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Costs of one fill: brokerage (capped), STT, exchange charges, stamp duty (buys only) and GST on brokerage + exchange. */
export function tradeCosts(value: number, side: 'BUY' | 'SELL', c: SignalConfig['backtest']['costs']): number {
  const brokerage = Math.min(value * c.brokeragePct, c.brokerageCapInr);
  const exchange = value * c.exchangePct;
  const stt = value * c.sttPct;
  const stamp = side === 'BUY' ? value * c.stampPct : 0;
  const gst = (brokerage + exchange) * c.gstPct;
  return brokerage + exchange + stt + stamp + gst;
}

/** Default signal source: score each bar with the live rules. Cached per symbol. */
export function ruleSignalProvider(candles: Map<string, Candle[]>, bench: Candle[], cfg: SignalConfig): SignalProvider {
  const inds = new Map<string, IndicatorSet>();
  const memo = new Map<string, DaySignal | null>();
  return (symbol, i) => {
    const key = `${symbol}:${i}`;
    if (memo.has(key)) return memo.get(key)!;
    const cs = candles.get(symbol)!;
    if (!inds.has(symbol)) inds.set(symbol, computeIndicators(cs, bench, { swingStrength: cfg.trade.swingStrength, relStrengthLookback: cfg.rules.relStrengthLookback, avgTradedValueDays: cfg.universe.avgTradedValueDays }));
    const { snapshot, result } = scoreAt(cs, inds.get(symbol)!, i, cfg);
    const sig: DaySignal = { label: result.label, levels: result.label === 'STRONG_BUY' || result.label === 'BUY' ? computeTradeLevels(snapshot, cfg) : null, avgTradedValue: snapshot.avgTradedValue20 };
    memo.set(key, sig);
    return sig;
  };
}

export function runBacktest(candlesBySymbol: Map<string, Candle[]>, bench: Candle[], cfg: SignalConfig, opts: BacktestOptions = {}): BacktestResult {
  const bt = cfg.backtest;
  const minCandles = opts.minCandles ?? cfg.universe.minCandles;
  const provider = opts.signalProvider ?? ruleSignalProvider(candlesBySymbol, bench, cfg);

  // Per-symbol index by date, and the sorted union of all trading dates.
  const dateIndex = new Map<string, Map<string, number>>();
  const allDates = new Set<string>();
  for (const [sym, cs] of candlesBySymbol) {
    dateIndex.set(sym, new Map(cs.map((c, i) => [c.date, i])));
    cs.forEach((c) => allDates.add(c.date));
  }
  const dates = Array.from(allDates).sort().filter((d) => (!opts.from || d >= opts.from) && (!opts.to || d <= opts.to));
  const emptyMetrics = (): BacktestResult => ({
    metrics: { trades: 0, wins: 0, losses: 0, winRatePct: 0, avgR: 0, expectancyR: 0, avgWinR: 0, avgLossR: 0, profitFactor: null, totalReturnPct: 0, cagrPct: 0, maxDrawdownPct: 0, benchmarkCagrPct: null, benchmarkTotalReturnPct: null, startDate: dates[0] ?? '', endDate: dates[dates.length - 1] ?? '', years: 0, exposurePct: 0, totalCosts: 0 },
    trades: [], equityCurve: [],
  });
  if (dates.length === 0) return emptyMetrics();

  let cash = bt.initialCapital;
  const open = new Map<string, Position>();
  const closed: BacktestTrade[] = [];
  const curve: Array<{ date: string; equity: number }> = [];
  const lastClose = new Map<string, number>();
  const pendingEntry = new Map<string, TradeLevels>();
  const pendingExit = new Set<string>();
  let exposureDays = 0;

  const sell = (p: Position, qty: number, price: number, date: string, reason: ExitReason) => {
    const fill = price * (1 - bt.costs.slippagePct);
    const value = fill * qty;
    const fees = tradeCosts(value, 'SELL', bt.costs);
    cash += value - fees;
    p.proceeds += value;
    p.costs += fees;
    p.exitQty += qty;
    p.exitValue += value;
    p.qty -= qty;
    p.lastReason = reason;
    if (p.qty <= 0) finish(p, date);
  };
  const finish = (p: Position, date: string) => {
    open.delete(p.symbol);
    const cost = p.entryPrice * p.initialQty;
    const gross = p.proceeds - cost;
    const pnl = gross - p.costs;
    closed.push({
      symbol: p.symbol, entryDate: p.entryDate, entryPrice: round2(p.entryPrice), exitDate: date,
      exitPrice: round2(p.exitQty ? p.exitValue / p.exitQty : 0), quantity: p.initialQty, reason: p.lastReason,
      grossPnl: round2(gross), costs: round2(p.costs), pnl: round2(pnl),
      rMultiple: p.initialRisk > 0 ? round2(pnl / (p.initialRisk * p.initialQty)) : 0,
      barsHeld: Math.max(1, dates.indexOf(date) - p.entryIndexDay),
    });
  };

  dates.forEach((date, dayIdx) => {
    // 1) Fill orders decided on the previous close, at today's open.
    for (const sym of [...pendingExit]) {
      pendingExit.delete(sym);
      const p = open.get(sym);
      const idx = dateIndex.get(sym)!.get(date);
      if (p && idx !== undefined) sell(p, p.qty, candlesBySymbol.get(sym)![idx].open, date, 'SIGNAL_EXIT');
    }
    for (const [sym, lv] of [...pendingEntry]) {
      pendingEntry.delete(sym);
      const idx = dateIndex.get(sym)!.get(date);
      if (idx === undefined || open.has(sym) || open.size >= bt.maxOpenPositions) continue;
      const c = candlesBySymbol.get(sym)![idx];
      const fill = c.open * (1 + bt.costs.slippagePct);
      // Do not chase: skip if the open is already above the suggested zone (plus a small tolerance) or through the stop.
      if (fill > lv.entryHigh * 1.005 || fill <= lv.stop) continue;
      const equity = cash + [...open.values()].reduce((s, p) => s + p.qty * (lastClose.get(p.symbol) ?? p.entryPrice), 0);
      const risk = fill - lv.stop;
      let qty = Math.floor((equity * bt.riskPct) / 100 / risk);
      qty = Math.min(qty, Math.floor((equity * cfg.sizing.maxPositionPct) / 100 / fill));
      // Affordable including costs?
      while (qty > 0 && fill * qty + tradeCosts(fill * qty, 'BUY', bt.costs) > cash) qty--;
      if (qty <= 0) continue;
      const buyCosts = tradeCosts(fill * qty, 'BUY', bt.costs);
      cash -= fill * qty + buyCosts;
      open.set(sym, { symbol: sym, entryDate: date, entryIndexDay: dayIdx, entryPrice: fill, initialQty: qty, qty, stop: lv.stop, t1: lv.target1, t2: lv.target2, initialRisk: risk, scaled: false, proceeds: 0, costs: buyCosts, exitQty: 0, exitValue: 0, lastReason: 'END' });
    }

    // 2) Manage open positions against today's range.
    for (const p of [...open.values()]) {
      if (p.entryDate === date) continue; // filled at the open; judge it from tomorrow so intraday order is not guessed
      const idx = dateIndex.get(p.symbol)!.get(date);
      if (idx === undefined) continue;
      const c = candlesBySymbol.get(p.symbol)![idx];
      if (c.open <= p.stop) { sell(p, p.qty, c.open, date, 'STOP'); continue; }           // gap through the stop
      if (c.low <= p.stop) { sell(p, p.qty, p.stop, date, 'STOP'); continue; }           // stop first when both are in range
      if (!p.scaled && c.high >= p.t1) {
        const part = bt.scaleOutAtTarget1 ? Math.max(1, Math.floor(p.qty / 2)) : 0;
        if (part > 0 && part < p.qty) { sell(p, part, Math.max(p.t1, c.open), date, 'TARGET'); p.stop = Math.max(p.stop, p.entryPrice); }
        p.scaled = true;
      }
      if (open.has(p.symbol) && c.high >= p.t2) { sell(p, p.qty, Math.max(p.t2, c.open), date, 'TARGET'); continue; }
      if (open.has(p.symbol) && dayIdx - p.entryIndexDay >= bt.maxHoldDays) sell(p, p.qty, c.close, date, 'TIME');
    }

    // 3) Mark to market and record the day.
    for (const [sym, cs] of candlesBySymbol) {
      const idx = dateIndex.get(sym)!.get(date);
      if (idx !== undefined) lastClose.set(sym, cs[idx].close);
    }
    const equity = cash + [...open.values()].reduce((s, p) => s + p.qty * (lastClose.get(p.symbol) ?? p.entryPrice), 0);
    curve.push({ date, equity: round2(equity) });
    if (open.size > 0) exposureDays++;

    // 4) Decide on today's close for tomorrow's open (only bars that exist, with enough history).
    if (dayIdx === dates.length - 1) return;
    for (const [sym, cs] of candlesBySymbol) {
      const idx = dateIndex.get(sym)!.get(date);
      if (idx === undefined || idx + 1 < minCandles) continue;
      const sig = provider(sym, idx);
      if (!sig) continue;
      const held = open.has(sym);
      if (held && sig.label === 'SELL') pendingExit.add(sym);
      if (!held && (sig.label === 'BUY' || sig.label === 'STRONG_BUY') && sig.levels?.valid) {
        if (sig.avgTradedValue === null || sig.avgTradedValue >= cfg.universe.minAvgTradedValue) pendingEntry.set(sym, sig.levels);
      }
    }
  });

  // Close what is still open at the last available close so the results are complete.
  const lastDate = dates[dates.length - 1];
  for (const p of [...open.values()]) sell(p, p.qty, lastClose.get(p.symbol) ?? p.entryPrice, lastDate, 'END');
  if (curve.length) curve[curve.length - 1] = { date: lastDate, equity: round2(cash) };

  return { metrics: computeMetrics(closed, curve, bench, dates, bt.initialCapital, exposureDays), trades: closed, equityCurve: curve };
}

/** Summary statistics from closed trades and the daily equity curve, compared with Nifty 50 buy-and-hold. */
export function computeMetrics(trades: BacktestTrade[], curve: Array<{ date: string; equity: number }>, bench: Candle[], dates: string[], initialCapital: number, exposureDays = 0): BacktestMetrics {
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const years = Math.max(1 / 365, (Date.parse(endDate) - Date.parse(startDate)) / (365.25 * 86_400_000));
  const endEquity = curve.length ? curve[curve.length - 1].equity : initialCapital;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  let peak = -Infinity, maxDd = 0;
  for (const p of curve) { peak = Math.max(peak, p.equity); if (peak > 0) maxDd = Math.max(maxDd, (peak - p.equity) / peak); }

  const inRange = bench.filter((c) => c.date >= startDate && c.date <= endDate);
  let benchTotal: number | null = null, benchCagr: number | null = null;
  if (inRange.length >= 2) {
    benchTotal = (inRange[inRange.length - 1].close / inRange[0].close - 1) * 100;
    benchCagr = (Math.pow(inRange[inRange.length - 1].close / inRange[0].close, 1 / years) - 1) * 100;
  }

  return {
    trades: trades.length, wins: wins.length, losses: losses.length,
    winRatePct: trades.length ? round2((wins.length / trades.length) * 100) : 0,
    avgR: round2(mean(trades.map((t) => t.rMultiple))),
    expectancyR: round2(mean(trades.map((t) => t.rMultiple))),
    avgWinR: round2(mean(wins.map((t) => t.rMultiple))),
    avgLossR: round2(mean(losses.map((t) => t.rMultiple))),
    profitFactor: grossLoss > 0 ? round2(grossWin / grossLoss) : null,
    totalReturnPct: round2((endEquity / initialCapital - 1) * 100),
    cagrPct: round2((Math.pow(Math.max(endEquity, 1e-9) / initialCapital, 1 / years) - 1) * 100),
    maxDrawdownPct: round2(maxDd * 100),
    benchmarkCagrPct: benchCagr === null ? null : round2(benchCagr),
    benchmarkTotalReturnPct: benchTotal === null ? null : round2(benchTotal),
    startDate, endDate, years: round2(years),
    exposurePct: dates.length ? round2((exposureDays / dates.length) * 100) : 0,
    totalCosts: round2(trades.reduce((s, t) => s + t.costs, 0)),
  };
}
