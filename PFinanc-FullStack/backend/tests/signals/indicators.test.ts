import { SMA, EMA, RSI, MACD, BollingerBands, ADX } from 'technicalindicators';
import { adx, atr, bollinger, computeIndicators, crossedAbove, ema, levelsAt, macd, relativeStrength, rollingExtremes, rsi, sma, swings, trueRange, volumeRatio } from '../../src/modules/signals/indicators.js';
import { Candle } from '../../src/modules/signals/types.js';
import { fromCloses, walkCandles } from './helpers.js';

const candles = walkCandles(600, { seed: 7, drift: 0.0004, vol: 0.015 });
const closes = candles.map((c) => c.close);
const hi = candles.map((c) => c.high);
const lo = candles.map((c) => c.low);

/** Compare our series with a reference series that omits warm-up values (aligned to the end). */
function expectTailClose(ours: Array<number | null>, ref: number[], digits = 6, skip = 0) {
  const offset = ours.length - ref.length;
  for (let i = skip; i < ref.length; i++) {
    const o = ours[offset + i];
    expect(o).not.toBeNull();
    expect(o as number).toBeCloseTo(ref[i], digits);
  }
}

describe('hand-checkable cases', () => {
  it('SMA of 1..5', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('EMA is seeded with the SMA and then smooths with 2/(n+1)', () => {
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(e).toEqual([null, null, 2, 3, 4]); // linear input: EMA equals the lagged value, seeded at SMA(1,2,3)=2
    const e2 = ema([10, 10, 10, 20], 3);
    expect(e2[2]).toBe(10);
    expect(e2[3]).toBeCloseTo(20 * 0.5 + 10 * 0.5, 10);
  });

  it('RSI is 100 when price only rises, 0 when it only falls, 50 when flat', () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const down = Array.from({ length: 30 }, (_, i) => 200 - i);
    const flat = new Array(30).fill(50);
    expect(rsi(up)[29]).toBe(100);
    expect(rsi(down)[29]).toBeCloseTo(0, 10);
    expect(rsi(flat)[29]).toBe(50);
  });

  it("RSI reproduces the worked example in Wilder's method (first value from the first 14 changes)", () => {
    // 14 changes: 7 gains of 1 and 7 losses of 1 -> avg gain = avg loss -> RSI 50
    const c = [100]; for (let i = 0; i < 14; i++) c.push(c[c.length - 1] + (i % 2 === 0 ? 1 : -1));
    expect(rsi(c, 14)[14]).toBeCloseTo(50, 10);
  });

  it('Bollinger bands collapse onto the price when it is constant, and %B is 0.5', () => {
    const b = bollinger(new Array(25).fill(10), 20, 2);
    expect(b.upper[24]).toBe(10);
    expect(b.lower[24]).toBe(10);
    expect(b.percentB[24]).toBe(0.5);
  });

  it('Bollinger bands use the population standard deviation', () => {
    const vals = [2, 4, 4, 4, 5, 5, 7, 9]; // textbook set: mean 5, population sd 2
    const b = bollinger(vals, 8, 2);
    expect(b.middle[7]).toBe(5);
    expect(b.upper[7]).toBe(9);
    expect(b.lower[7]).toBe(1);
  });

  it("ATR follows Wilder's definition (true ranges 2,2,2,2,3,2,2 -> 2.2, 2.16, 2.128, 2.3024)", () => {
    const high = [10, 11, 12, 11, 13, 14, 13, 15];
    const low = high.map((h) => h - 2);
    const close = high.map((h) => h - 1);
    const c: Candle[] = high.map((h, i) => ({ date: `2024-01-${String(i + 1).padStart(2, '0')}`, open: close[i], high: h, low: low[i], close: close[i], volume: 1 }));
    const a = atr(c, 5);
    expect(a.slice(0, 4)).toEqual([null, null, null, null]);
    expect(a[4]).toBeCloseTo(2.2, 10);
    expect(a[5]).toBeCloseTo(2.16, 10);
    expect(a[6]).toBeCloseTo(2.128, 10);
    expect(a[7]).toBeCloseTo(2.3024, 10);
  });

  it('true range uses the previous close for gaps', () => {
    const c: Candle[] = [
      { date: '2024-01-01', open: 10, high: 11, low: 9, close: 10, volume: 1 },
      { date: '2024-01-02', open: 15, high: 16, low: 14, close: 15, volume: 1 }, // gap up: TR = 16 - 10 = 6
    ];
    expect(trueRange(c)).toEqual([2, 6]);
  });

  it('MACD of a constant series is zero everywhere it is defined', () => {
    const m = macd(new Array(60).fill(42));
    expect(m.macd[59]).toBe(0);
    expect(m.signal[59]).toBe(0);
    expect(m.hist[59]).toBe(0);
  });

  it('volume ratio compares with the PREVIOUS 20 days, so a spike is not diluted', () => {
    const v = new Array(20).fill(100); v.push(300);
    expect(volumeRatio(v, 20)[20]).toBe(3);
  });

  it('ADX is high in a clean trend and low in a flat range', () => {
    const trend = fromCloses(Array.from({ length: 80 }, (_, i) => 100 + i * 2));
    const range = fromCloses(Array.from({ length: 80 }, (_, i) => 100 + 4 * Math.sin(i / 1.6))); // oscillates: up and down moves cancel
    expect(adx(trend).adx[79]!).toBeGreaterThan(40);
    expect(adx(trend).plusDi[79]!).toBeGreaterThan(adx(trend).minusDi[79]!);
    expect(adx(range).adx[79]!).toBeLessThan(20);
  });

  it('rolling extremes cover the window', () => {
    const c = fromCloses(Array.from({ length: 260 }, (_, i) => 100 + i));
    const e = rollingExtremes(c, 252);
    expect(e.high[259]).toBe(359 + 0.5);
    expect(e.low[259]).toBeCloseTo(106.5, 6); // oldest bar in the window is 8: low = min(close 108, previous close 107) - 0.5
  });

  it('detects crossovers', () => {
    expect(crossedAbove([1, 1, 3], [2, 2, 2], 2)).toBe(true);
    expect(crossedAbove([3, 3, 3], [2, 2, 2], 2)).toBe(false);
  });
});

describe('cross-check against the technicalindicators library', () => {
  it('SMA', () => expectTailClose(sma(closes, 50), SMA.calculate({ period: 50, values: closes })));
  it('EMA', () => expectTailClose(ema(closes, 20), EMA.calculate({ period: 20, values: closes }), 6));
  it('RSI (Wilder); the library rounds to 2 decimals', () => expectTailClose(rsi(closes, 14), RSI.calculate({ period: 14, values: closes }), 2));
  it('MACD line, signal and histogram', () => {
    const ref = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    const ours = macd(closes);
    const offset = closes.length - ref.length;
    for (let i = 20; i < ref.length; i++) {
      expect(ours.macd[offset + i]).toBeCloseTo(ref[i].MACD as number, 6);
      expect(ours.signal[offset + i]).toBeCloseTo(ref[i].signal as number, 6);
      expect(ours.hist[offset + i]).toBeCloseTo(ref[i].histogram as number, 6);
    }
  });
  it('Bollinger Bands', () => {
    const ref = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
    const ours = bollinger(closes, 20, 2);
    const offset = closes.length - ref.length;
    for (let i = 0; i < ref.length; i++) {
      expect(ours.upper[offset + i]).toBeCloseTo(ref[i].upper, 6);
      expect(ours.middle[offset + i]).toBeCloseTo(ref[i].middle, 6);
      expect(ours.lower[offset + i]).toBeCloseTo(ref[i].lower, 6);
    }
  });
  // technicalindicators' ATR disagrees with the textbook definition on a hand-checkable fixture (see the ATR test
  // in "hand-checkable cases"), so ATR is verified against hand-computed values instead of that library.
  it('ADX, +DI and -DI (Wilder)', () => {
    const ref = ADX.calculate({ period: 14, high: hi, low: lo, close: closes });
    const ours = adx(candles, 14);
    const offset = closes.length - ref.length;
    for (let i = 0; i < ref.length; i++) {
      expect(ours.adx[offset + i]).toBeCloseTo(ref[i].adx, 4);
      expect(ours.plusDi[offset + i]).toBeCloseTo(ref[i].pdi, 4);
      expect(ours.minusDi[offset + i]).toBeCloseTo(ref[i].mdi, 4);
    }
  });
});

describe('causality: a value never depends on later data (needed for a look-ahead-free backtest)', () => {
  const full = computeIndicators(candles, []);
  const cut = 420;
  const prefix = computeIndicators(candles.slice(0, cut), []);
  const keys: Array<keyof typeof full> = ['sma20', 'sma50', 'sma200', 'ema20', 'ema50', 'ema200', 'rsi', 'atr', 'volumeRatio', 'avgTradedValue', 'high52', 'low52'];

  it.each(keys)('%s', (k) => {
    const a = full[k] as Array<number | null>;
    const b = prefix[k] as Array<number | null>;
    for (let i = 0; i < cut; i++) expect(b[i]).toBe(a[i]);
  });

  it('MACD, Bollinger and ADX', () => {
    for (let i = 0; i < cut; i++) {
      expect(prefix.macd.hist[i]).toBe(full.macd.hist[i]);
      expect(prefix.bb.upper[i]).toBe(full.bb.upper[i]);
      expect(prefix.adx.adx[i]).toBe(full.adx.adx[i]);
    }
  });

  it('swing levels as known at bar i never use pivots confirmed after i', () => {
    const sw = swings(candles, 5);
    for (const i of [250, 300, 400, 500]) {
      const price = candles[i].close;
      const a = levelsAt(sw, i, price);
      const b = levelsAt(swings(candles.slice(0, i + 1), 5), i, price);
      expect(b).toEqual(a);
    }
  });
});

describe('relative strength', () => {
  it('is the stock return minus the benchmark return, in points', () => {
    const stock = fromCloses([100, 100, 100, 110]);
    const bench = fromCloses([1000, 1000, 1000, 1050]);
    expect(relativeStrength(stock, bench, 3)[3]).toBeCloseTo(10 - 5, 8);
  });
  it('carries the benchmark over missing days and returns nulls without a benchmark', () => {
    const stock = fromCloses([100, 100, 100, 110]);
    expect(relativeStrength(stock, [], 3)).toEqual([null, null, null, null]);
  });
});
