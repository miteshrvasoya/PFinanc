/** Shared types for the advisory Stock Signals feature. Pure data shapes only (no I/O). */

export const DISCLAIMER = 'Educational/technical signals only. Not investment advice. Do your own research.';

export interface Candle {
  /** Trading day, YYYY-MM-DD (India time). */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalLabel = 'STRONG_BUY' | 'BUY' | 'WATCH' | 'HOLD' | 'REDUCE' | 'SELL' | 'AVOID';
export const LABEL_TEXT: Record<SignalLabel, string> = {
  STRONG_BUY: 'STRONG BUY', BUY: 'BUY', WATCH: 'WATCH', HOLD: 'HOLD', REDUCE: 'REDUCE', SELL: 'SELL', AVOID: 'AVOID',
};

export type Series = Array<number | null>;

/** Indicator values at one bar, as used by the scoring engine and stored with each signal. */
export interface IndicatorSnapshot {
  close: number;
  sma20: number | null; sma50: number | null; sma200: number | null;
  ema20: number | null; ema50: number | null; ema200: number | null;
  sma50Slope: number | null;           // % change of the 50 SMA over the last 10 bars
  rsi: number | null; rsiPrev: number | null;
  macd: number | null; macdSignal: number | null; macdHist: number | null; macdHistPrev: number | null;
  bbUpper: number | null; bbMiddle: number | null; bbLower: number | null; bbPercentB: number | null;
  atr: number | null;
  adx: number | null; plusDi: number | null; minusDi: number | null;
  volumeRatio: number | null;          // today's volume / average of the previous 20 days
  avgTradedValue20: number | null;     // 20-day average of close x volume (INR)
  high52: number | null; low52: number | null; pctFromHigh52: number | null;
  support: number | null; resistance: number | null;
  swingLow: number | null;
  relStrength: number | null;          // 3-month return minus Nifty 50's, in percentage points
  goldenCross: boolean; deathCross: boolean;           // 50/200 SMA cross within the recent window
  macdBullCross: boolean; macdBearCross: boolean;      // MACD/signal cross within the recent window
  breakout: boolean; breakdown: boolean;               // close beyond prior resistance/support
  extendedAtr: number | null;          // how many ATRs the close is above the 20 EMA
}

export interface ScoreResult {
  score: number;                       // -100 (strong sell) .. +100 (strong buy)
  label: SignalLabel;
  confidence: number;                  // 0..1
  reasons: string[];
  /** Sub-scores in [-1, 1] before weighting, for transparency. */
  components: Record<string, number>;
  trendOk: boolean;                    // BUY gate: above 200 SMA with a rising 50 SMA, or a confirmed reversal
  warnings: string[];
}

export interface TradeLevels {
  entryLow: number; entryHigh: number;
  stop: number; target1: number; target2: number;
  riskPerShare: number;
  riskReward: number;                  // reward to T2 divided by risk
  extended: boolean;                   // price is stretched above the 20 EMA: do not chase
  valid: boolean;                      // meets the minimum risk:reward
  invalidReason?: string;
}

export interface PositionSize {
  quantity: number;
  capitalRequired: number;
  riskAmount: number;
  cappedByConcentration: boolean;
}
