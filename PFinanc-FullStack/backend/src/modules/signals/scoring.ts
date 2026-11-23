import { SignalConfig } from './config.js';
import { IndicatorSet, crossedAbove, crossedBelow, levelsAt } from './indicators.js';
import { Candle, IndicatorSnapshot, LABEL_TEXT, ScoreResult, SignalLabel } from './types.js';

/**
 * Turns indicator values at one bar into a score from -100 (strong sell) to +100 (strong buy), a label, a
 * confidence and human-readable reasons. Pure and deterministic: no I/O, no clock, no randomness. Weights and
 * thresholds come from the config, never from this file.
 */

const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
const fmt = (n: number, d = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const LABEL_RANK: Record<SignalLabel, number> = { STRONG_BUY: 6, BUY: 5, WATCH: 4, HOLD: 3, REDUCE: 2, SELL: 1, AVOID: 0 };

/** Everything the rules look at, read off the precomputed series at bar i. */
export function snapshotAt(candles: Candle[], ind: IndicatorSet, i: number, cfg: SignalConfig): IndicatorSnapshot {
  const c = candles[i];
  const at = <T>(s: Array<T | null>, k = i) => (k >= 0 ? s[k] : null);
  const w = cfg.rules.crossWindow;
  const anyRecent = (f: (k: number) => boolean) => { for (let k = Math.max(1, i - w + 1); k <= i; k++) if (f(k)) return true; return false; };

  const sma50 = at(ind.sma50), sma50Then = at(ind.sma50, i - 10);
  const atrV = at(ind.atr);
  const ema20 = at(ind.ema20);

  // Break of the prior N-bar range (looking only backwards), the standard "breakout above resistance / below support".
  const lb = cfg.rules.breakoutLookback;
  let priorHigh = -Infinity, priorLow = Infinity;
  for (let k = Math.max(0, i - lb); k < i; k++) { priorHigh = Math.max(priorHigh, candles[k].high); priorLow = Math.min(priorLow, candles[k].low); }
  const haveRange = i >= lb;

  const lv = levelsAt(ind.swings, i, c.close);
  const h52 = at(ind.high52);

  return {
    close: c.close,
    sma20: at(ind.sma20), sma50, sma200: at(ind.sma200), ema20, ema50: at(ind.ema50), ema200: at(ind.ema200),
    sma50Slope: sma50 !== null && sma50Then !== null && sma50Then > 0 ? (sma50 / sma50Then - 1) * 100 : null,
    rsi: at(ind.rsi), rsiPrev: at(ind.rsi, i - 1),
    macd: at(ind.macd.macd), macdSignal: at(ind.macd.signal), macdHist: at(ind.macd.hist), macdHistPrev: at(ind.macd.hist, i - 1),
    bbUpper: at(ind.bb.upper), bbMiddle: at(ind.bb.middle), bbLower: at(ind.bb.lower), bbPercentB: at(ind.bb.percentB),
    atr: atrV,
    adx: at(ind.adx.adx), plusDi: at(ind.adx.plusDi), minusDi: at(ind.adx.minusDi),
    volumeRatio: at(ind.volumeRatio),
    avgTradedValue20: at(ind.avgTradedValue),
    high52: h52, low52: at(ind.low52), pctFromHigh52: h52 ? (c.close / h52 - 1) * 100 : null,
    support: lv.support, resistance: lv.resistance, swingLow: lv.swingLow,
    relStrength: at(ind.relStrength),
    goldenCross: anyRecent((k) => crossedAbove(ind.sma50, ind.sma200, k)),
    deathCross: anyRecent((k) => crossedBelow(ind.sma50, ind.sma200, k)),
    macdBullCross: anyRecent((k) => crossedAbove(ind.macd.macd, ind.macd.signal, k)),
    macdBearCross: anyRecent((k) => crossedBelow(ind.macd.macd, ind.macd.signal, k)),
    breakout: haveRange && c.close > priorHigh,
    breakdown: haveRange && c.close < priorLow,
    extendedAtr: ema20 !== null && atrV ? (c.close - ema20) / atrV : null,
  };
}

/** Rule-based bearish divergence: price at a fresh 20-bar high while RSI is clearly below its earlier peak. */
function bearishDivergence(candles: Candle[], ind: IndicatorSet, i: number): boolean {
  if (i < 40 || ind.rsi[i] === null) return false;
  let hi = -Infinity, rsiAtHi = 0, rsiPeak = -Infinity;
  for (let k = i - 20; k < i; k++) {
    if (candles[k].close > hi) { hi = candles[k].close; rsiAtHi = (ind.rsi[k] as number) ?? 0; }
    rsiPeak = Math.max(rsiPeak, (ind.rsi[k] as number) ?? -Infinity);
  }
  return candles[i].close >= hi && (ind.rsi[i] as number) < Math.max(rsiAtHi, rsiPeak) - 5;
}

export function scoreSnapshot(s: IndicatorSnapshot, cfg: SignalConfig, ctx: { divergence?: boolean; candleCount?: number; upDay?: boolean } = {}): ScoreResult {
  const r = cfg.rules;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const comp: Record<string, number> = { trend: 0, momentum: 0, macd: 0, volume: 0, breakout: 0, strength: 0, relativeStrength: 0 };

  // ── Trend ──
  // Ties (price exactly on an average) are neutral, not bearish.
  if (s.sma200 !== null && s.close !== s.sma200) {
    if (s.close > s.sma200) { comp.trend += 0.35; reasons.push(`Price above 200 SMA (${inr(s.sma200)})`); }
    else { comp.trend -= 0.35; reasons.push(`Price below 200 SMA (${inr(s.sma200)})`); }
  }
  if (s.sma50 !== null && s.sma200 !== null && s.sma50 !== s.sma200) comp.trend += s.sma50 > s.sma200 ? 0.2 : -0.2;
  if (s.sma50Slope !== null) {
    if (s.sma50Slope > 0.3) { comp.trend += 0.2; reasons.push(`50 SMA rising (${s.sma50Slope >= 0 ? '+' : ''}${fmt(s.sma50Slope)}% over 10 days)`); }
    else if (s.sma50Slope < -0.3) { comp.trend -= 0.2; reasons.push(`50 SMA falling (${fmt(s.sma50Slope)}% over 10 days)`); }
  }
  if (s.sma50 !== null && s.close !== s.sma50) comp.trend += s.close > s.sma50 ? 0.15 : -0.15;
  if (s.goldenCross) { comp.trend += 0.1; reasons.push(`Golden cross: 50 SMA crossed above 200 SMA within ${r.crossWindow} days`); }
  if (s.deathCross) { comp.trend -= 0.1; reasons.push(`Death cross: 50 SMA crossed below 200 SMA within ${r.crossWindow} days`); }

  // ── Momentum (RSI) ──
  const rising = s.rsi !== null && s.rsiPrev !== null && s.rsi > s.rsiPrev;
  if (s.rsi !== null) {
    const rs = fmt(s.rsi, 0);
    if (s.rsi >= r.rsiOverbought) {
      comp.momentum = ctx.divergence ? -0.9 : -0.6;
      reasons.push(ctx.divergence ? `RSI ${rs} (overbought) with bearish divergence` : `RSI ${rs}: overbought`);
    } else if (s.rsi >= r.rsiRecoveryLow && s.rsi <= r.rsiRecoveryHigh && rising) {
      comp.momentum = 0.8; reasons.push(`RSI ${rs} and rising: recovering from the ${r.rsiRecoveryLow}-${r.rsiRecoveryHigh} zone`);
    } else if (s.rsi > r.rsiRecoveryHigh && s.rsi < r.rsiOverbought && rising) {
      comp.momentum = 0.5; reasons.push(`RSI ${rs} and rising`);
    } else if (s.rsi < 50 && s.sma200 !== null && s.close < s.sma200) {
      comp.momentum = -0.6; reasons.push(`RSI ${rs}, below 50 in a downtrend`);
    } else {
      comp.momentum = clamp(((s.rsi - 50) / 50) * 0.5);
      if (s.rsi < 30) reasons.push(`RSI ${rs}: oversold, but no reversal confirmed`);
    }
  }

  // ── MACD ──
  if (s.macd !== null && s.macdSignal !== null && s.macdHist !== null) {
    const histRising = s.macdHistPrev !== null && s.macdHist > s.macdHistPrev;
    if (s.macdBullCross && s.macd > 0) { comp.macd = 1; reasons.push('MACD bullish cross above zero'); }
    else if (s.macdBullCross) { comp.macd = 0.5; reasons.push('MACD bullish cross (still below zero)'); }
    else if (s.macdBearCross) { comp.macd = s.macd < 0 ? -1 : -0.6; reasons.push('MACD bearish cross'); }
    else if (s.macdHist > 0) comp.macd = histRising ? 0.4 : 0.1;
    else if (s.macdHist < 0) comp.macd = histRising ? -0.1 : -0.4;
  }

  // ── Volume ──
  if (s.volumeRatio !== null) {
    const vr = fmt(s.volumeRatio);
    if (s.breakout && s.volumeRatio >= r.volumeBreakoutRatio) { comp.volume = 1; reasons.push(`Volume ${vr}x average on a breakout`); }
    else if (s.breakdown && s.volumeRatio >= r.volumeBreakoutRatio) { comp.volume = -1; reasons.push(`Volume ${vr}x average on a breakdown`); }
    else if (s.volumeRatio >= r.volumeBreakoutRatio) { comp.volume = ctx.upDay === false ? -0.5 : 0.5; reasons.push(`Volume ${vr}x average on ${ctx.upDay === false ? 'a down' : 'an up'} day`); }
  }

  // ── Breakout / breakdown ──
  if (s.breakout) { comp.breakout = 0.8; reasons.push(`Closed above the prior ${r.breakoutLookback}-day high (breakout)`); }
  else if (s.breakdown) { comp.breakout = -0.8; reasons.push(`Closed below the prior ${r.breakoutLookback}-day low (breakdown)`); }

  // ── Trend strength (ADX) ──
  if (s.adx !== null && s.plusDi !== null && s.minusDi !== null) {
    if (s.adx >= r.adxMin) {
      const mag = clamp(0.3 + (s.adx - r.adxMin) / 25, 0, 1);
      comp.strength = s.plusDi >= s.minusDi ? mag : -mag;
      reasons.push(`ADX ${fmt(s.adx, 0)}: ${s.plusDi >= s.minusDi ? 'strong uptrend' : 'strong downtrend'}`);
    } else warnings.push(`ADX ${fmt(s.adx, 0)} is below ${r.adxMin}: no clear trend`);
  }

  // ── Relative strength vs Nifty 50 ──
  if (s.relStrength !== null) {
    comp.relativeStrength = clamp(s.relStrength / 20);
    reasons.push(`${s.relStrength >= 0 ? 'Outperforming' : 'Lagging'} Nifty 50 by ${fmt(Math.abs(s.relStrength))} points over ${Math.round(r.relStrengthLookback / 21)} months`);
  } else warnings.push('Relative strength vs Nifty 50 unavailable');

  // ── Combine ──
  const w = cfg.weights;
  const wTotal = Object.values(w).reduce((a, b) => a + b, 0);
  const weighted = Object.keys(comp).map((k) => ({ k, v: (w as any)[k] * comp[k] }));
  const score = Math.round(clamp(weighted.reduce((a, x) => a + x.v, 0) / wTotal) * 1000) / 10;

  // ── Trend gate: BUY needs the long-term trend on side, or a confirmed reversal ──
  const aboveTrend = s.sma200 !== null && s.close > s.sma200 && s.sma50Slope !== null && s.sma50Slope > 0;
  const reversal = s.goldenCross || (s.sma50 !== null && s.close > s.sma50 && s.macdBullCross && s.rsi !== null && s.rsi >= 50 && rising && (s.relStrength ?? 0) > 0);
  const trendOk = aboveTrend || reversal;

  const t = cfg.thresholds;
  let label: SignalLabel =
    score >= t.strongBuy ? 'STRONG_BUY' : score >= t.buy ? 'BUY' : score >= t.watch ? 'WATCH' : score > t.hold ? 'HOLD' : score > t.reduce ? 'REDUCE' : 'SELL';
  if ((label === 'STRONG_BUY' || label === 'BUY') && !trendOk) {
    label = 'WATCH';
    warnings.push('Trend filter: BUY needs price above a rising 200-day trend (or a confirmed reversal), so this is capped at WATCH');
  }
  // Hard bearish triggers cap the label even when the blended score is middling.
  const bearTrigger = (s.sma200 !== null && s.close < s.sma200 && s.deathCross) || (s.breakdown && (s.volumeRatio ?? 0) >= r.volumeBreakoutRatio);
  if (bearTrigger && LABEL_RANK[label] > LABEL_RANK.REDUCE) { label = 'REDUCE'; reasons.push('Bearish trigger: death cross below the 200 SMA or a high-volume breakdown'); }

  // ── Confidence: lower when indicators disagree or data is thin ──
  const aligned = weighted.filter((x) => Math.sign(x.v) === Math.sign(score) && x.v !== 0).reduce((a, x) => a + Math.abs(x.v), 0);
  const total = weighted.reduce((a, x) => a + Math.abs(x.v), 0);
  const agreement = total > 0 ? aligned / total : 0.5;
  const present = [s.sma200, s.sma50, s.rsi, s.macd, s.adx, s.volumeRatio, s.relStrength, s.atr].filter((v) => v !== null).length / 8;
  let confidence = 0.2 + 0.6 * agreement + 0.2 * present;
  if (Math.abs(score) < 15) confidence *= 0.8;
  if (ctx.candleCount !== undefined && ctx.candleCount < 300) confidence *= 0.9;
  confidence = Math.round(clamp(confidence, 0, 1) * 100) / 100;
  if (agreement < 0.6) warnings.push('Indicators disagree with each other: lower confidence');

  return { score, label, confidence, reasons, components: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, Math.round(v * 100) / 100])), trendOk, warnings };
}

/** Score the bar at index i of a candle history. */
export function scoreAt(candles: Candle[], ind: IndicatorSet, i: number, cfg: SignalConfig) {
  const snapshot = snapshotAt(candles, ind, i, cfg);
  const result = scoreSnapshot(snapshot, cfg, { divergence: bearishDivergence(candles, ind, i), candleCount: i + 1, upDay: candles[i].close >= candles[i].open });
  return { snapshot, result };
}

/** A bearish stock you do not own is "AVOID"; the same score on a holding is REDUCE or SELL. */
export function labelFor(label: SignalLabel, isHeld: boolean): SignalLabel {
  return !isHeld && (label === 'REDUCE' || label === 'SELL') ? 'AVOID' : label;
}

export const labelText = (l: SignalLabel) => LABEL_TEXT[l];
export const isBuy = (l: SignalLabel) => l === 'STRONG_BUY' || l === 'BUY';
