import { SignalConfig } from './config.js';
import { Candle, IndicatorSnapshot, ScoreResult, SignalLabel } from './types.js';

export interface HoldingInput {
  quantity: number;
  averageCost: number;
  /** Buy lots as {date, quantity}; empty when history is unknown (broker snapshot). */
  lots: Array<{ date: string; quantity: number }>;
}

export interface HoldingAdvice {
  label: SignalLabel;                  // HOLD, REDUCE or SELL for a holding (BUY-side scores read as HOLD)
  reasons: string[];
  trailingStop: number | null;
  trailingStopHit: boolean;
  highestClose: number | null;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  longTermNotes: string[];
}

const DAY = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const dayNumber = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / DAY);

/**
 * Advice for something you already own: a trailing stop (a multiple of ATR below the highest close since you bought,
 * or over the last 60 bars when the buy date is unknown), REDUCE/SELL reasoning, your P&L, and a prompt when units are
 * about to cross the 12-month long-term threshold. The tax note is only a reminder to check, never tax advice.
 */
export function adviseHolding(snapshot: IndicatorSnapshot, score: ScoreResult, candles: Candle[], holding: HoldingInput, cfg: SignalConfig, asOfDate: string): HoldingAdvice {
  const h = cfg.holdings;
  const reasons: string[] = [];
  const close = snapshot.close;
  const pnl = (close - holding.averageCost) * holding.quantity;
  const pnlPct = holding.averageCost > 0 ? (close / holding.averageCost - 1) * 100 : 0;

  // Highest close since the first buy (or the last 60 bars when unknown).
  const first = holding.lots.length ? holding.lots.map((l) => l.date).sort()[0] : null;
  const window = first ? candles.filter((c) => c.date >= first) : candles.slice(-60);
  const highestClose = window.length ? Math.max(...window.map((c) => c.close)) : null;
  const trailingStop = highestClose !== null && snapshot.atr ? r2(highestClose - h.trailingAtrMultiple * snapshot.atr) : null;
  const trailingStopHit = trailingStop !== null && close < trailingStop;

  let label: SignalLabel = score.label === 'SELL' ? 'SELL' : score.label === 'REDUCE' ? 'REDUCE' : 'HOLD';
  if (trailingStopHit) {
    reasons.push(`Price ${close.toFixed(2)} is below the trailing stop ${trailingStop!.toFixed(2)} (${h.trailingAtrMultiple} x ATR under the highest close ${highestClose!.toFixed(2)})`);
    if (label === 'HOLD') label = 'REDUCE';
    if (snapshot.sma200 !== null && close < snapshot.sma200) label = 'SELL';
  } else if (trailingStop !== null) {
    reasons.push(`Trailing stop at ${trailingStop.toFixed(2)} (${h.trailingAtrMultiple} x ATR below the highest close ${highestClose!.toFixed(2)})`);
  }
  if (label === 'HOLD' && (score.label === 'BUY' || score.label === 'STRONG_BUY')) reasons.push('Trend and momentum are supportive: holding is consistent with the signal');

  // 12-month threshold prompt.
  const longTermNotes: string[] = [];
  const today = dayNumber(asOfDate);
  let soonQty = 0;
  let soonDays: number | null = null;
  for (const lot of holding.lots) {
    const age = today - dayNumber(lot.date);
    const left = h.longTermDays - age;
    if (left > 0 && left <= h.longTermWarnDays) { soonQty += lot.quantity; soonDays = soonDays === null ? left : Math.min(soonDays, left); }
  }
  if (soonQty > 0 && soonDays !== null) {
    longTermNotes.push(`${soonQty} units pass the 12-month mark in about ${soonDays} days. Tax treatment can differ before and after that date, so check the impact before selling.`);
  }

  return { label, reasons, trailingStop, trailingStopHit, highestClose, unrealizedPnl: r2(pnl), unrealizedPnlPct: r2(pnlPct), longTermNotes };
}
