import { DEFAULT_SIGNAL_CONFIG, mergeConfig } from '../../src/modules/signals/config.js';
import { BacktestTrade, computeMetrics, DaySignal, runBacktest, SignalProvider, tradeCosts } from '../../src/modules/signals/backtest.js';
import { Candle, TradeLevels } from '../../src/modules/signals/types.js';
import { tradingDays, walkCandles } from './helpers.js';

const noCosts = { brokeragePct: 0, brokerageCapInr: 0, sttPct: 0, exchangePct: 0, stampPct: 0, gstPct: 0, slippagePct: 0 };
const exactCfg = mergeConfig(DEFAULT_SIGNAL_CONFIG, { backtest: { costs: noCosts } });

const LV: TradeLevels = { entryLow: 99, entryHigh: 101, stop: 96, target1: 106, target2: 110, riskPerShare: 5, riskReward: 2.8, extended: false, valid: true };
const flat = (n: number, price = 100, symbolDates = tradingDays(n)): Candle[] => symbolDates.map((date) => ({ date, open: price, high: price + 0.5, low: price - 0.5, close: price, volume: 1_000_000 }));
const set = (cs: Candle[], i: number, over: Partial<Candle>) => { cs[i] = { ...cs[i], ...over }; };
const buyAt = (sym: string, idx: number, levels: TradeLevels = LV): SignalProvider => (s, i) => (s === sym && i === idx ? { label: 'BUY', levels, avgTradedValue: 1e9 } : null);

const N = 330;
const ENTRY = 261; // decision on bar 260's close, fill at bar 261's open

describe('tradeCosts', () => {
  it('adds brokerage (capped), STT, exchange charges, stamp duty on buys and GST', () => {
    const c = DEFAULT_SIGNAL_CONFIG.backtest.costs;
    // value 100,000: brokerage min(30, 20) = 20; exchange 2.97; STT 100; stamp 15; GST 18% of (20 + 2.97) = 4.1346
    expect(tradeCosts(100000, 'BUY', c)).toBeCloseTo(20 + 2.97 + 100 + 15 + 4.1346, 4);
    expect(tradeCosts(100000, 'SELL', c)).toBeCloseTo(20 + 2.97 + 100 + 4.1346, 4); // no stamp duty on sells
    expect(tradeCosts(10000, 'SELL', c)).toBeCloseTo(3 + 0.297 + 10 + 0.5935, 3);    // below the brokerage cap: 0.03%
  });
});

describe('execution mechanics (hand-built signals, zero costs)', () => {
  const run = (cs: Candle[], provider: SignalProvider, cfg = exactCfg) => runBacktest(new Map([['AAA', cs]]), [], cfg, { signalProvider: provider });

  it('exits half at target 1, moves the stop to breakeven, and exits the rest at target 2 (+2R)', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    set(cs, ENTRY + 1, { high: 107, low: 99, close: 106 });  // T1 hit
    set(cs, ENTRY + 2, { open: 106, high: 111, low: 105, close: 110 }); // T2 hit (opens above the breakeven stop)
    const r = run(cs, buyAt('AAA', 260));
    expect(r.trades).toHaveLength(1);
    const t = r.trades[0];
    // risk = 100 - 96 = 4 -> qty = min(10,000 / 4 = 2,500, 10% cap = 1,000) = 1,000. Exits: 500 @ 106 and 500 @ 110.
    expect(t).toMatchObject({ symbol: 'AAA', entryDate: cs[ENTRY].date, entryPrice: 100, quantity: 1000, reason: 'TARGET', pnl: 8000, rMultiple: 2 });
    expect(t.exitPrice).toBe(108);
    expect(r.metrics.winRatePct).toBe(100);
  });

  it('is stopped out at the stop for -1R', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    set(cs, ENTRY + 1, { low: 95, high: 100, close: 96 });
    const t = run(cs, buyAt('AAA', 260)).trades[0];
    expect(t).toMatchObject({ reason: 'STOP', exitPrice: 96, pnl: -4000, rMultiple: -1 });
  });

  it('fills a gap through the stop at the open, which is worse than -1R', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    set(cs, ENTRY + 1, { open: 94, high: 95, low: 93, close: 94 });
    const t = run(cs, buyAt('AAA', 260)).trades[0];
    expect(t).toMatchObject({ reason: 'STOP', exitPrice: 94 });
    expect(t.rMultiple).toBe(-1.5);
  });

  it('assumes the stop fills first when the stop and a target are both inside one day', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    set(cs, ENTRY + 1, { low: 95, high: 112, close: 100 });
    expect(run(cs, buyAt('AAA', 260)).trades[0]).toMatchObject({ reason: 'STOP', rMultiple: -1 });
  });

  it('does not judge a position on the day it is filled', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100, low: 90, high: 120, close: 100 }); // wild entry day: ignored for exits
    const r = run(cs, buyAt('AAA', 260));
    expect(r.trades[0].entryDate).toBe(cs[ENTRY].date);
    expect(r.trades[0].exitDate).not.toBe(cs[ENTRY].date);
  });

  it('exits after the maximum holding period', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    const cfg = mergeConfig(exactCfg, { backtest: { maxHoldDays: 10 } });
    const t = run(cs, buyAt('AAA', 260), cfg).trades[0];
    expect(t.reason).toBe('TIME');
    expect(t.barsHeld).toBe(10);
  });

  it('exits at the next open when the signal turns to SELL', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    set(cs, 266, { open: 103 });
    const provider: SignalProvider = (s, i) => (i === 260 ? { label: 'BUY', levels: LV, avgTradedValue: 1e9 } : i === 265 ? { label: 'SELL', levels: null, avgTradedValue: 1e9 } : null);
    const t = run(cs, provider).trades[0];
    expect(t).toMatchObject({ reason: 'SIGNAL_EXIT', exitDate: cs[266].date, exitPrice: 103 });
  });

  it('does not chase: skips the entry when the open is above the suggested zone', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 104 }); // zone tops at 101
    expect(run(cs, buyAt('AAA', 260)).trades).toHaveLength(0);
  });

  it('ignores setups that failed the risk:reward check', () => {
    const cs = flat(N);
    expect(run(cs, buyAt('AAA', 260, { ...LV, valid: false })).trades).toHaveLength(0);
  });

  it('respects the liquidity filter', () => {
    const cs = flat(N);
    const thin: SignalProvider = (s, i) => (i === 260 ? { label: 'BUY', levels: LV, avgTradedValue: 1000 } : null);
    expect(run(cs, thin).trades).toHaveLength(0);
  });

  it('limits concurrent positions', () => {
    const a = flat(N), b = flat(N);
    const provider: SignalProvider = (s, i) => (i === 260 ? { label: 'BUY', levels: LV, avgTradedValue: 1e9 } : null);
    const cfg = mergeConfig(exactCfg, { backtest: { maxOpenPositions: 1 } });
    const r = runBacktest(new Map([['AAA', a], ['BBB', b]]), [], cfg, { signalProvider: provider });
    expect(r.trades).toHaveLength(1);
  });

  it('charges costs and slippage, which reduce the result', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    set(cs, ENTRY + 1, { high: 107, low: 99, close: 106 });
    set(cs, ENTRY + 2, { open: 106, high: 111, low: 105, close: 110 });
    const free = run(cs, buyAt('AAA', 260)).trades[0];
    const real = run(cs, buyAt('AAA', 260), DEFAULT_SIGNAL_CONFIG).trades[0];
    expect(real.costs).toBeGreaterThan(0);
    expect(real.pnl).toBeLessThan(free.pnl);
    expect(real.pnl).toBeCloseTo(real.grossPnl - real.costs, 1);
  });

  it('closes what is still open at the last bar and reports it as END', () => {
    const cs = flat(N);
    set(cs, ENTRY, { open: 100 });
    const cfg = mergeConfig(exactCfg, { backtest: { maxHoldDays: 400 } });
    expect(run(cs, buyAt('AAA', 260), cfg).trades[0].reason).toBe('END');
  });

  it('tracks equity daily and never goes negative', () => {
    const cs = flat(N);
    const r = run(cs, buyAt('AAA', 260));
    expect(r.equityCurve).toHaveLength(N);
    expect(r.equityCurve[0].equity).toBe(exactCfg.backtest.initialCapital);
    expect(r.equityCurve.every((p) => p.equity > 0)).toBe(true);
  });
});

describe('computeMetrics', () => {
  const trade = (pnl: number, r: number): BacktestTrade => ({ symbol: 'X', entryDate: '2024-01-01', entryPrice: 1, exitDate: '2024-01-10', exitPrice: 1, quantity: 1, reason: 'TARGET', grossPnl: pnl, costs: 0, pnl, rMultiple: r, barsHeld: 5 });
  const days = tradingDays(500, '2023-01-02');
  const bench: Candle[] = days.map((date, i) => ({ date, open: 100, high: 100, low: 100, close: 100 + i * 0.1, volume: 1 }));

  it('computes win rate, average R, expectancy, profit factor and max drawdown', () => {
    const curve = [100, 120, 90, 110, 130].map((e, i) => ({ date: days[i], equity: e * 1000 }));
    const m = computeMetrics([trade(2000, 2), trade(-1000, -1), trade(-1000, -1), trade(2000, 2)], curve, bench, days.slice(0, 5), 100_000);
    expect(m).toMatchObject({ trades: 4, wins: 2, losses: 2, winRatePct: 50, avgR: 0.5, expectancyR: 0.5, avgWinR: 2, avgLossR: -1, profitFactor: 2 });
    expect(m.maxDrawdownPct).toBe(25); // peak 120k -> trough 90k
  });

  it('compares with the benchmark over the same dates', () => {
    const curve = days.map((d) => ({ date: d, equity: 100_000 }));
    const m = computeMetrics([], curve, bench, days, 100_000);
    expect(m.benchmarkTotalReturnPct).toBeCloseTo(((100 + 499 * 0.1) / 100 - 1) * 100, 1);
    expect(m.benchmarkCagrPct).toBeGreaterThan(0);
    expect(m.cagrPct).toBe(0);
    expect(m.profitFactor).toBeNull();
  });
});

describe('rule-based backtest: no look-ahead, deterministic', () => {
  const symbols = ['AAA', 'BBB', 'CCC'];
  const build = (): Map<string, Candle[]> => new Map(symbols.map((s, k) => [s, walkCandles(900, { seed: 11 + k, drift: 0.0006, vol: 0.016, start: 80 + k * 40 })]));
  const bench = walkCandles(900, { seed: 99, drift: 0.0003, vol: 0.009 });
  const cfg = mergeConfig(DEFAULT_SIGNAL_CONFIG, { universe: { minAvgTradedValue: 0 }, trade: { minRiskReward: 1 } });
  const dates = build().get('AAA')!.map((c) => c.date);
  const CUT = dates[700];

  it('produces trades and sane metrics with the default ruleset', () => {
    const r = runBacktest(build(), bench, cfg);
    expect(r.trades.length).toBeGreaterThan(0);
    expect(r.equityCurve).toHaveLength(dates.length - 0);
    for (const v of Object.values(r.metrics)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
    expect(r.metrics.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(r.metrics.winRatePct).toBeGreaterThanOrEqual(0);
    expect(r.metrics.winRatePct).toBeLessThanOrEqual(100);
  });

  it('is deterministic: the same input gives identical results', () => {
    expect(runBacktest(build(), bench, cfg)).toEqual(runBacktest(build(), bench, cfg));
  });

  it('decisions never depend on later bars: scrambling the future leaves earlier trades unchanged', () => {
    const baseline = runBacktest(build(), bench, cfg);
    const future = build();
    const rnd = (n: number) => ((Math.imul(1664525, n) + 1013904223) >>> 0) / 0x100000000;
    for (const cs of future.values()) {
      for (let i = 701; i < cs.length; i++) { // wreck everything after the cut-off
        const p = 50 + rnd(i) * 400;
        cs[i] = { ...cs[i], open: p, high: p * 1.2, low: p * 0.8, close: p * (0.9 + rnd(i + 7) * 0.2), volume: 1 + Math.floor(rnd(i + 3) * 1e7) };
      }
    }
    const wrecked = runBacktest(future, bench, cfg);
    const before = (r: ReturnType<typeof runBacktest>) => r.trades.filter((t) => t.exitDate < CUT && t.reason !== 'END');
    expect(before(wrecked)).toEqual(before(baseline));
    expect(before(baseline).length).toBeGreaterThan(0);
    // and the equity curve up to the cut-off is identical
    const upTo = (r: ReturnType<typeof runBacktest>) => r.equityCurve.filter((p) => p.date < CUT);
    expect(upTo(wrecked)).toEqual(upTo(baseline));
  });

  it('truncating the history gives the same trades as running to a date on the full history', () => {
    const full = runBacktest(build(), bench, cfg, { to: CUT });
    const truncated = new Map([...build()].map(([k, cs]) => [k, cs.filter((c) => c.date <= CUT)]));
    const cut = runBacktest(truncated, bench.filter((c) => c.date <= CUT), cfg);
    const key = (r: ReturnType<typeof runBacktest>) => r.trades.filter((t) => t.reason !== 'END').map((t) => `${t.symbol}|${t.entryDate}|${t.exitDate}|${t.pnl}`);
    expect(key(full)).toEqual(key(cut));
  });

  it('handles an empty universe and too-short histories without crashing', () => {
    expect(runBacktest(new Map(), [], cfg).trades).toEqual([]);
    const tiny = new Map([['AAA', walkCandles(100, { seed: 1 })]]);
    expect(runBacktest(tiny, [], cfg).trades).toEqual([]);
  });
});
