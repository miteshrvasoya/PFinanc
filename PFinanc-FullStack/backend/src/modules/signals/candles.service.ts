import { QueryHelper } from '../../database/queryHelper.js';
import { AngelOneClient } from '../angelone/angelOneClient.js';
import { istDate } from '../angelone/angelOneProvider.js';
import { ensureInstrumentMaster, resolveInstruments } from '../angelone/instruments.js';
import { assessCandles } from './dataQuality.js';
import { SignalConfig } from './config.js';
import { Candle } from './types.js';

/** Nifty 50 index on NSE (token from the SmartAPI documentation's historical-data example). Used for relative strength. */
export const BENCHMARK = { exchange: 'NSE' as const, token: '99926000', symbol: 'NIFTY 50' };

export interface Target { exchange: 'NSE' | 'BSE'; token: string; symbol: string }

const DAY = 86_400_000;
const MAX_DAYS_PER_REQUEST = 1900; // documented limit for daily candles is 2000 days
export const DEFAULT_BACKFILL_DAYS = 900; // roughly 620 trading days: enough for the 200 SMA plus a 250-bar minimum

/** NSE closes at 15:30 IST; treat a day as complete from 15:45 so the daily candle is final. */
export function isSessionComplete(date: string, now: Date = new Date()): boolean {
  const today = istDate(now);
  if (date < today) return true;
  if (date > today) return false;
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return hm >= '15:45';
}

/** Split [from, to] into windows no longer than `maxDays`. */
export function chunkRange(from: Date, to: Date, maxDays = MAX_DAYS_PER_REQUEST): Array<[Date, Date]> {
  const out: Array<[Date, Date]> = [];
  let start = from;
  while (start < to) {
    const end = new Date(Math.min(start.getTime() + maxDays * DAY, to.getTime()));
    out.push([start, end]);
    start = new Date(end.getTime() + DAY);
  }
  return out;
}

const stamp = (d: Date, time: string) => `${istDate(d)} ${time}`;

export async function loadCandles(t: Pick<Target, 'exchange' | 'token'>, limit = 1500): Promise<Candle[]> {
  const rows = await QueryHelper.query<{ d: string; o: number; h: number; l: number; c: number; v: string }>(
    `SELECT * FROM (
       SELECT to_char(trade_date, 'YYYY-MM-DD') AS d, CAST(open AS FLOAT) AS o, CAST(high AS FLOAT) AS h, CAST(low AS FLOAT) AS l, CAST(close AS FLOAT) AS c, volume::text AS v, trade_date
       FROM candles WHERE exchange = $1 AND token = $2 ORDER BY trade_date DESC LIMIT $3
     ) x ORDER BY trade_date ASC`,
    [t.exchange, t.token, limit]
  );
  return rows.map((r) => ({ date: r.d, open: r.o, high: r.h, low: r.l, close: r.c, volume: Number(r.v) }));
}

/**
 * Bring the stored candles for one instrument up to date. The first call backfills; later calls fetch only from a few
 * days before the last stored candle (so corrections to recent bars are picked up) and upsert, so it is idempotent.
 * Throws on API failure; the caller decides whether one bad symbol should stop the run (it must not).
 */
export async function syncCandles(t: Target, cfg: Pick<SignalConfig, 'rules' | 'universe'>, opts: { backfillDays?: number; now?: Date } = {}): Promise<{ fetched: number; lastDate: string | null }> {
  const now = opts.now ?? new Date();
  const state = await QueryHelper.queryOne<{ last_date: string | null }>(
    `SELECT to_char(last_date, 'YYYY-MM-DD') AS last_date FROM candle_sync_state WHERE exchange = $1 AND token = $2`, [t.exchange, t.token]
  );
  const from = state?.last_date ? new Date(Date.parse(`${state.last_date}T00:00:00Z`) - 5 * DAY) : new Date(now.getTime() - (opts.backfillDays ?? DEFAULT_BACKFILL_DAYS) * DAY);

  const rows: Candle[] = [];
  for (const [a, b] of chunkRange(from, now)) {
    const got = await AngelOneClient.getCandles(t.exchange, t.token, 'ONE_DAY', stamp(a, '09:00'), stamp(b, '23:59'), { patient: true });
    for (const c of got) {
      const date = c.t.slice(0, 10);
      if (isSessionComplete(date, now)) rows.push({ date, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v });
    }
  }

  for (let i = 0; i < rows.length; i += 400) {
    const batch = rows.slice(i, i + 400);
    const values: any[] = [];
    const tuples = batch.map((r, k) => {
      values.push(t.exchange, t.token, t.symbol, r.date, r.open, r.high, r.low, r.close, Math.round(r.volume));
      const o = k * 9;
      return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9})`;
    });
    await QueryHelper.query(
      `INSERT INTO candles (exchange, token, symbol, trade_date, open, high, low, close, volume) VALUES ${tuples.join(',')}
       ON CONFLICT (exchange, token, trade_date) DO UPDATE SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume`,
      values
    );
  }

  const stored = await loadCandles(t);
  const quality = assessCandles(stored, { maxDailyMove: cfg.rules.maxDailyMove, minCandles: cfg.universe.minCandles, asOfDate: istDate(now) });
  await QueryHelper.query(
    `INSERT INTO candle_sync_state (exchange, token, symbol, last_date, candle_count, data_reliable, data_notes, fetched_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     ON CONFLICT (exchange, token) DO UPDATE SET symbol = EXCLUDED.symbol, last_date = EXCLUDED.last_date, candle_count = EXCLUDED.candle_count,
       data_reliable = EXCLUDED.data_reliable, data_notes = EXCLUDED.data_notes, fetched_at = NOW()`,
    [t.exchange, t.token, t.symbol, quality.lastDate, quality.candleCount, quality.reliable, JSON.stringify(quality.notes)]
  );
  return { fetched: rows.length, lastDate: quality.lastDate };
}

/** Map a PFinanc/watchlist symbol to its Angel One instrument. */
export async function resolveTarget(symbol: string, exchange: 'NSE' | 'BSE' = 'NSE'): Promise<Target | null> {
  await ensureInstrumentMaster();
  const r = (await resolveInstruments([{ id: symbol, symbol, exchange }])).get(symbol);
  return r ? { exchange: r.exchange, token: r.token, symbol: r.tradingSymbol } : null;
}
