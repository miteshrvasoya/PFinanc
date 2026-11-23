import { DEFAULT_SIGNAL_CONFIG, mergeConfig } from '../../src/modules/signals/config.js';
import { adviseHolding } from '../../src/modules/signals/holdingsAdvice.js';
import { computeTradeLevels, positionSize } from '../../src/modules/signals/tradeLevels.js';
import { IndicatorSnapshot, ScoreResult } from '../../src/modules/signals/types.js';
import { fromCloses } from './helpers.js';

const cfg = DEFAULT_SIGNAL_CONFIG;
const snap = (over: Partial<IndicatorSnapshot> = {}): IndicatorSnapshot => ({
  close: 100, sma20: 98, sma50: 95, sma200: 90, ema20: 98, ema50: 95, ema200: 90, sma50Slope: 1, rsi: 55, rsiPrev: 50,
  macd: 1, macdSignal: 0.5, macdHist: 0.5, macdHistPrev: 0.2, bbUpper: 104, bbMiddle: 98, bbLower: 92, bbPercentB: 0.7, atr: 2, adx: 25, plusDi: 25, minusDi: 12,
  volumeRatio: 1.2, avgTradedValue20: 1e8, high52: 105, low52: 70, pctFromHigh52: -5, support: 95, resistance: null, swingLow: 95, relStrength: 5,
  goldenCross: false, deathCross: false, macdBullCross: false, macdBearCross: false, breakout: false, breakdown: false, extendedAtr: 1, ...over,
});

describe('computeTradeLevels', () => {
  it('uses an ATR stop and R-multiple targets', () => {
    const l = computeTradeLevels(snap(), cfg)!;
    // entry zone 99..100 (0.5 ATR pullback), stop = 100 - 2 x 2 = 96, risk 4
    expect(l).toMatchObject({ entryLow: 99, entryHigh: 100, stop: 96, riskPerShare: 4, target1: 106, target2: 110, riskReward: 2.5, extended: false, valid: true });
  });

  it('never puts the entry above the last close', () => {
    const l = computeTradeLevels(snap({ close: 123.4 }), cfg)!;
    expect(l.entryHigh).toBeLessThanOrEqual(123.4);
  });

  it('prefers a tighter swing-low stop when it is still a sensible distance away', () => {
    const l = computeTradeLevels(snap({ swingLow: 97 }), cfg)!;
    expect(l.stop).toBe(96.8); // 97 - 0.1 x ATR (0.2), tighter than the ATR stop of 96
    expect(l.riskPerShare).toBe(3.2);
  });

  it('ignores a swing low that would make the stop absurdly close', () => {
    expect(computeTradeLevels(snap({ swingLow: 99.5 }), cfg)!.stop).toBe(96); // within 0.75 ATR of entry: use the ATR stop
  });

  it('pulls in stops wider than the maximum ATR distance', () => {
    const wide = mergeConfig(cfg, { trade: { atrStopMultiple: 5, maxStopAtr: 3.5 } });
    expect(computeTradeLevels(snap({ swingLow: null }), wide)!.stop).toBe(93); // 100 - 3.5 x 2
  });

  it('keeps the stop below the entire entry zone', () => {
    const l = computeTradeLevels(snap({ swingLow: 99.4 }), cfg)!;
    expect(l.stop).toBeLessThan(l.entryLow);
  });

  it('pulls T2 down to the next resistance when it lies between 1R and T2', () => {
    const l = computeTradeLevels(snap({ resistance: 107 }), cfg)!;
    expect(l.target2).toBe(107);
    expect(l.riskReward).toBe(1.75);
  });

  it('ignores resistance that is closer than 1R', () => {
    expect(computeTradeLevels(snap({ resistance: 102 }), cfg)!.target2).toBe(110);
  });

  it('rejects setups below the minimum risk:reward', () => {
    const l = computeTradeLevels(snap({ resistance: 105 }), cfg)!; // T2 -> max(105, 106) = 106 -> RR 1.5 (equal to the minimum: valid)
    expect(l.valid).toBe(true);
    const strict = computeTradeLevels(snap({ resistance: 105 }), mergeConfig(cfg, { trade: { minRiskReward: 2 } }))!;
    expect(strict.valid).toBe(false);
    expect(strict.invalidReason).toMatch(/below the 2 minimum/);
  });

  it('flags an extended price and moves the entry zone down to the 20 EMA instead of chasing', () => {
    const l = computeTradeLevels(snap({ close: 110, ema20: 100, extendedAtr: 5 }), cfg)!;
    expect(l.extended).toBe(true);
    expect(l).toMatchObject({ entryLow: 100, entryHigh: 101 });
  });

  it('returns null without a usable ATR', () => {
    expect(computeTradeLevels(snap({ atr: null }), cfg)).toBeNull();
    expect(computeTradeLevels(snap({ atr: 0 }), cfg)).toBeNull();
  });
});

describe('positionSize', () => {
  const levels = { entryHigh: 100, stop: 96 };
  it('sizes by risk: quantity = capital x risk% / (entry - stop), then caps concentration', () => {
    // 1,000,000 x 1% = 10,000 / 4 = 2,500 shares = 250,000 > 10% cap (100,000) -> 1,000 shares
    expect(positionSize(levels, cfg)).toEqual({ quantity: 1000, capitalRequired: 100000, riskAmount: 4000, cappedByConcentration: true });
  });
  it('is not capped when the risk budget is the binding limit', () => {
    const c = mergeConfig(cfg, { sizing: { riskPct: 0.25 } }); // 2,500 / 4 = 625 shares = 62,500 <= 100,000
    expect(positionSize(levels, c)).toEqual({ quantity: 625, capitalRequired: 62500, riskAmount: 2500, cappedByConcentration: false });
  });
  it('respects what is already held in the stock', () => {
    expect(positionSize(levels, cfg, 60_000).quantity).toBe(400); // room = 100,000 - 60,000
    expect(positionSize(levels, cfg, 150_000).quantity).toBe(0);
  });
  it('returns zero for a non-positive risk', () => {
    expect(positionSize({ entryHigh: 100, stop: 100 }, cfg).quantity).toBe(0);
  });
});

describe('adviseHolding', () => {
  const closes = [...Array.from({ length: 80 }, (_, i) => 100 + i * 0.5), ...Array.from({ length: 10 }, (_, i) => 140 - i * 1.5)]; // rally to 140, then slides
  const candles = fromCloses(closes);
  const score = (label: ScoreResult['label']): ScoreResult => ({ score: 0, label, confidence: 0.6, reasons: [], components: {}, trendOk: true, warnings: [] });
  const last = candles[candles.length - 1];
  const s = (over: Partial<IndicatorSnapshot> = {}) => snap({ close: last.close, atr: 2, sma200: 90, ...over });

  it('computes a trailing stop from the highest close and reports P&L', () => {
    const a = adviseHolding(s(), score('HOLD'), candles, { quantity: 10, averageCost: 120, lots: [] }, cfg, last.date);
    expect(a.highestClose).toBe(140); // the slide starts from 140, the peak close
    expect(a.trailingStop).toBe(135); // 140 - 2.5 x 2
    expect(a.unrealizedPnl).toBe((last.close - 120) * 10);
    expect(a.unrealizedPnlPct).toBeCloseTo((last.close / 120 - 1) * 100, 1);
  });

  it('moves HOLD to REDUCE when the trailing stop is hit', () => {
    const a = adviseHolding(s(), score('HOLD'), candles, { quantity: 10, averageCost: 120, lots: [] }, cfg, last.date);
    expect(a.trailingStopHit).toBe(true);
    expect(a.label).toBe('REDUCE');
    expect(a.reasons.join(' ')).toMatch(/below the trailing stop/);
  });

  it('escalates to SELL when the stop is hit and price is below the 200 SMA', () => {
    const a = adviseHolding(s({ sma200: 135 }), score('HOLD'), candles, { quantity: 10, averageCost: 120, lots: [] }, cfg, last.date);
    expect(a.label).toBe('SELL');
  });

  it('keeps HOLD when the stop is intact, and treats a BUY-side score as hold for an existing position', () => {
    const rally = fromCloses(Array.from({ length: 90 }, (_, i) => 100 + i));
    const a = adviseHolding(snap({ close: 189, atr: 2 }), score('BUY'), rally, { quantity: 5, averageCost: 100, lots: [] }, cfg, rally[89].date);
    expect(a.trailingStopHit).toBe(false);
    expect(a.label).toBe('HOLD');
    expect(a.reasons.join(' ')).toMatch(/consistent with the signal/);
  });

  it('passes bearish scores through (REDUCE and SELL)', () => {
    const rally = fromCloses(Array.from({ length: 90 }, (_, i) => 100 + i));
    expect(adviseHolding(snap({ close: 189, atr: 2 }), score('SELL'), rally, { quantity: 5, averageCost: 100, lots: [] }, cfg, rally[89].date).label).toBe('SELL');
    expect(adviseHolding(snap({ close: 189, atr: 2 }), score('REDUCE'), rally, { quantity: 5, averageCost: 100, lots: [] }, cfg, rally[89].date).label).toBe('REDUCE');
  });

  it('prompts about the 12-month mark only for lots that are close to it', () => {
    const asOf = '2025-06-30';
    const lots = [
      { date: '2024-08-01', quantity: 7 },  // 333 days old: 32 days left -> prompt
      { date: '2024-01-10', quantity: 3 },  // already long-term
      { date: '2025-05-01', quantity: 9 },  // far from the mark
    ];
    const a = adviseHolding(s(), score('HOLD'), candles, { quantity: 19, averageCost: 100, lots }, cfg, asOf);
    expect(a.longTermNotes).toHaveLength(1);
    expect(a.longTermNotes[0]).toMatch(/7 units pass the 12-month mark in about 32 days/);
    expect(a.longTermNotes[0]).toMatch(/check the impact/i);
  });

  it('uses the last 60 bars for the trailing stop when the buy date is unknown, and the buy date when known', () => {
    const lots = [{ date: candles[85].date, quantity: 10 }]; // bought late: highest close since then is lower than the rally peak
    const known = adviseHolding(s(), score('HOLD'), candles, { quantity: 10, averageCost: 130, lots }, cfg, last.date);
    const unknown = adviseHolding(s(), score('HOLD'), candles, { quantity: 10, averageCost: 130, lots: [] }, cfg, last.date);
    expect(known.highestClose!).toBeLessThan(unknown.highestClose!);
  });
});
