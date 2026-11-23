import { Candle } from '../../src/modules/signals/types.js';

/** Small deterministic PRNG so fixtures are identical on every run and machine. */
export function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Weekday dates starting at `start`. */
export function tradingDays(n: number, start = '2022-01-03'): string[] {
  const out: string[] = [];
  for (let d = new Date(`${start}T00:00:00Z`); out.length < n; d = new Date(d.getTime() + 86_400_000)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(ymd(d));
  }
  return out;
}

/** Random-walk candles with drift (per-day fraction) and volatility. */
export function walkCandles(n: number, opts: { seed?: number; start?: number; drift?: number; vol?: number; volume?: number; startDate?: string } = {}): Candle[] {
  const rnd = lcg(opts.seed ?? 1);
  const days = tradingDays(n, opts.startDate);
  let price = opts.start ?? 100;
  return days.map((date) => {
    const open = price;
    const ret = (opts.drift ?? 0) + ((rnd() - 0.5) * 2) * (opts.vol ?? 0.012);
    const close = Math.max(1, open * (1 + ret));
    const high = Math.max(open, close) * (1 + rnd() * 0.006);
    const low = Math.min(open, close) * (1 - rnd() * 0.006);
    price = close;
    return { date, open, high, low, close, volume: Math.round((opts.volume ?? 1_000_000) * (0.7 + rnd() * 0.6)) };
  });
}

/** Candles from a list of closes (flat bars: open = previous close, tiny range). */
export function fromCloses(closes: number[], startDate = '2022-01-03'): Candle[] {
  const days = tradingDays(closes.length, startDate);
  return closes.map((c, i) => ({ date: days[i], open: i ? closes[i - 1] : c, high: Math.max(c, i ? closes[i - 1] : c) + 0.5, low: Math.min(c, i ? closes[i - 1] : c) - 0.5, close: c, volume: 1_000_000 }));
}
