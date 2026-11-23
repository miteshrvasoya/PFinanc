/** Price history charts. Angel One is stubbed with the documented candle response: [timestamp, o, h, l, c, volume]. */
import request from 'supertest';
import { app } from '../src/app.js';
import { config } from '../src/config/env.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { AngelOneClient, rateGate, resetAngelOneSession, resetAngelOneWindows } from '../src/modules/angelone/angelOneClient.js';
import { clearChartCache, intervalForSpan, istStamp } from '../src/modules/investments/charts/priceChart.service.js';

type Call = { url: string; body: any };
let calls: Call[] = [];
let candleBehaviour: 'ok' | 'fail' = 'ok';
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
const ok = (data: unknown) => json({ status: true, message: 'SUCCESS', errorcode: '', data });
const candleCalls = () => calls.filter((c) => c.url.endsWith('/historical/v1/getCandleData'));

/** One candle per day (daily) or three candles per day (intraday) between the requested from/to dates. */
function candlesFor(body: any) {
  const [fd] = String(body.fromdate).split(' ');
  const [td] = String(body.todate).split(' ');
  const rows: any[] = [];
  for (let d = new Date(`${fd}T00:00:00Z`); d <= new Date(`${td}T00:00:00Z`); d = new Date(d.getTime() + 86_400_000)) {
    const day = d.toISOString().slice(0, 10);
    const times = body.interval === 'ONE_DAY' ? ['00:00:00'] : ['09:15:00', '09:20:00', '09:25:00'];
    times.forEach((t, i) => rows.push([`${day}T${t}+05:30`, 100 + i, 105 + i, 99 + i, 102 + i, 1000 + i]));
  }
  return rows;
}

let jwt = '';
let householdId = '';
let userId = '';
const auth = (t = jwt, h = householdId) => ({ Authorization: `Bearer ${t}`, 'x-household-id': h });
const ids: Record<string, string> = {};
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const chart = (symbol: string, q = '') => request(app).get(`/api/investments/chart/${symbol}${q}`).set(auth());

beforeAll(async () => {
  await runMigrations();
  await runSeed();
  Object.assign(config.angelOne, { apiKey: 'k', clientCode: 'A1', pin: '1', totpSecret: 'JBSWY3DPEHPK3PXP' });
  rateGate.scale = 0;

  const reg = await request(app).post('/api/auth/register').send({ email: `chart_${Date.now()}@test.local`, password: 'Password@123', name: 'Chart Tester' });
  jwt = reg.body.data.token;
  householdId = reg.body.data.defaultHouseholdId;
  userId = reg.body.data.user.id;

  await pool.query(`DELETE FROM investment_holdings WHERE instrument_id IN (SELECT id FROM securities WHERE isin LIKE 'INECHART%')`);
  await pool.query(`DELETE FROM securities WHERE isin LIKE 'INECHART%'`);
  await pool.query(`DELETE FROM angelone_instruments WHERE name LIKE 'CHART%'`);

  const acct = (await pool.query(
    `INSERT INTO accounts (household_id, owner_user_id, name, account_type, institution_name) VALUES ($1,$2,'Chart Broker','BROKERAGE','Test') RETURNING id`, [householdId, userId]
  )).rows[0].id;
  const sec = async (key: string, symbol: string, type: string) => {
    ids[key] = (await pool.query(
      `INSERT INTO securities (symbol, isin, name, security_type, exchange, asset_class) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [symbol, `INECHART${key}`, `${symbol} Ltd`, type, type === 'MUTUAL_FUND' ? 'AMFI' : 'NSE', type === 'MUTUAL_FUND' ? 'MUTUAL_FUND' : 'EQUITY']
    )).rows[0].id;
    // a few stored daily prices (the fallback source)
    for (let i = 0; i < 6; i++) {
      await pool.query(`INSERT INTO security_prices (security_id, price_date, close, source) VALUES ($1, $2, $3, 'TEST')`, [ids[key], daysAgo(i * 3), 100 + i]);
    }
  };
  await sec('A', 'CHARTA', 'STOCK');   // bought via trade history
  await sec('B', 'CHARTB', 'STOCK');   // snapshot only: buy date unknown
  await sec('M', 'CHARTMF', 'MUTUAL_FUND');
  await pool.query(
    `INSERT INTO investment_transactions (household_id, investment_account_id, security_id, transaction_type, transaction_date, quantity, price_per_unit, gross_amount, net_amount, status)
     VALUES ($1,$2,$3,'BUY',$4,10,100,1000,1000,'CONFIRMED')`, [householdId, acct, ids.A, daysAgo(50)]
  );
  await pool.query(
    `INSERT INTO investment_transactions (household_id, investment_account_id, security_id, transaction_type, transaction_date, quantity, price_per_unit, gross_amount, net_amount, status)
     VALUES ($1,$2,$3,'BUY',$4,5,120,600,600,'CONFIRMED')`, [householdId, acct, ids.A, daysAgo(10)]
  );
  await pool.query(
    `INSERT INTO investment_holdings (family_id, user_id, investment_account_id, instrument_id, quantity, average_cost, as_of_date) VALUES ($1,$2,$3,$4,10,90,$5)`,
    [householdId, userId, acct, ids.B, daysAgo(0)]
  );
  await pool.query(
    `INSERT INTO investment_holdings (family_id, user_id, investment_account_id, instrument_id, quantity, average_cost, as_of_date) VALUES ($1,$2,$3,$4,20,50,$5)`,
    [householdId, userId, acct, ids.M, daysAgo(0)]
  );
  for (const [token, name] of [['8801', 'CHARTA'], ['8802', 'CHARTB']]) {
    await pool.query(`INSERT INTO angelone_instruments (exch_seg, token, symbol, name, series) VALUES ('NSE',$1,$2,$3,'EQ') ON CONFLICT DO NOTHING`, [token, `${name}-EQ`, name]);
  }
});

beforeEach(() => {
  calls = [];
  candleBehaviour = 'ok';
  clearChartCache();
  resetAngelOneSession();
  resetAngelOneWindows();
  jest.restoreAllMocks();
  jest.spyOn(globalThis, 'fetch').mockImplementation((async (input: any, init: any = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    if (url.endsWith('/loginByPassword') || url.endsWith('/generateTokens')) return ok({ jwtToken: 'j', refreshToken: 'r', feedToken: 'f' });
    if (url.endsWith('/historical/v1/getCandleData')) {
      return candleBehaviour === 'fail' ? json({ status: false, message: 'Internal Error', errorcode: 'AB2001', data: null }) : ok(candlesFor(body));
    }
    throw new Error('network blocked in test');
  }) as any);
});

afterAll(async () => {
  jest.restoreAllMocks();
  Object.assign(config.angelOne, { apiKey: '', clientCode: '', pin: '', totpSecret: '' });
  await pool.query(`DELETE FROM investment_holdings WHERE instrument_id IN (SELECT id FROM securities WHERE isin LIKE 'INECHART%')`);
  await pool.query(`DELETE FROM investment_transactions WHERE security_id IN (SELECT id FROM securities WHERE isin LIKE 'INECHART%')`);
  await pool.query(`DELETE FROM securities WHERE isin LIKE 'INECHART%'`);
  await pool.query(`DELETE FROM angelone_instruments WHERE name LIKE 'CHART%'`);
});

describe('chart helpers', () => {
  it('picks granularity from the span within the documented limits', () => {
    expect(intervalForSpan(1)).toBe('FIVE_MINUTE');
    expect(intervalForSpan(7)).toBe('FIFTEEN_MINUTE');
    expect(intervalForSpan(31)).toBe('ONE_HOUR');
    expect(intervalForSpan(92)).toBe('ONE_DAY');
  });
  it('formats request times in India time as yyyy-MM-dd HH:mm', () => {
    expect(istStamp(new Date('2024-03-15T04:00:00Z'))).toBe('2024-03-15 09:30');
    expect(istStamp(new Date('2024-03-15T20:00:00Z'))).toBe('2024-03-16 01:30'); // past midnight in IST
  });
});

describe('GET /api/investments/chart/:symbol', () => {
  it('requires login, a valid range and a security the household has', async () => {
    expect((await request(app).get('/api/investments/chart/CHARTA')).status).toBe(401);
    expect((await chart('CHARTA', '?range=2Y')).status).toBe(400);
    const missing = await chart('NOSUCH');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('SECURITY_NOT_FOUND');
  });

  it('defaults to one day: 5-minute candles of the latest session only', async () => {
    const res = await chart('CHARTA');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toMatchObject({ symbol: 'CHARTA', range: '1D', interval: 'FIVE_MINUTE', source: 'ANGEL_ONE' });
    expect(new Set(d.points.map((p: any) => p.t.slice(0, 10))).size).toBe(1); // stub returned several days; one session kept
    expect(d.points.length).toBe(3);
    expect(d.summary).toMatchObject({ start: 100, end: 104, change: 4, changePct: 4, high: 107, low: 99 });

    const req = candleCalls()[0].body;
    expect(req).toMatchObject({ exchange: 'NSE', symboltoken: '8801', interval: 'FIVE_MINUTE' });
    expect(req.fromdate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(req.todate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('uses coarser candles for longer ranges', async () => {
    const expected: Record<string, string> = { '1W': 'FIFTEEN_MINUTE', '1M': 'ONE_HOUR', '3M': 'ONE_DAY', '6M': 'ONE_DAY', '1Y': 'ONE_DAY' };
    for (const [range, interval] of Object.entries(expected)) {
      clearChartCache();
      const res = await chart('CHARTA', `?range=${range}`);
      expect(res.body.data.interval).toBe(interval);
      expect(candleCalls().at(-1)!.body.interval).toBe(interval);
    }
  });

  it('charts since the first buy, with buy markers, average cost and position', async () => {
    const res = await chart('CHARTA', '?range=SINCE_BUY');
    const d = res.body.data;
    expect(res.status).toBe(200);
    expect(d.firstBuyDate).toBe(daysAgo(50));
    expect(d.buyDateSource).toBe('TRADES');
    expect(d.sinceBuyAvailable).toBe(true);
    expect(d.from).toBe(daysAgo(50));
    expect(d.interval).toBe('ONE_DAY'); // 50 days
    expect(d.buys).toEqual([
      { date: daysAgo(50), quantity: 10, price: 100 },
      { date: daysAgo(10), quantity: 5, price: 120 },
    ]);
    expect(d.position).toMatchObject({ quantity: 15 });
    expect(d.position.averageCost).toBeCloseTo((10 * 100 + 5 * 120) / 15, 2);
    expect(candleCalls()[0].body.fromdate.startsWith(daysAgo(50))).toBe(true);
  });

  it('only marks buys that fall inside the chosen range', async () => {
    const res = await chart('CHARTA', '?range=1M');
    expect(res.body.data.buys).toEqual([{ date: daysAgo(10), quantity: 5, price: 120 }]);
  });

  it('asks for the buy date when a holding has no trade history, and remembers it once set', async () => {
    const day = await chart('CHARTB');
    expect(day.body.data.sinceBuyAvailable).toBe(false);
    expect(day.body.data.firstBuyDate).toBeNull();

    const blocked = await chart('CHARTB', '?range=SINCE_BUY');
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe('BUY_DATE_UNKNOWN');

    const put = (date: string) => request(app).put('/api/investments/holdings/CHARTB/buy-date').set(auth()).send({ date });
    expect((await put('not-a-date')).status).toBe(400);
    expect((await put(daysAgo(-3))).status).toBe(400); // future
    expect((await put(daysAgo(200))).status).toBe(200);

    const ok2 = await chart('CHARTB', '?range=SINCE_BUY');
    expect(ok2.status).toBe(200);
    expect(ok2.body.data).toMatchObject({ firstBuyDate: daysAgo(200), buyDateSource: 'SAVED', interval: 'ONE_DAY', sinceBuyAvailable: true });

    expect((await request(app).delete('/api/investments/holdings/CHARTB/buy-date').set(auth())).status).toBe(200);
    expect((await chart('CHARTB', '?range=SINCE_BUY')).status).toBe(400);
  });

  it('caches repeated requests to protect the candle rate limits', async () => {
    await chart('CHARTA', '?range=1M');
    await chart('CHARTA', '?range=1M');
    expect(candleCalls()).toHaveLength(1);
  });

  it('falls back to stored daily prices, with a reason, when Angel One fails', async () => {
    candleBehaviour = 'fail';
    const res = await chart('CHARTA', '?range=1M');
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('STORED_PRICES');
    expect(res.body.data.interval).toBe('ONE_DAY');
    expect(res.body.data.points.length).toBeGreaterThan(1);
    expect(res.body.data.notes.join(' ')).toMatch(/stored daily prices/i);
  });

  it('falls back (and says so) when Angel One is not configured; one day shows the last two stored prices', async () => {
    const saved = config.angelOne.pin;
    config.angelOne.pin = '';
    const res = await chart('CHARTA');
    config.angelOne.pin = saved;
    expect(res.body.data.source).toBe('STORED_PRICES');
    expect(res.body.data.points).toHaveLength(2);
    expect(res.body.data.notes.join(' ')).toMatch(/Intraday prices need an Angel One connection/);
    expect(candleCalls()).toHaveLength(0);
  });

  it('shows daily NAVs for mutual funds without calling Angel One', async () => {
    const res = await chart('CHARTMF', '?range=1M');
    expect(res.body.data.source).toBe('STORED_PRICES');
    expect(res.body.data.notes.join(' ')).toMatch(/daily NAV/);
    expect(candleCalls()).toHaveLength(0);
  });

  it('does not expose another household\'s holdings', async () => {
    const other = await request(app).post('/api/auth/register').send({ email: `chart_o_${Date.now()}@test.local`, password: 'Password@123', name: 'Other' });
    const r = await request(app).get('/api/investments/chart/CHARTA').set(auth(other.body.data.token, other.body.data.defaultHouseholdId));
    expect(r.status).toBe(404);
  });
});

describe('candle API client', () => {
  it('parses [timestamp, o, h, l, c, v] records', async () => {
    const out = await AngelOneClient.getCandles('NSE', '8801', 'ONE_DAY', '2024-03-01 09:00', '2024-03-03 15:30');
    expect(out[0]).toEqual({ t: '2024-03-01T00:00:00+05:30', o: 100, h: 105, l: 99, c: 102, v: 1000 });
  });

  it('stops at the documented 40 requests per minute instead of hammering Angel One', async () => {
    resetAngelOneWindows();
    for (let i = 0; i < 40; i++) await AngelOneClient.getCandles('NSE', '8801', 'ONE_DAY', '2024-03-01 09:00', '2024-03-02 09:00');
    await expect(AngelOneClient.getCandles('NSE', '8801', 'ONE_DAY', '2024-03-01 09:00', '2024-03-02 09:00')).rejects.toMatchObject({ code: 'RATE_LIMIT' });
    expect(candleCalls()).toHaveLength(40);
    resetAngelOneWindows();
  });
});
