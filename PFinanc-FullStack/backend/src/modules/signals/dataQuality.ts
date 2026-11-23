import { Candle } from './types.js';

export interface DataQuality {
  reliable: boolean;
  notes: string[];
  candleCount: number;
  lastDate: string | null;
  /** Share of the last 60 bars with zero volume. */
  zeroVolumeShare: number;
}

const DAY = 86_400_000;

/**
 * Decide whether a candle history is fit to signal on. Candles are not split/bonus adjusted, so a corporate
 * action shows up as a one-day jump that would wreck every moving average; rather than guess, such symbols are
 * flagged "data unreliable" and get no signal. Pure function.
 */
export function assessCandles(candles: Candle[], opts: { maxDailyMove: number; minCandles: number; asOfDate: string; staleDays?: number; recentBars?: number }): DataQuality {
  const notes: string[] = [];
  let reliable = true;
  const n = candles.length;
  const recentBars = opts.recentBars ?? 260;
  const lastDate = n ? candles[n - 1].date : null;

  if (n < opts.minCandles) {
    reliable = false;
    notes.push(`Only ${n} daily candles; at least ${opts.minCandles} are needed (new listing or missing history)`);
  }

  for (const c of candles) {
    if (!(c.close > 0) || !(c.open > 0) || !(c.high > 0) || !(c.low > 0) || c.high < c.low || Number.isNaN(c.volume)) {
      reliable = false;
      notes.push(`Invalid candle on ${c.date}`);
      break;
    }
  }

  for (let i = 1; i < n; i++) {
    const move = candles[i].close / candles[i - 1].close - 1;
    if (Math.abs(move) > opts.maxDailyMove) {
      const pct = (move * 100).toFixed(1);
      if (i >= n - recentBars) {
        reliable = false;
        notes.push(`Possible split or bonus on ${candles[i].date} (${pct}% in one day): prices look unadjusted`);
      } else {
        notes.push(`Older one-day move of ${pct}% on ${candles[i].date} (outside the last ${recentBars} bars, so ignored)`);
      }
    }
  }

  if (lastDate) {
    const gapDays = (Date.parse(`${opts.asOfDate}T00:00:00Z`) - Date.parse(`${lastDate}T00:00:00Z`)) / DAY;
    if (gapDays > (opts.staleDays ?? 7)) {
      reliable = false;
      notes.push(`No candles since ${lastDate}: the stock may be suspended or delisted`);
    }
  }

  const recent = candles.slice(-60);
  const zeroVolumeShare = recent.length ? recent.filter((c) => c.volume === 0).length / recent.length : 0;
  if (zeroVolumeShare > 0.2) notes.push(`${Math.round(zeroVolumeShare * 100)}% of recent days had no volume: very thinly traded`);

  return { reliable, notes, candleCount: n, lastDate, zeroVolumeShare };
}
