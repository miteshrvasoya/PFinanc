import { QueryHelper } from '../../../database/queryHelper.js';
import { HoldingsService, SecurityHolding } from '../holdings/holdings.service.js';
import { AngelOneClient, AngelOneError, angelOneConfigured, Candle, CandleInterval, CANDLE_INTERVALS, describeAngelOneError } from '../../angelone/angelOneClient.js';
import { ensureInstrumentMaster, resolveInstruments } from '../../angelone/instruments.js';
import { istDate } from '../../angelone/angelOneProvider.js';

/**
 * Price history for a held security.
 *  - Stocks and ETFs: Angel One candles (when configured). Granularity follows the span: 5-minute candles for a day,
 *    15-minute for a week, hourly for a month, daily beyond that.
 *  - Everything else, or when Angel One is unavailable: the daily prices PFinanc has stored (mutual fund NAVs included).
 * "1D" is the latest trading session, so it works on weekends and holidays too.
 */

export const CHART_RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', 'SINCE_BUY'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];
const RANGE_DAYS: Record<Exclude<ChartRange, '1D' | 'SINCE_BUY'>, number> = { '1W': 7, '1M': 31, '3M': 92, '6M': 183, '1Y': 366 };

export interface ChartPoint { t: string; o: number | null; h: number | null; l: number | null; c: number; v: number | null }

function httpError(status: number, code: string, message: string) {
  const e: any = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

/** Granularity for a span of days (the lowest that stays well inside the documented per-request limits). */
export function intervalForSpan(days: number): CandleInterval {
  if (days <= 1.5) return 'FIVE_MINUTE';
  if (days <= 8) return 'FIFTEEN_MINUTE';
  if (days <= 40) return 'ONE_HOUR';
  return 'ONE_DAY';
}

/** "YYYY-MM-DD HH:mm" in India time, the format getCandleData expects. */
export function istStamp(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// ── tiny TTL cache: protects the 2/s, 40/min, 2000/h candle budget ───────────

const cache = new Map<string, { at: number; points: ChartPoint[] }>();
const ttl = (interval: CandleInterval) => (interval === 'ONE_DAY' ? 10 * 60_000 : 60_000);
export const clearChartCache = () => cache.clear();

export class PriceChartService {
  private static async resolve(householdId: string, userId: string, symbol: string, personal: boolean) {
    const holdings = await HoldingsService.calculateHoldings({ householdId, userId: personal ? userId : undefined });
    const want = symbol.trim().toUpperCase();
    let holding: SecurityHolding | undefined = holdings.find((h) => h.symbol.toUpperCase() === want && h.current_quantity > 0) || holdings.find((h) => h.symbol.toUpperCase() === want);
    let security = holding
      ? { id: holding.security_id, symbol: holding.symbol, name: holding.name, exchange: holding.exchange, security_type: holding.security_type }
      : null;
    if (!security) {
      // Sold or not-yet-priced securities the household has history with are still chartable.
      security = await QueryHelper.queryOne<any>(
        `SELECT s.id, s.symbol, s.name, s.exchange, s.security_type FROM securities s
         WHERE UPPER(s.symbol) = $2 AND (
           EXISTS (SELECT 1 FROM investment_transactions it WHERE it.security_id = s.id AND it.household_id = $1 AND it.status <> 'VOID')
           OR EXISTS (SELECT 1 FROM investment_holdings ih WHERE ih.instrument_id = s.id AND ih.family_id = $1))
         LIMIT 1`,
        [householdId, want]
      );
    }
    if (!security) throw httpError(404, 'SECURITY_NOT_FOUND', `No holding or trade history found for "${symbol}".`);
    return { security, holding };
  }

  /** First purchase date and buy markers: trade history first, then a date the user saved. */
  private static async buyInfo(householdId: string, userId: string, securityId: string, personal: boolean) {
    const params: any[] = [householdId, securityId];
    let owner = '';
    if (personal) { params.push(userId); owner = ` AND a.owner_user_id = $3`; }
    const buys = await QueryHelper.query<{ date: string; quantity: number; price: number }>(
      `SELECT to_char(it.transaction_date, 'YYYY-MM-DD') AS date, CAST(it.quantity AS FLOAT) AS quantity, CAST(it.price_per_unit AS FLOAT) AS price
       FROM investment_transactions it JOIN accounts a ON a.id = it.investment_account_id
       WHERE it.household_id = $1 AND it.security_id = $2 AND it.status = 'CONFIRMED' AND it.transaction_type IN ('BUY', 'SIP')${owner}
       ORDER BY it.transaction_date ASC`,
      params
    );
    if (buys.length) return { buys, firstBuyDate: buys[0].date, source: 'TRADES' as const };

    const saved = await QueryHelper.queryOne<{ d: string }>(
      `SELECT to_char(buy_date, 'YYYY-MM-DD') AS d FROM holding_buy_dates WHERE household_id = $1 AND user_id = $2 AND security_id = $3`,
      [householdId, userId, securityId]
    );
    if (saved) return { buys: [], firstBuyDate: saved.d, source: 'SAVED' as const };
    return { buys: [], firstBuyDate: null, source: null };
  }

  static async setBuyDate(householdId: string, userId: string, symbol: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw httpError(400, 'INVALID_DATE', 'Use a date like 2024-03-15.');
    if (date > istDate()) throw httpError(400, 'FUTURE_DATE', 'The buy date cannot be in the future.');
    if (date < '1990-01-01') throw httpError(400, 'INVALID_DATE', 'That date is too far in the past.');
    const { security } = await this.resolve(householdId, userId, symbol, false); // any holding in the household; the date itself is saved per user
    await QueryHelper.query(
      `INSERT INTO holding_buy_dates (household_id, user_id, security_id, buy_date) VALUES ($1,$2,$3,$4)
       ON CONFLICT (household_id, user_id, security_id) DO UPDATE SET buy_date = EXCLUDED.buy_date, updated_at = NOW()`,
      [householdId, userId, security.id, date]
    );
    return { symbol: security.symbol, buyDate: date };
  }

  static async clearBuyDate(householdId: string, userId: string, symbol: string) {
    const { security } = await this.resolve(householdId, userId, symbol, false); // any holding in the household; the date itself is saved per user
    await QueryHelper.query(`DELETE FROM holding_buy_dates WHERE household_id = $1 AND user_id = $2 AND security_id = $3`, [householdId, userId, security.id]);
  }

  static async getChart(input: { householdId: string; userId: string; symbol: string; range?: string; personal?: boolean }) {
    const range = (input.range || '1D').toUpperCase() as ChartRange;
    if (!CHART_RANGES.includes(range)) throw httpError(400, 'INVALID_RANGE', `range must be one of ${CHART_RANGES.join(', ')}`);
    const personal = input.personal !== false;

    const { security, holding } = await this.resolve(input.householdId, input.userId, input.symbol, personal);
    const buy = await this.buyInfo(input.householdId, input.userId, security.id, personal);

    const now = new Date();
    const notes: string[] = [];
    let from: Date;
    let sinceBuyAvailable = !!buy.firstBuyDate;

    if (range === 'SINCE_BUY') {
      if (!buy.firstBuyDate) {
        throw httpError(400, 'BUY_DATE_UNKNOWN', 'We do not know when you bought this. Set the buy date to see the chart since then.');
      }
      from = new Date(`${buy.firstBuyDate}T09:00:00+05:30`);
      if (from.getTime() > now.getTime()) from = new Date(now.getTime() - 86_400_000);
    } else if (range === '1D') {
      from = new Date(now.getTime() - 5 * 86_400_000); // reach back over a weekend/holiday, then keep only the latest session
    } else {
      from = new Date(now.getTime() - RANGE_DAYS[range] * 86_400_000);
    }

    let spanDays = Math.max(1, (now.getTime() - from.getTime()) / 86_400_000);
    let interval: CandleInterval = range === '1D' ? 'FIVE_MINUTE' : intervalForSpan(spanDays);
    if (interval === 'ONE_DAY' && spanDays > CANDLE_INTERVALS.ONE_DAY) {
      from = new Date(now.getTime() - CANDLE_INTERVALS.ONE_DAY * 86_400_000);
      spanDays = CANDLE_INTERVALS.ONE_DAY;
      notes.push('Showing the most recent 5 years.');
    }

    let points: ChartPoint[] = [];
    let source: 'ANGEL_ONE' | 'STORED_PRICES' = 'STORED_PRICES';

    const eligible = (security.security_type === 'STOCK' || security.security_type === 'ETF') && angelOneConfigured();
    if (eligible) {
      try {
        points = await this.angelCandles(security, interval, from, now);
        if (points.length) source = 'ANGEL_ONE';
      } catch (err) {
        notes.push(describeAngelOneError(err).message);
        if (!(err instanceof AngelOneError)) console.warn('[chart] candle fetch failed:', (err as Error).message);
      }
    } else if (security.security_type === 'MUTUAL_FUND') {
      notes.push('Mutual funds update once a day, so the chart shows daily NAVs.');
    }

    if (range === '1D' && points.length) {
      const lastDay = points[points.length - 1].t.slice(0, 10);
      points = points.filter((p) => p.t.slice(0, 10) === lastDay);
    }

    if (points.length === 0) {
      points = await this.storedPrices(security.id, from, range === '1D');
      if (points.length) {
        source = 'STORED_PRICES';
        interval = 'ONE_DAY';
        if (range === '1D') notes.push('Intraday prices need an Angel One connection, so the last stored prices are shown.');
        else if (eligible) notes.push('Showing stored daily prices instead.');
      } else if (!notes.length) {
        notes.push('No price history is available for this range yet. Prices are stored each time they refresh, so a chart builds up over time.');
      }
    }

    const markers = buy.buys.filter((b) => b.date >= istStampDate(from));
    const summary = summarise(points);
    return {
      symbol: security.symbol,
      name: security.name,
      type: security.security_type,
      range,
      interval,
      source,
      from: istStamp(from).slice(0, 10),
      to: istDate(now),
      currency: 'INR',
      points,
      summary,
      position: holding && holding.current_quantity > 0
        ? { quantity: holding.current_quantity, averageCost: holding.average_cost, currentPrice: holding.current_price, unrealizedPnl: Math.round(holding.unrealized_pnl), unrealizedPnlPct: Number(holding.unrealized_pnl_percent.toFixed(2)) }
        : null,
      buys: markers,
      firstBuyDate: buy.firstBuyDate,
      buyDateSource: buy.source,
      sinceBuyAvailable,
      notes,
    };
  }

  private static async angelCandles(sec: { id: string; symbol: string; exchange: string }, interval: CandleInterval, from: Date, to: Date): Promise<ChartPoint[]> {
    const count = await QueryHelper.queryOne<{ n: string }>(`SELECT COUNT(*)::text AS n FROM angelone_instruments`);
    if (Number(count?.n || 0) === 0) {
      // First use: the symbol list is large, so fetch it in the background and fall back to stored prices this time.
      ensureInstrumentMaster().catch((e) => console.warn('[chart] instrument master download failed:', (e as Error).message));
      throw new AngelOneError('MASTER_LOADING', 'Angel One\'s symbol list is downloading for the first time. Try again in a minute.');
    }
    const resolved = (await resolveInstruments([sec])).get(sec.id);
    if (!resolved) return [];

    const fromStr = istStamp(from);
    const key = `${resolved.exchange}:${resolved.token}:${interval}:${interval === 'ONE_DAY' ? fromStr.slice(0, 10) : fromStr.slice(0, 13)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl(interval)) return hit.points;

    const candles: Candle[] = await AngelOneClient.getCandles(resolved.exchange, resolved.token, interval, fromStr, istStamp(to));
    const points: ChartPoint[] = candles.map((c) => ({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v }));
    if (cache.size > 200) cache.clear();
    cache.set(key, { at: Date.now(), points });
    return points;
  }

  private static async storedPrices(securityId: string, from: Date, lastTwoOnly: boolean): Promise<ChartPoint[]> {
    const rows = await QueryHelper.query<{ d: string; open: number | null; high: number | null; low: number | null; close: number; volume: string | null }>(
      `SELECT to_char(price_date, 'YYYY-MM-DD') AS d, CAST(open AS FLOAT) AS open, CAST(high AS FLOAT) AS high, CAST(low AS FLOAT) AS low,
              CAST(close AS FLOAT) AS close, volume::text AS volume
       FROM security_prices WHERE security_id = $1 AND price_date >= $2 ORDER BY price_date ASC`,
      [securityId, istStampDate(from)]
    );
    const pts = rows.map((r) => ({ t: `${r.d}T15:30:00+05:30`, o: r.open, h: r.high, l: r.low, c: r.close, v: r.volume ? Number(r.volume) : null }));
    return lastTwoOnly ? pts.slice(-2) : pts;
  }
}

const istStampDate = (d: Date) => istStamp(d).slice(0, 10);

function summarise(points: ChartPoint[]) {
  if (points.length === 0) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const start = first.o ?? first.c;
  const change = last.c - start;
  return {
    start: round(start),
    end: round(last.c),
    change: round(change),
    changePct: start > 0 ? round((change / start) * 100) : 0,
    high: round(Math.max(...points.map((p) => p.h ?? p.c))),
    low: round(Math.min(...points.map((p) => p.l ?? p.c))),
    lastAt: last.t,
  };
}
const round = (n: number) => Math.round(n * 100) / 100;
