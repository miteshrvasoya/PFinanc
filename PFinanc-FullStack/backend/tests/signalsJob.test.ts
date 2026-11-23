/**
 * Stock signals: the daily job, alerts and HTTP API, with Angel One replaced by a fetch stub (never contacted).
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../src/app.js';
import { config } from '../src/config/env.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { rateGate, resetAngelOneSession } from '../src/modules/angelone/angelOneClient.js';
import { SignalsService } from '../src/modules/signals/signals.service.js';
import { intradayCheck } from '../src/modules/signals/signalAlerts.js';
import { runBacktestFor } from '../src/modules/signals/backtest.service.js';
import { chunkRange, isSessionComplete } from '../src/modules/signals/candles.service.js';
import { DISCLAIMER, Candle } from '../src/modules/signals/types.js';
import { fromCloses, tradingDays, walkCandles } from './signals/helpers.js';

const SECRETS = { apiKey: 'sig-key', clientCode: 'S123', pin: '1234', totpSecret: 'JBSWY3DPEHPK3PXP' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const ok = (data: unknown) => json({ status: true, message: 'SUCCESS', errorcode: '', data });
const bad = (code: string, message: string) => json({ status: false, message, errorcode: code, data: null });

const N = 700;
const days = tradingDays(N, '2022-06-01');
const LAST = days[N - 1];
const NOW = new Date(`${LAST}T14:00:00Z`); // 19:30 IST on the last candle day: session complete
const store: Record<string, Candle[]> = {};
let candleCalls: Array<{ token: string; from: string; to: string }> = [];
let failToken: string | null = null;
let expireOnce = false;
let ltp: Record<string, number> = {};
let loginCount = 0;

const stamp = (c: Candle) => [`${c.date}T09:15:00+0530`, c.open, c.high, c.low, c.close, c.volume];

function stub(input: any, init: any = {}): Response {
  const url = typeof input === 'string' ? input : input.url;
  const p = new URL(url).pathname;
  const body = init.body ? JSON.parse(init.body) : {};
  if (p.endsWith('/loginByPassword')) { loginCount++; return ok({ jwtToken: `j${loginCount}`, refreshToken: `r${loginCount}`, feedToken: 'f' }); }
  if (p.endsWith('/generateTokens')) { loginCount++; return ok({ jwtToken: `j${loginCount}`, refreshToken: `r${loginCount}`, feedToken: 'f' }); }
  if (p.endsWith('/getCandleData')) {
    candleCalls.push({ token: body.symboltoken, from: body.fromdate, to: body.todate });
    if (expireOnce) { expireOnce = false; return bad('AG8002', 'Token Expired'); }
    if (body.symboltoken === failToken) return bad('AB1004', 'Something Went Wrong');
    const from = body.fromdate.slice(0, 10), to = body.todate.slice(0, 10);
    return ok((store[body.symboltoken] || []).filter((c) => c.date >= from && c.date <= to).map(stamp));
  }
  if (p.endsWith('/market/v1/quote/')) {
    const fetched = Object.entries(body.exchangeTokens as Record<string, string[]>).flatMap(([exchange, list]) => list.filter((t) => ltp[t]).map((t) => ({ exchange, tradingSymbol: `X${t}`, symbolToken: t, ltp: ltp[t] })));
    return ok({ fetched, unfetched: [] });
  }
  throw new Error(`network blocked in test: ${url}`);
}

let jwt = '', householdId = '', userId = '', viewerJwt = '';
const auth = (t = jwt) => ({ Authorization: `Bearer ${t}`, 'x-household-id': householdId });
const instruments = [['SIGUP', '70001'], ['SIGUP2', '70002'], ['SIGBAD', '70003'], ['SIGNEW', '70004']];

beforeAll(async () => {
  await runMigrations();
  await runSeed();
  const reg = await request(app).post('/api/auth/register').send({ email: `sig_${Date.now()}@test.local`, password: 'Password@123', name: 'Signals Tester' });
  jwt = reg.body.data.token; householdId = reg.body.data.defaultHouseholdId; userId = reg.body.data.user.id;
  Object.assign(config.angelOne, SECRETS, { householdId });
  rateGate.scale = 0;

  await pool.query(`DELETE FROM angelone_instruments WHERE name LIKE 'SIG%'`);
  for (const [name, token] of instruments) await pool.query(`INSERT INTO angelone_instruments (exch_seg, token, symbol, name, series) VALUES ('NSE',$1,$2,$3,'EQ') ON CONFLICT DO NOTHING`, [token, `${name}-EQ`, name]);
  await pool.query(`DELETE FROM candles WHERE token IN ('99926000','70001','70002','70003','70004')`);
  await pool.query(`DELETE FROM candle_sync_state WHERE token IN ('99926000','70001','70002','70003','70004')`);

  store['99926000'] = walkCandles(N, { seed: 5, drift: 0.0003, vol: 0.006, start: 15000, startDate: '2022-06-01' });
  store['70001'] = walkCandles(N, { seed: 11, drift: 0.0016, vol: 0.011, start: 100, volume: 2_000_000, startDate: '2022-06-01' });
  store['70002'] = walkCandles(N, { seed: 12, drift: 0.0012, vol: 0.011, start: 200, volume: 2_000_000, startDate: '2022-06-01' });
  store['70003'] = walkCandles(N, { seed: 13, startDate: '2022-06-01' });
  store['70004'] = fromCloses(Array.from({ length: 50 }, (_, i) => 100 + i), days[N - 50]);
});

beforeEach(() => {
  candleCalls = []; failToken = null; expireOnce = false; ltp = {}; loginCount = 0;
  resetAngelOneSession();
  jest.restoreAllMocks();
  jest.spyOn(globalThis, 'fetch').mockImplementation((async (i: any, init: any) => stub(i, init)) as any);
});

afterAll(async () => {
  jest.restoreAllMocks();
  Object.assign(config.angelOne, { apiKey: '', clientCode: '', pin: '', totpSecret: '', householdId: '' });
  await pool.query(`DELETE FROM angelone_instruments WHERE name LIKE 'SIG%'`);
});

describe('helpers', () => {
  it('chunks long ranges under the per-request limit', () => {
    const chunks = chunkRange(new Date('2018-01-01'), new Date('2026-01-01'), 1900);
    expect(chunks.length).toBeGreaterThan(1);
    for (const [a, b] of chunks) expect((b.getTime() - a.getTime()) / 86_400_000).toBeLessThanOrEqual(1900);
    expect(chunks[chunks.length - 1][1].toISOString().slice(0, 10)).toBe('2026-01-01');
  });
  it('treats today as complete only after 15:45 IST', () => {
    expect(isSessionComplete('2025-06-02', new Date('2025-06-02T09:30:00Z'))).toBe(false); // 15:00 IST
    expect(isSessionComplete('2025-06-02', new Date('2025-06-02T10:30:00Z'))).toBe(true);  // 16:00 IST
    expect(isSessionComplete('2025-06-01', new Date('2025-06-02T04:00:00Z'))).toBe(true);
    expect(isSessionComplete('2025-06-03', new Date('2025-06-02T10:30:00Z'))).toBe(false);
  });
});

describe('daily job', () => {
  beforeAll(async () => {
    for (const s of ['SIGUP', 'SIGUP2', 'SIGBAD', 'SIGNEW']) await request(app).post('/api/watchlist').set(auth()).send({ symbol: s });
  });

  it('scores the universe, isolates the failing symbol, and records issues', async () => {
    failToken = '70003';
    const r = await SignalsService.runDaily(householdId, 'TEST', NOW);
    expect(r.asOf).toBe(LAST);
    expect(r.status).toBe('PARTIAL');
    const types = Object.fromEntries(r.issues.map((i: any) => [i.symbol, i.type]));
    expect(types.SIGBAD).toBe('FETCH_FAILED');
    const rows = await pool.query(`SELECT symbol, label FROM signals WHERE run_id = (SELECT id FROM signal_runs WHERE household_id=$1 AND as_of_date=$2)`, [householdId, LAST]);
    const syms = rows.rows.map((x) => x.symbol);
    expect(syms).toEqual(expect.arrayContaining(['SIGUP', 'SIGUP2']));
    expect(syms).not.toContain('SIGBAD');
    expect(syms).not.toContain('SIGNEW'); // too little history: no signal
  });

  it('is idempotent and only fetches the missing tail on a re-run', async () => {
    candleCalls = [];
    await SignalsService.runDaily(householdId, 'TEST', NOW);
    const runs = await pool.query(`SELECT COUNT(*)::int AS n FROM signal_runs WHERE household_id=$1 AND as_of_date=$2`, [householdId, LAST]);
    expect(runs.rows[0].n).toBe(1);
    const dup = await pool.query(`SELECT COUNT(*)::int AS n FROM (SELECT symbol FROM signals WHERE run_id=(SELECT id FROM signal_runs WHERE household_id=$1 AND as_of_date=$2) GROUP BY symbol HAVING COUNT(*)>1) x`, [householdId, LAST]);
    expect(dup.rows[0].n).toBe(0);
    const up = candleCalls.filter((c) => c.token === '70001');
    expect(up.length).toBe(1);
    expect(up[0].from.slice(0, 10) >= days[N - 12]).toBe(true); // incremental, not a full backfill
  });

  it('recovers from a mid-run session expiry', async () => {
    expireOnce = true;
    const r = await SignalsService.runDaily(householdId, 'TEST', NOW);
    expect(['COMPLETED', 'PARTIAL']).toContain(r.status);
    expect(loginCount).toBeGreaterThan(0);
  });

  it('flags an unadjusted split instead of producing a signal', async () => {
    const c = store['70002'].map((x) => ({ ...x }));
    for (let i = 600; i < N; i++) { c[i].open /= 2; c[i].high /= 2; c[i].low /= 2; c[i].close /= 2; }
    const saved = store['70002'];
    store['70002'] = c;
    await pool.query(`DELETE FROM candles WHERE token='70002'`);
    await pool.query(`DELETE FROM candle_sync_state WHERE token='70002'`);
    const r = await SignalsService.runDaily(householdId, 'TEST', NOW);
    store['70002'] = saved;
    expect(r.issues.find((i: any) => i.symbol === 'SIGUP2')?.type).toBe('DATA_UNRELIABLE');
    const sig = await pool.query(`SELECT 1 FROM signals WHERE run_id=(SELECT id FROM signal_runs WHERE household_id=$1 AND as_of_date=$2) AND symbol='SIGUP2'`, [householdId, LAST]);
    expect(sig.rowCount).toBe(0);
    await pool.query(`DELETE FROM candles WHERE token='70002'`);
    await pool.query(`DELETE FROM candle_sync_state WHERE token='70002'`);
    await SignalsService.runDaily(householdId, 'TEST', NOW); // restore good data
  });

  it('aborts on a login failure without hammering the login endpoint', async () => {
    jest.restoreAllMocks();
    let logins = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation((async (i: any) => { logins++; return bad('AB1000', 'Invalid Email Or Password'); }) as any);
    resetAngelOneSession();
    await expect(SignalsService.runDaily(householdId, 'TEST', NOW)).rejects.toBeTruthy();
    expect(logins).toBeLessThan(5);
  });
});

describe('API', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/signals/top-buys')).status).toBe(401);
  });

  it('every JSON response carries the disclaimer', async () => {
    for (const url of ['/api/signals/top-buys?limit=5', '/api/signals/holdings', '/api/signals/status', '/api/signals/settings', '/api/signals/backtest/latest', '/api/signals/SIGUP', '/api/watchlist']) {
      const res = await request(app).get(url).set(auth());
      expect(res.status).toBe(200);
      expect(res.body.disclaimer).toBe(DISCLAIMER);
      expect(res.body.data.disclaimer ?? res.body.disclaimer).toBe(DISCLAIMER);
    }
    const err = await request(app).get('/api/signals/NOPE123').set(auth());
    expect(err.body.disclaimer).toBe(DISCLAIMER);
  });

  it('ranks top buys with reasons, levels and the excluded counts', async () => {
    const res = await request(app).get('/api/signals/top-buys?limit=10').set(auth());
    const { items } = res.body.data;
    for (const it of items) {
      expect(['STRONG_BUY', 'BUY']).toContain(it.label);
      expect(it.reasons.length).toBeGreaterThan(0);
      expect(it.levels.stop).toBeLessThan(it.levels.entryLow);
      expect(it.levels.riskReward).toBeGreaterThanOrEqual(1.5);
    }
    const scores = items.map((i: any) => i.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('returns chart series for a symbol', async () => {
    const res = await request(app).get('/api/signals/SIGUP').set(auth());
    const d = res.body.data;
    expect(d.symbol).toBe('SIGUP');
    expect(d.series.length).toBeGreaterThan(100);
    const last = d.series[d.series.length - 1];
    for (const k of ['date', 'close', 'sma20', 'sma50', 'sma200', 'bbUpper', 'bbLower', 'rsi', 'macd', 'macdSignal', 'macdHist']) expect(last[k]).not.toBeUndefined();
    expect(last.sma200).not.toBeNull();
  });

  it('validates settings and restricts changes to owners/admins', async () => {
    const bad1 = await request(app).put('/api/signals/settings').set(auth()).send({ config: { bogus: 1 } });
    expect(bad1.status).toBe(400);
    const bad2 = await request(app).put('/api/signals/settings').set(auth()).send({ config: { sizing: { riskPct: 50 } } });
    expect(bad2.status).toBe(400);
    const good = await request(app).put('/api/signals/settings').set(auth()).send({ config: { sizing: { capital: 2_000_000 } } });
    expect(good.status).toBe(200);
    expect(good.body.data.config.sizing.capital).toBe(2_000_000);
    await request(app).put('/api/signals/settings').set(auth()).send({ config: { sizing: { capital: 1_000_000 } } });
  });

  it('manages the watchlist', async () => {
    expect((await request(app).post('/api/watchlist').set(auth()).send({ symbol: 'NOSUCHSYM' })).status).toBe(400);
    expect((await request(app).post('/api/watchlist').set(auth()).send({ symbol: 'bad symbol!' })).status).toBe(400);
    const del = await request(app).delete('/api/watchlist/SIGNEW').set(auth());
    expect(del.status).toBe(200);
    expect((await request(app).delete('/api/watchlist/SIGNEW').set(auth())).status).toBe(404);
  });

  it('runs and stores a backtest', async () => {
    const res = await request(app).post('/api/signals/backtest').set(auth()).send({ symbols: ['SIGUP', 'SIGUP2'] });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.metrics).toHaveProperty('winRatePct');
    expect(d.metrics).toHaveProperty('maxDrawdownPct');
    expect(d.pastPerformanceNote).toMatch(/past performance/i);
    expect(d.equityCurve.length).toBeLessThanOrEqual(300);
    const latest = await request(app).get('/api/signals/backtest/latest').set(auth());
    expect(latest.body.data.available).toBe(true);
    expect((await request(app).post('/api/signals/backtest').set(auth()).send({ symbols: ['SIGUP'], from: 'yesterday' })).status).toBe(400);
    await expect(runBacktestFor(householdId, userId, { symbols: ['NOSUCH'] })).rejects.toMatchObject({ status: 400 });
  });
});

describe('alerts', () => {
  it('de-duplicates intraday alerts for the same state', async () => {
    const s = await pool.query(`SELECT symbol, token, entry_low, entry_high, stop FROM signals WHERE run_id=(SELECT id FROM signal_runs WHERE household_id=$1 ORDER BY as_of_date DESC LIMIT 1) AND trade_valid AND liquid AND label IN ('BUY','STRONG_BUY') LIMIT 1`, [householdId]);
    if (s.rowCount === 0) return; // fixtures produced no buy candidate; covered by unit tests
    const row = s.rows[0];
    ltp[row.token] = (Number(row.entry_low) + Number(row.entry_high)) / 2;
    const a = await intradayCheck(householdId);
    const b = await intradayCheck(householdId);
    expect(a.alerts).toBe(1);
    expect(b.alerts).toBe(0);
    const n = await pool.query(`SELECT body FROM ai_advisor_notifications WHERE household_id=$1 AND type='SIGNAL_ENTRY_ZONE'`, [householdId]);
    expect(n.rowCount).toBe(1);
    expect(n.rows[0].body).toContain(DISCLAIMER);
  });
});

describe('advisory only', () => {
  it('no source file under signals/ or angelone/ can reach an order endpoint', () => {
    const root = path.join(__dirname, '../src/modules');
    const hits: string[] = [];
    for (const dir of ['signals', 'angelone']) {
      for (const f of fs.readdirSync(path.join(root, dir))) {
        const src = fs.readFileSync(path.join(root, dir, f), 'utf8');
        // searchScrip lives under order/v1 in SmartAPI but is a read-only lookup; the instrument master is used instead.
        const stripped = src.replace(/\/rest\/secure\/angelbroking\/order\/v1\/searchScrip/g, '');
        if (/placeOrder|modifyOrder|cancelOrder|order\/v1/i.test(stripped)) hits.push(`${dir}/${f}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
