import { SignalLabel } from './types.js';

/**
 * Every tunable number of the signals engine lives here (defaults) and can be overridden per household in
 * `signal_settings.config`. Nothing in the scoring or trade-level code hardcodes a weight or threshold.
 */
export interface SignalConfig {
  universe: {
    includeHoldings: boolean;
    includeWatchlist: boolean;
    /** Optional preset universe (for example Nifty 100 constituents), edited in settings or imported with the CLI. */
    presetSymbols: string[];
    minCandles: number;
    avgTradedValueDays: number;
    /** Skip buy candidates whose 20-day average traded value (INR) is below this. */
    minAvgTradedValue: number;
  };
  /** Relative importance of each component of the score. Normalised, so only the ratios matter. */
  weights: { trend: number; momentum: number; macd: number; volume: number; breakout: number; strength: number; relativeStrength: number };
  /** Score cut-offs between labels. */
  thresholds: { strongBuy: number; buy: number; watch: number; hold: number; reduce: number; sell: number };
  rules: {
    rsiOverbought: number; rsiRecoveryLow: number; rsiRecoveryHigh: number;
    volumeBreakoutRatio: number; adxMin: number;
    /** A cross counts as "recent" for this many bars. */
    crossWindow: number;
    breakoutLookback: number;
    relStrengthLookback: number;
    /** Do not chase: flag setups whose close is more than this many ATRs above the 20 EMA. */
    extendedAtr: number;
    /** A single-day close-to-close move beyond this fraction suggests an unadjusted split/bonus: data unreliable. */
    maxDailyMove: number;
  };
  trade: {
    atrStopMultiple: number; target1R: number; target2R: number; minRiskReward: number;
    entryPullbackAtr: number; swingStrength: number; maxStopAtr: number;
  };
  sizing: { capital: number; riskPct: number; maxPositionPct: number };
  holdings: { trailingAtrMultiple: number; longTermDays: number; longTermWarnDays: number };
  backtest: {
    initialCapital: number; riskPct: number; maxOpenPositions: number; maxHoldDays: number; scaleOutAtTarget1: boolean;
    costs: { brokeragePct: number; brokerageCapInr: number; sttPct: number; exchangePct: number; stampPct: number; gstPct: number; slippagePct: number };
  };
  alerts: { enabled: boolean };
}

export const DEFAULT_SIGNAL_CONFIG: SignalConfig = {
  universe: { includeHoldings: true, includeWatchlist: true, presetSymbols: [], minCandles: 250, avgTradedValueDays: 20, minAvgTradedValue: 50_000_000 },
  weights: { trend: 0.30, momentum: 0.15, macd: 0.15, volume: 0.08, breakout: 0.10, strength: 0.07, relativeStrength: 0.15 },
  thresholds: { strongBuy: 60, buy: 35, watch: 15, hold: -15, reduce: -35, sell: -60 },
  rules: {
    rsiOverbought: 75, rsiRecoveryLow: 40, rsiRecoveryHigh: 55, volumeBreakoutRatio: 1.5, adxMin: 20,
    crossWindow: 5, breakoutLookback: 20, relStrengthLookback: 63, extendedAtr: 2.5, maxDailyMove: 0.35,
  },
  trade: { atrStopMultiple: 2, target1R: 1.5, target2R: 2.5, minRiskReward: 1.5, entryPullbackAtr: 0.5, swingStrength: 5, maxStopAtr: 3.5 },
  sizing: { capital: 1_000_000, riskPct: 1, maxPositionPct: 10 },
  holdings: { trailingAtrMultiple: 2.5, longTermDays: 365, longTermWarnDays: 45 },
  backtest: {
    initialCapital: 1_000_000, riskPct: 1, maxOpenPositions: 10, maxHoldDays: 60, scaleOutAtTarget1: true,
    // Delivery equity, India: brokerage per side, STT 0.1% on buy and sell, exchange charges, stamp duty on buy, GST on fees.
    costs: { brokeragePct: 0.0003, brokerageCapInr: 20, sttPct: 0.001, exchangePct: 0.0000297, stampPct: 0.00015, gstPct: 0.18, slippagePct: 0.0005 },
  },
  alerts: { enabled: true },
};

type Json = Record<string, any>;

/** Numeric ranges every setting must fall in. Anything outside is rejected rather than silently clamped. */
const RANGES: Record<string, [number, number]> = {
  'universe.minCandles': [60, 2000], 'universe.avgTradedValueDays': [5, 60], 'universe.minAvgTradedValue': [0, 1e12],
  'weights.*': [0, 10],
  'thresholds.*': [-100, 100],
  'rules.rsiOverbought': [50, 100], 'rules.rsiRecoveryLow': [0, 100], 'rules.rsiRecoveryHigh': [0, 100], 'rules.volumeBreakoutRatio': [1, 10], 'rules.adxMin': [5, 60],
  'rules.crossWindow': [1, 20], 'rules.breakoutLookback': [5, 120], 'rules.relStrengthLookback': [20, 252], 'rules.extendedAtr': [0.5, 10], 'rules.maxDailyMove': [0.1, 0.9],
  'trade.atrStopMultiple': [0.5, 6], 'trade.target1R': [0.5, 5], 'trade.target2R': [1, 10], 'trade.minRiskReward': [0.5, 10], 'trade.entryPullbackAtr': [0, 3], 'trade.swingStrength': [2, 15], 'trade.maxStopAtr': [1, 8],
  'sizing.capital': [1000, 1e12], 'sizing.riskPct': [0.05, 10], 'sizing.maxPositionPct': [1, 100],
  'holdings.trailingAtrMultiple': [1, 6], 'holdings.longTermDays': [30, 1500], 'holdings.longTermWarnDays': [1, 180],
  'backtest.initialCapital': [10000, 1e12], 'backtest.riskPct': [0.05, 10], 'backtest.maxOpenPositions': [1, 50], 'backtest.maxHoldDays': [5, 400],
  'backtest.costs.*': [0, 1], 'backtest.costs.brokerageCapInr': [0, 10000],
};

function rangeFor(path: string): [number, number] | undefined {
  if (RANGES[path]) return RANGES[path];
  const parts = path.split('.');
  return RANGES[`${parts.slice(0, -1).join('.')}.*`];
}

/**
 * Deep-merge user overrides onto the defaults. Unknown keys and wrong types throw, so a typo in a settings
 * request fails loudly instead of being ignored.
 */
export function mergeConfig(base: SignalConfig, override: Json | null | undefined, path = ''): SignalConfig {
  if (!override) return base;
  const out: Json = Array.isArray(base) ? [...(base as any)] : { ...(base as Json) };
  for (const [key, value] of Object.entries(override)) {
    const full = path ? `${path}.${key}` : key;
    if (!(key in (base as Json))) throw new Error(`Unknown setting "${full}"`);
    const current = (base as Json)[key];
    if (Array.isArray(current)) {
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || !/^[A-Za-z0-9&_-]{1,30}$/.test(v))) throw new Error(`"${full}" must be a list of symbols`);
      out[key] = Array.from(new Set(value.map((v: string) => v.toUpperCase()))).slice(0, 500);
    } else if (current && typeof current === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`"${full}" must be an object`);
      out[key] = mergeConfig(current, value, full);
    } else if (typeof current === 'boolean') {
      if (typeof value !== 'boolean') throw new Error(`"${full}" must be true or false`);
      out[key] = value;
    } else {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`"${full}" must be a number`);
      const r = rangeFor(full);
      if (r && (value < r[0] || value > r[1])) throw new Error(`"${full}" must be between ${r[0]} and ${r[1]}`);
      out[key] = value;
    }
  }
  return out as SignalConfig;
}

/** Cross-field rules a per-field range cannot express. */
export function validateConfig(c: SignalConfig): void {
  const t = c.thresholds;
  if (!(t.strongBuy > t.buy && t.buy > t.watch && t.watch > t.hold && t.hold > t.reduce && t.reduce > t.sell)) {
    throw new Error('thresholds must descend: strongBuy > buy > watch > hold > reduce > sell');
  }
  if (Object.values(c.weights).reduce((s, w) => s + w, 0) <= 0) throw new Error('At least one weight must be above zero');
  if (c.trade.target2R < c.trade.target1R) throw new Error('trade.target2R must be at least trade.target1R');
  if (c.rules.rsiRecoveryHigh <= c.rules.rsiRecoveryLow) throw new Error('rules.rsiRecoveryHigh must be above rules.rsiRecoveryLow');
}

export const RANKED_BUY_LABELS: SignalLabel[] = ['STRONG_BUY', 'BUY'];
