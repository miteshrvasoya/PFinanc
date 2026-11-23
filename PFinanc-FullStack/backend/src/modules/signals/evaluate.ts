import { SignalConfig } from './config.js';
import { assessCandles, DataQuality } from './dataQuality.js';
import { computeIndicators, IndicatorSet } from './indicators.js';
import { labelFor, scoreAt } from './scoring.js';
import { computeTradeLevels } from './tradeLevels.js';
import { Candle, IndicatorSnapshot, ScoreResult, SignalLabel, TradeLevels } from './types.js';

export interface SymbolEvaluation {
  asOf: string;
  snapshot: IndicatorSnapshot;
  score: ScoreResult;
  /** Final label: bearish scores read as AVOID for stocks that are not held. */
  label: SignalLabel;
  levels: TradeLevels | null;
  liquid: boolean;
  quality: DataQuality;
  indicators: IndicatorSet;
}

export type EvaluationResult = { ok: true; evaluation: SymbolEvaluation } | { ok: false; reason: string; quality: DataQuality };

/**
 * One symbol, end to end, from candles to a labelled signal with trade levels. Pure. Symbols whose data cannot be
 * trusted (too short, suspected unadjusted split, suspended) are refused instead of signalled.
 */
export function evaluateSymbol(candles: Candle[], bench: Candle[], cfg: SignalConfig, isHeld: boolean, asOfDate?: string): EvaluationResult {
  const asOf = asOfDate ?? (candles.length ? candles[candles.length - 1].date : '1970-01-01');
  const quality = assessCandles(candles, { maxDailyMove: cfg.rules.maxDailyMove, minCandles: cfg.universe.minCandles, asOfDate: asOf });
  if (!quality.reliable) return { ok: false, reason: quality.notes[0] ?? 'Data unreliable', quality };

  const indicators = computeIndicators(candles, bench, {
    swingStrength: cfg.trade.swingStrength, relStrengthLookback: cfg.rules.relStrengthLookback, avgTradedValueDays: cfg.universe.avgTradedValueDays,
  });
  const i = candles.length - 1;
  const { snapshot, result } = scoreAt(candles, indicators, i, cfg);
  const label = labelFor(result.label, isHeld);
  const wantsLevels = label === 'STRONG_BUY' || label === 'BUY' || label === 'WATCH';
  const levels = wantsLevels ? computeTradeLevels(snapshot, cfg) : null;
  const liquid = snapshot.avgTradedValue20 !== null && snapshot.avgTradedValue20 >= cfg.universe.minAvgTradedValue && quality.zeroVolumeShare <= 0.2;
  return { ok: true, evaluation: { asOf: candles[i].date, snapshot, score: result, label, levels, liquid, quality, indicators } };
}
