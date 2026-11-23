import { DEFAULT_SIGNAL_CONFIG, mergeConfig, validateConfig } from '../../src/modules/signals/config.js';
import { computeIndicators } from '../../src/modules/signals/indicators.js';
import { labelFor, scoreAt, scoreSnapshot, snapshotAt } from '../../src/modules/signals/scoring.js';
import { Candle, IndicatorSnapshot } from '../../src/modules/signals/types.js';
import { walkCandles } from './helpers.js';

const cfg = DEFAULT_SIGNAL_CONFIG;

/** A neutral snapshot; tests override just the fields they care about. */
const snap = (over: Partial<IndicatorSnapshot> = {}): IndicatorSnapshot => ({
  close: 100, sma20: 100, sma50: 100, sma200: 100, ema20: 100, ema50: 100, ema200: 100, sma50Slope: 0,
  rsi: 50, rsiPrev: 50, macd: 0, macdSignal: 0, macdHist: 0, macdHistPrev: 0,
  bbUpper: 105, bbMiddle: 100, bbLower: 95, bbPercentB: 0.5, atr: 2, adx: 15, plusDi: 20, minusDi: 20,
  volumeRatio: 1, avgTradedValue20: 1e8, high52: 110, low52: 80, pctFromHigh52: -9, support: 95, resistance: 105, swingLow: 95,
  relStrength: 0, goldenCross: false, deathCross: false, macdBullCross: false, macdBearCross: false, breakout: false, breakdown: false, extendedAtr: 0,
  ...over,
});

const bullish = (): IndicatorSnapshot => snap({
  close: 120, sma20: 116, sma50: 110, sma200: 100, ema20: 116, sma50Slope: 2.5, rsi: 52, rsiPrev: 47,
  macd: 1.2, macdSignal: 0.8, macdHist: 0.4, macdHistPrev: 0.1, macdBullCross: true, goldenCross: true,
  breakout: true, volumeRatio: 1.9, adx: 31, plusDi: 30, minusDi: 12, relStrength: 12,
});

const bearish = (): IndicatorSnapshot => snap({
  close: 80, sma50: 92, sma200: 100, ema20: 88, sma50Slope: -3, rsi: 36, rsiPrev: 41,
  macd: -1.5, macdSignal: -0.9, macdHist: -0.6, macdHistPrev: -0.3, macdBearCross: true, deathCross: true,
  breakdown: true, volumeRatio: 2.2, adx: 28, plusDi: 10, minusDi: 30, relStrength: -15,
});

describe('scoreSnapshot', () => {
  it('rates a clean bullish setup as a buy, with reasons', () => {
    const r = scoreSnapshot(bullish(), cfg, { upDay: true });
    expect(r.score).toBeGreaterThanOrEqual(cfg.thresholds.strongBuy);
    expect(r.label).toBe('STRONG_BUY');
    expect(r.trendOk).toBe(true);
    expect(r.confidence).toBeGreaterThan(0.8);
    const text = r.reasons.join(' | ');
    expect(text).toMatch(/Price above 200 SMA/);
    expect(text).toMatch(/50 SMA rising/);
    expect(text).toMatch(/Golden cross/);
    expect(text).toMatch(/MACD bullish cross above zero/);
    expect(text).toMatch(/RSI 52 and rising/);
    expect(text).toMatch(/Volume 1\.9x average on a breakout/);
    expect(text).toMatch(/Outperforming Nifty 50 by 12 points/);
  });

  it('rates a clean bearish setup as sell-side, with reasons', () => {
    const r = scoreSnapshot(bearish(), cfg, { upDay: false });
    expect(r.score).toBeLessThanOrEqual(cfg.thresholds.sell);
    expect(r.label).toBe('SELL');
    const text = r.reasons.join(' | ');
    expect(text).toMatch(/Price below 200 SMA/);
    expect(text).toMatch(/Death cross/);
    expect(text).toMatch(/MACD bearish cross/);
    expect(text).toMatch(/Volume 2\.2x average on a breakdown/);
    expect(text).toMatch(/Lagging Nifty 50/);
  });

  it('stays neutral when nothing stands out', () => {
    const r = scoreSnapshot(snap(), cfg);
    expect(Math.abs(r.score)).toBeLessThan(cfg.thresholds.watch);
    expect(r.label).toBe('HOLD');
  });

  it('lowers confidence when indicators conflict', () => {
    const conflicting = snap({
      close: 120, sma50: 110, sma200: 100, sma50Slope: 2, goldenCross: false,       // long-term trend up...
      rsi: 78, rsiPrev: 80, macd: -0.5, macdSignal: 0.2, macdHist: -0.7, macdHistPrev: -0.2, macdBearCross: true, // ...but overbought and MACD turning down
      adx: 30, plusDi: 14, minusDi: 26, relStrength: -6,
    });
    const r = scoreSnapshot(conflicting, cfg);
    const clean = scoreSnapshot(bullish(), cfg, { upDay: true });
    expect(r.confidence).toBeLessThan(clean.confidence);
    expect(r.confidence).toBeLessThan(0.7);
    expect(r.warnings.join(' ')).toMatch(/disagree/);
    expect(r.label).not.toBe('STRONG_BUY');
  });

  it('thin data lowers confidence too', () => {
    const full = scoreSnapshot(bullish(), cfg, { candleCount: 600 });
    const thin = scoreSnapshot({ ...bullish(), relStrength: null, adx: null, volumeRatio: null }, cfg, { candleCount: 260 });
    expect(thin.confidence).toBeLessThan(full.confidence);
  });

  it('caps BUY at WATCH when the price is below the 200 SMA (trend filter)', () => {
    // very strong short-term momentum, but price is under the 200 SMA and there is no reversal confirmation
    const s = snap({ close: 95, sma50: 90, sma200: 100, sma50Slope: -1, rsi: 52, rsiPrev: 47, macd: 1, macdSignal: 0.5, macdHist: 0.5, macdHistPrev: 0.1,
      breakout: true, volumeRatio: 2.5, adx: 40, plusDi: 35, minusDi: 8, relStrength: 25 });
    const r = scoreSnapshot(s, { ...cfg, thresholds: { ...cfg.thresholds, buy: 5, strongBuy: 20, watch: 1 } });
    expect(r.trendOk).toBe(false);
    expect(r.label).toBe('WATCH');
    expect(r.warnings.join(' ')).toMatch(/Trend filter/);
  });

  it('allows BUY below the 200 SMA only on a confirmed reversal (golden cross)', () => {
    const s = snap({ close: 105, sma50: 101, sma200: 100, sma50Slope: 1, goldenCross: true, rsi: 55, rsiPrev: 50, macd: 1, macdSignal: 0.5, macdHist: 0.5, macdHistPrev: 0.1, macdBullCross: true, breakout: true, volumeRatio: 2, adx: 30, plusDi: 25, minusDi: 10, relStrength: 10 });
    expect(scoreSnapshot(s, cfg).trendOk).toBe(true);
  });

  it('forces REDUCE on a death cross under the 200 SMA even if the blended score is mild', () => {
    const s = snap({ close: 98, sma50: 99, sma200: 100, deathCross: true, rsi: 50 });
    const r = scoreSnapshot(s, cfg);
    expect(['REDUCE', 'SELL']).toContain(r.label);
  });

  it('flags overbought RSI, and harder with a bearish divergence', () => {
    const plain = scoreSnapshot(snap({ rsi: 80, rsiPrev: 79 }), cfg);
    const div = scoreSnapshot(snap({ rsi: 80, rsiPrev: 79 }), cfg, { divergence: true });
    expect(plain.reasons.join(' ')).toMatch(/overbought/);
    expect(div.reasons.join(' ')).toMatch(/bearish divergence/);
    expect(div.components.momentum).toBeLessThan(plain.components.momentum);
  });

  it('is driven by the config: weights and thresholds change the outcome', () => {
    const base = scoreSnapshot(bullish(), cfg, { upDay: true });
    const easy = scoreSnapshot(bullish(), { ...cfg, thresholds: { ...cfg.thresholds, strongBuy: 99, buy: 98, watch: 97 } }, { upDay: true });
    expect(base.label).toBe('STRONG_BUY');
    expect(easy.label).not.toBe('STRONG_BUY');
    const trendOnly = scoreSnapshot(bullish(), { ...cfg, weights: { trend: 1, momentum: 0, macd: 0, volume: 0, breakout: 0, strength: 0, relativeStrength: 0 } }, { upDay: true });
    expect(trendOnly.score).not.toBe(base.score);
  });

  it('is deterministic and does not mutate its inputs', () => {
    const s = bullish();
    const frozen = JSON.stringify(s);
    const cfgFrozen = JSON.stringify(cfg);
    const a = scoreSnapshot(s, cfg, { upDay: true });
    const b = scoreSnapshot(s, cfg, { upDay: true });
    expect(a).toEqual(b);
    expect(JSON.stringify(s)).toBe(frozen);
    expect(JSON.stringify(cfg)).toBe(cfgFrozen);
  });

  it('keeps the score within -100..100 and the confidence within 0..1', () => {
    for (const s of [bullish(), bearish(), snap()]) {
      const r = scoreSnapshot(s, cfg);
      expect(r.score).toBeGreaterThanOrEqual(-100);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('labelFor', () => {
  it('turns bearish labels into AVOID for stocks you do not hold', () => {
    expect(labelFor('SELL', false)).toBe('AVOID');
    expect(labelFor('REDUCE', false)).toBe('AVOID');
    expect(labelFor('SELL', true)).toBe('SELL');
    expect(labelFor('BUY', false)).toBe('BUY');
  });
});

describe('scoring on real candle series', () => {
  const uptrend = walkCandles(420, { seed: 3, drift: 0.0022, vol: 0.006 });
  const downtrend = walkCandles(420, { seed: 4, drift: -0.0022, vol: 0.006 });
  const bench = walkCandles(420, { seed: 9, drift: 0.0003, vol: 0.006 });
  const at = (cs: Candle[]) => { const ind = computeIndicators(cs, bench); return scoreAt(cs, ind, cs.length - 1, cfg); };

  it('a steady uptrend scores clearly higher than a steady downtrend', () => {
    const up = at(uptrend).result;
    const down = at(downtrend).result;
    expect(up.score).toBeGreaterThan(down.score + 40);
    expect(up.score).toBeGreaterThan(0);
    expect(down.score).toBeLessThan(0);
    expect(up.reasons.join(' ')).toMatch(/above 200 SMA/);
    expect(down.reasons.join(' ')).toMatch(/below 200 SMA/);
  });

  it('snapshotAt reads only data up to the bar (prefix gives the same snapshot)', () => {
    const full = computeIndicators(uptrend, bench);
    const i = 350;
    const a = snapshotAt(uptrend, full, i, cfg);
    const b = snapshotAt(uptrend.slice(0, i + 1), computeIndicators(uptrend.slice(0, i + 1), bench), i, cfg);
    expect(b).toEqual(a);
  });
});

describe('config', () => {
  it('merges overrides, rejects unknown keys, wrong types and out-of-range values', () => {
    expect(mergeConfig(cfg, { thresholds: { buy: 40 } }).thresholds.buy).toBe(40);
    expect(() => mergeConfig(cfg, { nope: 1 })).toThrow(/Unknown setting "nope"/);
    expect(() => mergeConfig(cfg, { sizing: { riskPct: 'high' } })).toThrow(/must be a number/);
    expect(() => mergeConfig(cfg, { sizing: { riskPct: 50 } })).toThrow(/between/);
    expect(() => mergeConfig(cfg, { universe: { presetSymbols: ['bad symbol!'] } })).toThrow(/list of symbols/);
    expect(mergeConfig(cfg, { universe: { presetSymbols: ['tcs', 'TCS', 'infy'] } }).universe.presetSymbols).toEqual(['TCS', 'INFY']);
    expect(DEFAULT_SIGNAL_CONFIG.thresholds.buy).toBe(35); // defaults untouched
  });
  it('validates cross-field rules', () => {
    expect(() => validateConfig(mergeConfig(cfg, { thresholds: { buy: 70 } }))).toThrow(/descend/);
    expect(() => validateConfig(mergeConfig(cfg, { weights: { trend: 0, momentum: 0, macd: 0, volume: 0, breakout: 0, strength: 0, relativeStrength: 0 } }))).toThrow(/weight/);
    expect(() => validateConfig(mergeConfig(cfg, { trade: { target1R: 3, target2R: 2 } }))).toThrow(/target2R/);
    expect(() => validateConfig(cfg)).not.toThrow();
  });
});
