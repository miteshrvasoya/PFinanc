import { SignalConfig } from './config.js';
import { IndicatorSnapshot, PositionSize, TradeLevels } from './types.js';

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Entry zone, stop-loss and targets for a BUY or WATCH setup. Pure maths over the indicator snapshot.
 *  - Entry zone sits at or just below the last close, never above it; when price is stretched far above the 20 EMA
 *    the zone moves down to the EMA (wait for a pullback) and the setup is flagged `extended`.
 *  - Stop: entry minus k x ATR, or just under the latest swing low when that is tighter but still at least
 *    0.75 ATR away (so a stop is never absurdly close). Stops wider than `maxStopAtr` are pulled in.
 *  - Targets: T1 and T2 at configurable multiples of the risk, with T2 pulled down to the next resistance if that
 *    lies between 1R and T2. The setup is rejected when reward:risk to T2 is below the configured minimum.
 */
export function computeTradeLevels(s: IndicatorSnapshot, cfg: SignalConfig): TradeLevels | null {
  const t = cfg.trade;
  if (!s.atr || s.atr <= 0) return null;
  const atr = s.atr;

  const extended = s.extendedAtr !== null && s.extendedAtr > cfg.rules.extendedAtr;
  let entryHigh: number;
  let entryLow: number;
  if (extended && s.ema20 !== null) {
    entryLow = s.ema20;
    entryHigh = s.ema20 + t.entryPullbackAtr * atr;
  } else {
    entryHigh = s.close;
    entryLow = s.close - t.entryPullbackAtr * atr;
  }

  const atrStop = entryHigh - t.atrStopMultiple * atr;
  let stop = atrStop;
  if (s.swingLow !== null) {
    const swingStop = s.swingLow - 0.1 * atr;
    const distance = entryHigh - swingStop;
    if (swingStop > atrStop && distance >= 0.75 * atr) stop = swingStop; // tighter, but not unreasonably close
  }
  const maxRisk = t.maxStopAtr * atr;
  if (entryHigh - stop > maxRisk) stop = entryHigh - maxRisk;
  if (stop >= entryLow) stop = entryLow - 0.25 * atr; // the stop must sit below the whole entry zone

  const risk = entryHigh - stop; // worst case: you fill at the top of the zone
  if (risk <= 0) return null;
  const target1 = entryHigh + t.target1R * risk;
  let target2 = entryHigh + t.target2R * risk;
  if (s.resistance !== null && s.resistance > entryHigh + risk && s.resistance < target2) target2 = Math.max(s.resistance, target1);
  const rr = (target2 - entryHigh) / risk;

  const valid = rr >= t.minRiskReward;
  return {
    entryLow: r2(entryLow), entryHigh: r2(entryHigh), stop: r2(stop), target1: r2(target1), target2: r2(target2),
    riskPerShare: r2(risk), riskReward: r2(rr), extended, valid,
    invalidReason: valid ? undefined : `Risk:reward ${r2(rr)} is below the ${t.minRiskReward} minimum`,
  };
}

/**
 * Quantity = (capital x risk%) / (entry - stop), capped so one stock does not exceed the concentration limit.
 * `existingValue` is what is already held in the stock, so adding to a position respects the cap too.
 */
export function positionSize(levels: Pick<TradeLevels, 'entryHigh' | 'stop'>, cfg: SignalConfig, existingValue = 0): PositionSize {
  const risk = levels.entryHigh - levels.stop;
  if (risk <= 0) return { quantity: 0, capitalRequired: 0, riskAmount: 0, cappedByConcentration: false };
  const riskBudget = (cfg.sizing.capital * cfg.sizing.riskPct) / 100;
  let qty = Math.floor(riskBudget / risk);
  const maxValue = (cfg.sizing.capital * cfg.sizing.maxPositionPct) / 100 - existingValue;
  const maxQty = Math.max(0, Math.floor(maxValue / levels.entryHigh));
  const capped = qty > maxQty;
  if (capped) qty = maxQty;
  return { quantity: qty, capitalRequired: r2(qty * levels.entryHigh), riskAmount: r2(qty * risk), cappedByConcentration: capped };
}
