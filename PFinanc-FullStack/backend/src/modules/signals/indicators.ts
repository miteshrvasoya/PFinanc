import { Candle, Series } from './types.js';

/**
 * Technical indicators as pure, deterministic functions over arrays.
 *
 * Contract: every function is CAUSAL. The value at index i depends only on inputs at indices <= i, so computing
 * on a prefix gives the same numbers as computing on the full series (tests enforce this). That property is what
 * lets the backtest replay history without look-ahead bias. Warm-up positions are null.
 */

const nulls = (n: number): Series => new Array(n).fill(null);

export function sma(values: number[], period: number): Series {
  const out = nulls(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA seeded with the SMA of the first `period` values (the common convention). */
export function ema(values: number[], period: number): Series {
  const out = nulls(values.length);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** EMA over a series that itself starts with nulls (used for the MACD signal line). */
function emaOfSeries(series: Series, period: number): Series {
  const out = nulls(series.length);
  const start = series.findIndex((v) => v !== null);
  if (start < 0) return out;
  const dense = series.slice(start).map((v) => v as number);
  const e = ema(dense, period);
  e.forEach((v, i) => { out[start + i] = v; });
  return out;
}

/** Wilder's RSI. First value at index `period`. */
export function rsi(closes: number[], period = 14): Series {
  const out = nulls(closes.length);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const toRsi = () => (avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss));
  out[period] = toRsi();
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = toRsi();
  }
  return out;
}

export interface MacdResult { macd: Series; signal: Series; hist: Series }

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line: Series = closes.map((_, i) => (f[i] !== null && s[i] !== null ? (f[i] as number) - (s[i] as number) : null));
  const signal = emaOfSeries(line, signalPeriod);
  const hist: Series = line.map((v, i) => (v !== null && signal[i] !== null ? v - (signal[i] as number) : null));
  return { macd: line, signal, hist };
}

export interface BollingerResult { upper: Series; middle: Series; lower: Series; percentB: Series }

/** Bollinger Bands with the population standard deviation. */
export function bollinger(closes: number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(closes, period);
  const upper = nulls(closes.length);
  const lower = nulls(closes.length);
  const percentB = nulls(closes.length);
  for (let i = period - 1; i < closes.length; i++) {
    const m = middle[i] as number;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) v += (closes[j] - m) ** 2;
    const sd = Math.sqrt(v / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
    percentB[i] = upper[i]! === lower[i]! ? 0.5 : (closes[i] - lower[i]!) / (upper[i]! - lower[i]!);
  }
  return { upper, middle, lower, percentB };
}

/** True range; the first bar has no previous close so it is high - low. */
export function trueRange(candles: Candle[]): number[] {
  return candles.map((c, i) => (i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close))));
}

/** Wilder's ATR. First value at index period - 1 (mean of the first `period` true ranges). */
export function atr(candles: Candle[], period = 14): Series {
  const out = nulls(candles.length);
  if (candles.length < period) return out;
  const tr = trueRange(candles);
  let prev = tr.slice(0, period).reduce((s, v) => s + v, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

export interface AdxResult { adx: Series; plusDi: Series; minusDi: Series }

/** Wilder's ADX with +DI / -DI. DI values start at index `period`, ADX at 2 x period - 1. */
export function adx(candles: Candle[], period = 14): AdxResult {
  const n = candles.length;
  const plusDi = nulls(n);
  const minusDi = nulls(n);
  const out = nulls(n);
  if (n <= period * 2) return { adx: out, plusDi, minusDi };

  const tr = trueRange(candles);
  const pdm: number[] = [0];
  const mdm: number[] = [0];
  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    pdm.push(up > down && up > 0 ? up : 0);
    mdm.push(down > up && down > 0 ? down : 0);
  }
  let sTr = 0, sP = 0, sM = 0;
  for (let i = 1; i <= period; i++) { sTr += tr[i]; sP += pdm[i]; sM += mdm[i]; }
  const dx: number[] = [];
  const di = (i: number) => {
    const p = sTr === 0 ? 0 : (100 * sP) / sTr;
    const m = sTr === 0 ? 0 : (100 * sM) / sTr;
    plusDi[i] = p;
    minusDi[i] = m;
    return p + m === 0 ? 0 : (100 * Math.abs(p - m)) / (p + m);
  };
  dx[period] = di(period);
  for (let i = period + 1; i < n; i++) {
    sTr = sTr - sTr / period + tr[i];
    sP = sP - sP / period + pdm[i];
    sM = sM - sM / period + mdm[i];
    dx[i] = di(i);
  }
  let a = 0;
  for (let i = period; i < period * 2; i++) a += dx[i];
  a /= period;
  out[period * 2 - 1] = a;
  for (let i = period * 2; i < n; i++) {
    a = (a * (period - 1) + dx[i]) / period;
    out[i] = a;
  }
  return { adx: out, plusDi, minusDi };
}

/** Today's volume divided by the average of the PREVIOUS `period` days (so a spike is not diluted by itself). */
export function volumeRatio(volumes: number[], period = 20): Series {
  const out = nulls(volumes.length);
  for (let i = period; i < volumes.length; i++) {
    let s = 0;
    for (let j = i - period; j < i; j++) s += volumes[j];
    const avg = s / period;
    out[i] = avg > 0 ? volumes[i] / avg : null;
  }
  return out;
}

/** Average traded value (close x volume) over the last `period` days including today. */
export function avgTradedValue(candles: Candle[], period = 20): Series {
  return sma(candles.map((c) => c.close * c.volume), period);
}

/** Rolling highest high / lowest low over `period` bars (about one trading year at 252). */
export function rollingExtremes(candles: Candle[], period = 252): { high: Series; low: Series } {
  const high = nulls(candles.length);
  const low = nulls(candles.length);
  for (let i = period - 1; i < candles.length; i++) {
    let h = -Infinity, l = Infinity;
    for (let j = i - period + 1; j <= i; j++) { if (candles[j].high > h) h = candles[j].high; if (candles[j].low < l) l = candles[j].low; }
    high[i] = h;
    low[i] = l;
  }
  return { high, low };
}

export interface Swing { index: number; confirmedAt: number; price: number }

/**
 * Pivot highs/lows: a bar whose high (low) is the extreme of the `k` bars on each side. A pivot at index j can only
 * be known at index j + k, so `confirmedAt` is what makes the levels usable without look-ahead.
 */
export function swings(candles: Candle[], k = 5): { highs: Swing[]; lows: Swing[] } {
  const highs: Swing[] = [];
  const lows: Swing[] = [];
  for (let j = k; j < candles.length - k; j++) {
    let isHigh = true, isLow = true;
    for (let d = 1; d <= k; d++) {
      if (!(candles[j].high > candles[j - d].high && candles[j].high >= candles[j + d].high)) isHigh = false;
      if (!(candles[j].low < candles[j - d].low && candles[j].low <= candles[j + d].low)) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push({ index: j, confirmedAt: j + k, price: candles[j].high });
    if (isLow) lows.push({ index: j, confirmedAt: j + k, price: candles[j].low });
  }
  return { highs, lows };
}

/** Nearest confirmed resistance above and support below `price` as known at bar `i`, plus the latest swing low. */
export function levelsAt(sw: { highs: Swing[]; lows: Swing[] }, i: number, price: number, lookbackBars = 250) {
  const recent = (list: Swing[]) => list.filter((s) => s.confirmedAt <= i && s.index >= i - lookbackBars);
  const hs = recent(sw.highs);
  const ls = recent(sw.lows);
  const above = hs.filter((s) => s.price > price).map((s) => s.price);
  const below = ls.filter((s) => s.price < price).map((s) => s.price);
  return {
    resistance: above.length ? Math.min(...above) : null,
    support: below.length ? Math.max(...below) : null,
    swingLow: ls.length ? ls[ls.length - 1].price : null,
  };
}

/**
 * Relative strength: the stock's return over `lookback` bars minus the benchmark's, in percentage points.
 * The benchmark is matched by date (carrying its last known close over gaps) so mismatched calendars cannot shift it.
 */
export function relativeStrength(candles: Candle[], bench: Candle[], lookback = 63): Series {
  const out = nulls(candles.length);
  if (bench.length === 0) return out;
  const benchClose: number[] = [];
  let b = 0;
  let last: number | null = null;
  for (const c of candles) {
    while (b < bench.length && bench[b].date <= c.date) { last = bench[b].close; b++; }
    benchClose.push(last ?? NaN);
  }
  for (let i = lookback; i < candles.length; i++) {
    const b0 = benchClose[i - lookback], b1 = benchClose[i];
    if (Number.isNaN(b0) || Number.isNaN(b1) || b0 <= 0 || candles[i - lookback].close <= 0) continue;
    out[i] = (candles[i].close / candles[i - lookback].close - 1) * 100 - (b1 / b0 - 1) * 100;
  }
  return out;
}

/** True if series a crossed above b at index i. */
export const crossedAbove = (a: Series, b: Series, i: number) => i > 0 && a[i] !== null && b[i] !== null && a[i - 1] !== null && b[i - 1] !== null && (a[i - 1] as number) <= (b[i - 1] as number) && (a[i] as number) > (b[i] as number);
/** True if series a crossed below b at index i. */
export const crossedBelow = (a: Series, b: Series, i: number) => i > 0 && a[i] !== null && b[i] !== null && a[i - 1] !== null && b[i - 1] !== null && (a[i - 1] as number) >= (b[i - 1] as number) && (a[i] as number) < (b[i] as number);

/** Every indicator series for a candle history, computed once. */
export interface IndicatorSet {
  closes: number[];
  sma20: Series; sma50: Series; sma200: Series; ema20: Series; ema50: Series; ema200: Series;
  rsi: Series; macd: MacdResult; bb: BollingerResult; atr: Series; adx: AdxResult;
  volumeRatio: Series; avgTradedValue: Series; high52: Series; low52: Series;
  swings: { highs: Swing[]; lows: Swing[] };
  relStrength: Series;
}

export function computeIndicators(candles: Candle[], bench: Candle[] = [], opts: { swingStrength?: number; relStrengthLookback?: number; avgTradedValueDays?: number } = {}): IndicatorSet {
  const closes = candles.map((c) => c.close);
  const ex = rollingExtremes(candles, 252);
  return {
    closes,
    sma20: sma(closes, 20), sma50: sma(closes, 50), sma200: sma(closes, 200),
    ema20: ema(closes, 20), ema50: ema(closes, 50), ema200: ema(closes, 200),
    rsi: rsi(closes, 14), macd: macd(closes), bb: bollinger(closes, 20, 2), atr: atr(candles, 14), adx: adx(candles, 14),
    volumeRatio: volumeRatio(candles.map((c) => c.volume), 20),
    avgTradedValue: avgTradedValue(candles, opts.avgTradedValueDays ?? 20),
    high52: ex.high, low52: ex.low,
    swings: swings(candles, opts.swingStrength ?? 5),
    relStrength: relativeStrength(candles, bench, opts.relStrengthLookback ?? 63),
  };
}
