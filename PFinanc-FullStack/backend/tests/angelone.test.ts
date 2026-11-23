/**
 * Angel One SmartAPI integration. Angel One is never contacted: global fetch is replaced with a stub that
 * answers with the response shapes documented at https://smartapi.angelone.in/docs.
 */
import request from 'supertest';
import { app } from '../src/app.js';
import { config } from '../src/config/env.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { generateTotp, base32Decode } from '../src/modules/angelone/totp.js';
import { AngelOneClient, AngelOneError, rateGate, resetAngelOneSession } from '../src/modules/angelone/angelOneClient.js';
import { AngelOneProvider, quoteDate } from '../src/modules/angelone/angelOneProvider.js';
import { baseSymbol, extractFlatObjects, refreshInstrumentMaster, resolveInstruments } from '../src/modules/angelone/instruments.js';
import { AngelOneService } from '../src/modules/angelone/angelOne.service.js';

const SECRETS = { apiKey: 'test-api-key-9f3a', clientCode: 'A123456', pin: '4821', totpSecret: 'JBSWY3DPEHPK3PXP' };

type Call = { url: string; method: string; headers: Record<string, string>; body: any };
let calls: Call[] = [];
let responders: Array<(c: Call) => Response | undefined> = [];
const json = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const ok = (data: unknown) => json({ status: true, message: 'SUCCESS', errorcode: '', data });
const err = (code: string, message: string) => json({ status: false, message, errorcode: code, data: null });
const path = (c: Call) => new URL(c.url).pathname;
const callsTo = (p: string) => calls.filter((c) => path(c).endsWith(p));

let holdings: any[] = [];
let jwtCounter = 0;

const defaultStub = (c: Call): Response => {
  for (const r of responders) { const res = r(c); if (res) return res; }
  const p = path(c);
  if (p.endsWith('/user/v1/loginByPassword')) { jwtCounter++; return ok({ jwtToken: `jwt-${jwtCounter}`, refreshToken: `refresh-${jwtCounter}`, feedToken: 'feed' }); }
  if (p.endsWith('/jwt/v1/generateTokens')) { jwtCounter++; return ok({ jwtToken: `jwt-${jwtCounter}`, refreshToken: `refresh-${jwtCounter}`, feedToken: 'feed' }); }
  if (p.endsWith('/user/v1/getProfile')) return ok({ clientcode: SECRETS.clientCode, name: 'TEST USER', email: 'secret@example.com', mobileno: '9999999999', exchanges: ['nse_cm', 'bse_cm'], products: ['DELIVERY'] });
  if (p.endsWith('/portfolio/v1/getAllHolding')) return ok({ holdings, totalholding: { totalholdingvalue: 1, totalinvvalue: 1, totalprofitandloss: 0, totalpnlpercentage: 0 } });
  if (p.endsWith('/market/v1/quote/')) {
    const tokens: Record<string, string[]> = c.body.exchangeTokens;
    const fetched = Object.entries(tokens).flatMap(([exchange, list]) => list.map((t) => ({
      exchange, tradingSymbol: `SYM${t}-EQ`, symbolToken: t, ltp: 100 + Number(t) % 7, open: 99, high: 105, low: 98, close: 99.5,
      percentChange: 0.5, netChange: 0.5, tradeVolume: 12345, exchTradeTime: '21-Jun-2023 10:46:09',
    })));
    return ok({ fetched, unfetched: [] });
  }
  throw new Error(`network blocked in test: ${c.url}`); // Yahoo, MFAPI, ... behave as offline
};

function installFetchStub() {
  jest.spyOn(globalThis, 'fetch').mockImplementation((async (input: any, init: any = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const call: Call = { url, method: init.method || 'GET', headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    return defaultStub(call);
  }) as any);
}

const rawHolding = (over: any) => ({
  tradingsymbol: 'AOTEST1-EQ', exchange: 'NSE', isin: 'INEAOTEST001', quantity: 10, t1quantity: 0, averageprice: 100, ltp: 120,
  close: 118, symboltoken: '9001', profitandloss: 200, pnlpercentage: 20, product: 'DELIVERY', ...over,
});

const cleanTestSecurities = async () => {
  // investment_holdings.instrument_id is ON DELETE RESTRICT, so remove snapshots first
  await pool.query(`DELETE FROM investment_holdings WHERE instrument_id IN (SELECT id FROM securities WHERE isin LIKE 'INEAOTEST%')`);
  await pool.query(`DELETE FROM securities WHERE isin LIKE 'INEAOTEST%'`);
};

// A fresh household isolates everything this suite writes (account, securities, snapshots, prices).
let jwt = '';
let householdId = '';
let userId = '';
const auth = (t = jwt, h = householdId) => ({ Authorization: `Bearer ${t}`, 'x-household-id': h });

beforeAll(async () => {
  await runMigrations();
  await runSeed();
  const reg = await request(app).post('/api/auth/register').send({ email: `angel_${Date.now()}@test.local`, password: 'Password@123', name: 'Angel Tester' });
  jwt = reg.body.data.token;
  householdId = reg.body.data.defaultHouseholdId;
  userId = reg.body.data.user.id;

  Object.assign(config.angelOne, SECRETS, { householdId });
  rateGate.scale = 0;

  await cleanTestSecurities(); // securities are global: clean any leftovers
  await pool.query(`DELETE FROM angelone_instruments WHERE name LIKE 'AOTEST%' OR name LIKE 'AOQ%'`);
  const rows: any[] = [];
  for (let i = 1; i <= 3; i++) rows.push(['NSE', String(9000 + i), `AOTEST${i}-EQ`, `AOTEST${i}`, 'EQ']);
  rows.push(['BSE', '599001', 'AOTEST1', 'AOTEST1', null]);
  for (let i = 1; i <= 120; i++) rows.push(['NSE', String(20000 + i), `AOQ${i}-EQ`, `AOQ${i}`, 'EQ']);
  for (const r of rows) await pool.query(`INSERT INTO angelone_instruments (exch_seg, token, symbol, name, series) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, r);
});

beforeEach(() => {
  calls = [];
  responders = [];
  holdings = [];
  jwtCounter = 0;
  resetAngelOneSession();
  jest.restoreAllMocks();
  installFetchStub();
});

afterAll(async () => {
  jest.restoreAllMocks();
  Object.assign(config.angelOne, { apiKey: '', clientCode: '', pin: '', totpSecret: '', householdId: '' });
  await cleanTestSecurities();
  await pool.query(`DELETE FROM angelone_instruments WHERE name LIKE 'AOTEST%' OR name LIKE 'AOQ%'`);
});

describe('TOTP (RFC 6238 SHA-1 test vectors)', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // base32 of "12345678901234567890"
  it('matches the published vectors', () => {
    expect(generateTotp(secret, 59_000, 8)).toBe('94287082');
    expect(generateTotp(secret, 1_111_111_109_000, 8)).toBe('07081804');
    expect(generateTotp(secret, 20_000_000_000_000, 8)).toBe('65353130');
    expect(generateTotp(secret, 59_000)).toBe('287082');
  });
  it('rejects non-base32 secrets and tolerates spaces/lowercase', () => {
    expect(() => base32Decode('not base32!')).toThrow(/base32/);
    expect(base32Decode('jbsw y3dp').length).toBe(base32Decode('JBSWY3DP').length);
  });
});

describe('SmartAPI client', () => {
  it('logs in with the documented headers and body, then sends the bearer token on secure calls', async () => {
    const profile = await AngelOneClient.getProfile();
    expect(profile.name).toBe('TEST USER');

    const login = callsTo('/user/v1/loginByPassword')[0];
    expect(login.method).toBe('POST');
    expect(login.url).toBe('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword');
    expect(login.headers['X-PrivateKey']).toBe(SECRETS.apiKey);
    expect(login.headers['X-UserType']).toBe('USER');
    expect(login.headers['X-SourceID']).toBe('WEB');
    expect(login.headers['X-ClientLocalIP']).toBeTruthy();
    expect(login.headers['X-ClientPublicIP']).toBeTruthy();
    expect(login.headers['X-MACAddress']).toBeTruthy();
    expect(login.headers.Authorization).toBeUndefined();
    expect(login.body).toEqual({ clientcode: SECRETS.clientCode, password: SECRETS.pin, totp: expect.stringMatching(/^\d{6}$/) });

    const secure = callsTo('/user/v1/getProfile')[0];
    expect(secure.headers.Authorization).toBe('Bearer jwt-1');
    expect(secure.headers['X-PrivateKey']).toBe(SECRETS.apiKey);
  });

  it('reuses one session across calls', async () => {
    await AngelOneClient.getProfile();
    await AngelOneClient.getHoldings();
    await AngelOneClient.getHoldings();
    expect(callsTo('/user/v1/loginByPassword')).toHaveLength(1);
  });

  it('renews an expired session through generateTokens and retries once', async () => {
    await AngelOneClient.getProfile(); // jwt-1
    let first = true;
    responders.push((c) => {
      if (path(c).endsWith('/getAllHolding') && first) { first = false; return err('AG8002', 'Token Expired'); }
      return undefined;
    });
    const res = await AngelOneClient.getHoldings();
    expect(res.holdings).toEqual([]);
    const refresh = callsTo('/jwt/v1/generateTokens');
    expect(refresh).toHaveLength(1);
    expect(refresh[0].body).toEqual({ refreshToken: 'refresh-1' });
    expect(callsTo('/getAllHolding')[1].headers.Authorization).toBe('Bearer jwt-2');
    expect(callsTo('/user/v1/loginByPassword')).toHaveLength(1);
  });

  it('falls back to a full login when the refresh token is rejected', async () => {
    await AngelOneClient.getProfile();
    let first = true;
    responders.push((c) => {
      if (path(c).endsWith('/getAllHolding') && first) { first = false; return err('AG8001', 'Invalid Token'); }
      if (path(c).endsWith('/generateTokens')) return err('AB8051', 'Refresh Token Expired');
      return undefined;
    });
    await AngelOneClient.getHoldings();
    expect(callsTo('/user/v1/loginByPassword')).toHaveLength(2);
  });

  it('treats AB1015 (holding not found) as an empty portfolio', async () => {
    responders.push((c) => (path(c).endsWith('/getAllHolding') ? err('AB1015', 'Holding not found') : undefined));
    expect((await AngelOneClient.getHoldings()).holdings).toEqual([]);
  });

  it('reports HTTP 403 as a rate-limit error', async () => {
    responders.push((c) => (path(c).endsWith('/getAllHolding') ? json({ message: 'Access denied because of exceeding access rate' }, 403) : undefined));
    await expect(AngelOneClient.getHoldings()).rejects.toMatchObject({ code: 'RATE_LIMIT' });
  });

  it('never leaks credentials in error messages', async () => {
    responders.push((c) => (path(c).endsWith('/loginByPassword') ? err('AB1000', 'Invalid Email Or Password') : undefined));
    const e: any = await AngelOneClient.getProfile().catch((x) => x);
    expect(e).toBeInstanceOf(AngelOneError);
    for (const secret of [SECRETS.pin, SECRETS.apiKey, SECRETS.totpSecret]) expect(String(e.message)).not.toContain(secret);
  });

  it('refuses to call without configuration and rejects oversized quote batches', async () => {
    const saved = config.angelOne.pin;
    config.angelOne.pin = '';
    await expect(AngelOneClient.getProfile()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    config.angelOne.pin = saved;
    const tokens = Array.from({ length: 51 }, (_, i) => String(i));
    await expect(AngelOneClient.getQuotes('FULL', { NSE: tokens })).rejects.toMatchObject({ code: 'TOO_MANY_TOKENS' });
  });
});

describe('Instrument master', () => {
  it('derives base symbols from Angel One trading symbols', () => {
    expect(baseSymbol('RELIANCE-EQ')).toBe('RELIANCE');
    expect(baseSymbol('BAJAJ-AUTO-EQ')).toBe('BAJAJ-AUTO');
    expect(baseSymbol('M&M-EQ')).toBe('M&M');
    expect(baseSymbol('NIFTYBEES-BE')).toBe('NIFTYBEES');
    expect(baseSymbol('RELIANCE')).toBe('RELIANCE');
  });

  it('extracts flat JSON objects across arbitrary chunk boundaries', () => {
    const full = '[{"token":"1","symbol":"A-EQ"},{"token":"2","symbol":"B-EQ"},{"token":"3","symbol":"C-EQ"}]';
    let rest = '';
    const seen: string[] = [];
    for (let i = 0; i < full.length; i += 7) {
      const r = extractFlatObjects(rest + full.slice(i, i + 7));
      rest = r.rest;
      seen.push(...r.objects.map((o) => o.token));
    }
    expect(seen).toEqual(['1', '2', '3']);
  });

  it('streams the master, keeps only NSE/BSE cash rows and replaces the table', async () => {
    const rows: any[] = [];
    for (let i = 0; i < 1200; i++) rows.push({ token: String(50000 + i), symbol: `STREAM${i}-EQ`, name: `STREAM${i}`, expiry: '', strike: '-1.000000', lotsize: '1', instrumenttype: '', exch_seg: 'NSE', tick_size: '5.000000' });
    rows.push({ token: '1', symbol: 'NIFTY25JANFUT', name: 'NIFTY', expiry: '30JAN2025', instrumenttype: 'FUTIDX', exch_seg: 'NFO' });
    rows.push({ token: '2', symbol: 'GOLD', name: 'GOLD', instrumenttype: 'FUTCOM', exch_seg: 'MCX' });
    const text = JSON.stringify(rows);
    const enc = new TextEncoder().encode(text);
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) { for (let i = 0; i < enc.length; i += 4099) ctrl.enqueue(enc.slice(i, i + 4099)); ctrl.close(); },
    });
    const stub = jest.fn(async () => new Response(stream, { status: 200 })) as any;
    const stored = await refreshInstrumentMaster(stub);
    expect(stored).toBe(1200);
    const { rows: db } = await pool.query(`SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE exch_seg NOT IN ('NSE','BSE'))::int AS other FROM angelone_instruments`);
    expect(db[0]).toEqual({ n: 1200, other: 0 });

    // restore this suite's fixtures
    await pool.query(`DELETE FROM angelone_instruments WHERE name LIKE 'STREAM%'`);
    for (let i = 1; i <= 3; i++) await pool.query(`INSERT INTO angelone_instruments (exch_seg, token, symbol, name, series) VALUES ('NSE',$1,$2,$3,'EQ') ON CONFLICT DO NOTHING`, [String(9000 + i), `AOTEST${i}-EQ`, `AOTEST${i}`]);
    for (let i = 1; i <= 120; i++) await pool.query(`INSERT INTO angelone_instruments (exch_seg, token, symbol, name, series) VALUES ('NSE',$1,$2,$3,'EQ') ON CONFLICT DO NOTHING`, [String(20000 + i), `AOQ${i}-EQ`, `AOQ${i}`]);
    await pool.query(`INSERT INTO angelone_instruments (exch_seg, token, symbol, name, series) VALUES ('BSE','599001','AOTEST1','AOTEST1',NULL) ON CONFLICT DO NOTHING`);
  });

  it('keeps the old data when the download is incomplete', async () => {
    const before = (await pool.query(`SELECT COUNT(*)::int AS n FROM angelone_instruments`)).rows[0].n;
    const stub = jest.fn(async () => new Response(JSON.stringify([{ token: '1', symbol: 'A-EQ', name: 'A', instrumenttype: '', exch_seg: 'NSE' }]), { status: 200 })) as any;
    await expect(refreshInstrumentMaster(stub)).rejects.toThrow(/incomplete/);
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM angelone_instruments`)).rows[0].n).toBe(before);
  });

  it('resolves securities to tokens, preferring EQ series on the requested exchange', async () => {
    const m = await resolveInstruments([
      { id: 'a', symbol: 'AOTEST1', exchange: 'NSE' },
      { id: 'b', symbol: 'AOTEST1-EQ', exchange: 'BSE' },
      { id: 'c', symbol: 'NOSUCHSYMBOL', exchange: 'NSE' },
    ]);
    expect(m.get('a')).toEqual({ exchange: 'NSE', token: '9001', tradingSymbol: 'AOTEST1-EQ' });
    expect(m.get('b')).toEqual({ exchange: 'BSE', token: '599001', tradingSymbol: 'AOTEST1' });
    expect(m.has('c')).toBe(false);
  });
});

describe('AngelOneProvider (market data)', () => {
  it('parses FULL quotes and dates them from the exchange trade time', async () => {
    expect(quoteDate({ exchTradeTime: '21-Jun-2023 10:46:09' } as any)).toBe('2023-06-21');
    const q = await new AngelOneProvider().getQuotes([{ id: 's1', symbol: 'AOTEST1', exchange: 'NSE', security_type: 'STOCK' }]);
    const quote = q.get('s1')!;
    expect(quote).toMatchObject({ source: 'ANGEL_ONE', currency: 'INR', priceDate: '2023-06-21', previousClose: 99.5, changePct: 0.5, volume: 12345, isStale: false });
    expect(quote.price).toBeGreaterThan(0);
    const req = callsTo('/market/v1/quote/')[0];
    expect(req.body).toEqual({ mode: 'FULL', exchangeTokens: { NSE: ['9001'] } });
  });

  it('batches at most 50 symbols per request and skips mutual funds', async () => {
    const secs = Array.from({ length: 120 }, (_, i) => ({ id: `q${i + 1}`, symbol: `AOQ${i + 1}`, exchange: 'NSE', security_type: 'STOCK' }));
    secs.push({ id: 'mf', symbol: 'AOTEST2', exchange: 'AMFI', security_type: 'MUTUAL_FUND' });
    const q = await new AngelOneProvider().getQuotes(secs);
    const sizes = callsTo('/market/v1/quote/').map((c) => Object.values<string[]>(c.body.exchangeTokens).reduce((n, t) => n + t.length, 0));
    expect(sizes).toEqual([50, 50, 20]);
    expect(q.size).toBe(120);
    expect(q.has('mf')).toBe(false);
  });

  it('returns nothing, without calling Angel One, when not configured', async () => {
    const saved = config.angelOne.apiKey;
    config.angelOne.apiKey = '';
    const q = await new AngelOneProvider().getQuotes([{ id: 's1', symbol: 'AOTEST1', exchange: 'NSE', security_type: 'STOCK' }]);
    config.angelOne.apiKey = saved;
    expect(q.size).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

describe('Angel One API routes', () => {
  it('requires a PFinanc login', async () => {
    expect((await request(app).get('/api/integrations/angelone/status')).status).toBe(401);
  });

  it('reports status without exposing any secret', async () => {
    const res = await request(app).get('/api/integrations/angelone/status').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ configured: true, available: true });
    expect(res.body.data.coverage.mutualFunds).toMatch(/not available/i);
    const body = JSON.stringify(res.body);
    for (const secret of [SECRETS.pin, SECRETS.apiKey, SECRETS.totpSecret, SECRETS.clientCode]) expect(body).not.toContain(secret);
    expect(res.body.data.clientCode).toMatch(/•/);
  });

  it('explains how to configure when credentials are missing', async () => {
    const saved = config.angelOne.totpSecret;
    config.angelOne.totpSecret = '';
    const status = await request(app).get('/api/integrations/angelone/status').set(auth());
    expect(status.body.data).toMatchObject({ configured: false, available: false });
    expect(status.body.data.requiredEnv).toContain('ANGELONE_TOTP_SECRET');
    const test = await request(app).post('/api/integrations/angelone/test').set(auth());
    expect(test.status).toBe(400);
    expect(test.body.error.code).toBe('NOT_CONFIGURED');
    config.angelOne.totpSecret = saved;
  });

  it('keeps other households and non-admin members out', async () => {
    const stranger = await request(app).post('/api/auth/register').send({ email: `angel_s_${Date.now()}@test.local`, password: 'Password@123', name: 'Stranger' });
    const sAuth = auth(stranger.body.data.token, stranger.body.data.defaultHouseholdId);
    const status = await request(app).get('/api/integrations/angelone/status').set(sAuth);
    expect(status.body.data.available).toBe(false);
    for (const [m, p] of [['post', '/test'], ['get', '/holdings'], ['post', '/holdings/sync'], ['post', '/prices/sync'], ['get', '/quotes?symbols=TCS']] as const) {
      const r = await (request(app) as any)[m](`/api/integrations/angelone${p}`).set(sAuth);
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe('NOT_ALLOWED');
    }
    expect(calls).toHaveLength(0); // never reached Angel One

    // a MEMBER of the allowed household is also refused
    await pool.query(`INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'MEMBER')`, [householdId, stranger.body.data.user.id]);
    const member = await request(app).post('/api/integrations/angelone/test').set(auth(stranger.body.data.token, householdId));
    expect(member.status).toBe(403);
    expect(member.body.error.code).toBe('OWNER_OR_ADMIN_ONLY');
  });

  it('tests the connection and returns only non-sensitive profile fields', async () => {
    const res = await request(app).post('/api/integrations/angelone/test').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ connected: true, name: 'TEST USER' });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('secret@example.com');
    expect(body).not.toContain('9999999999');
    expect(body).not.toContain(SECRETS.clientCode);
  });

  it('turns an Angel One failure into a helpful error', async () => {
    responders.push((c) => (path(c).endsWith('/loginByPassword') ? err('AB1000', 'Invalid Email Or Password') : undefined));
    const res = await request(app).post('/api/integrations/angelone/test').set(auth());
    expect(res.status).toBe(502);
    expect(res.body.error.message).toMatch(/ANGELONE_CLIENT_CODE/);
    expect(JSON.stringify(res.body)).not.toContain(SECRETS.pin);
  });

  it('looks up live quotes for any symbol', async () => {
    const res = await request(app).get('/api/integrations/angelone/quotes?symbols=AOTEST1,NOSUCH').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ symbol: 'AOTEST1', found: true });
    expect(res.body.data[1]).toEqual({ symbol: 'NOSUCH', found: false });
    expect((await request(app).get('/api/integrations/angelone/quotes?symbols=').set(auth())).status).toBe(400);
  });
});

describe('Holdings import', () => {
  const holdingsApi = async () =>
    (await request(app).get('/api/investments/portfolio/holdings?view=personal').set(auth())).body.data as any[];

  it('previews without storing anything', async () => {
    holdings = [rawHolding({}), rawHolding({ tradingsymbol: 'AOTEST2-EQ', isin: 'INEAOTEST002', quantity: 5, averageprice: 50, ltp: 40, symboltoken: '9002', profitandloss: -50, pnlpercentage: -20 })];
    const res = await request(app).get('/api/integrations/angelone/holdings').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.totals).toMatchObject({ holdingsCount: 2, invested: 1250, currentValue: 1400 });
    expect(res.body.data.holdings.every((h: any) => h.isNewSecurity)).toBe(true);
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM securities WHERE isin LIKE 'INEAOTEST%'`)).rows[0].n).toBe(0);
  });

  it('imports holdings as snapshots on an Angel One brokerage account', async () => {
    holdings = [rawHolding({}), rawHolding({ tradingsymbol: 'AOTEST2-EQ', isin: 'INEAOTEST002', quantity: 5, averageprice: 50, ltp: 40, symboltoken: '9002' })];
    const res = await request(app).post('/api/integrations/angelone/holdings/sync').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ account: 'Angel One (Demat)', holdings: 2, securitiesCreated: 2, snapshotsSaved: 2, closedPositions: 0, pricesSaved: 2 });

    const acct = await pool.query(`SELECT account_type, institution_name, owner_user_id FROM accounts WHERE household_id = $1 AND institution_name = 'Angel One'`, [householdId]);
    expect(acct.rows).toEqual([{ account_type: 'BROKERAGE', institution_name: 'Angel One', owner_user_id: userId }]);

    const list = await holdingsApi();
    const a = list.find((h) => h.symbol === 'AOTEST1')!;
    expect(a).toMatchObject({ current_quantity: 10, average_cost: 100, current_price: 120, account_name: 'Angel One (Demat)' });
    expect(a.current_value).toBe(1200);
    expect(a.unrealized_pnl).toBe(200);
  });

  it('is idempotent on a re-run (no duplicate account, securities or snapshots)', async () => {
    holdings = [rawHolding({}), rawHolding({ tradingsymbol: 'AOTEST2-EQ', isin: 'INEAOTEST002', quantity: 5, averageprice: 50, ltp: 40, symboltoken: '9002' })];
    const res = await request(app).post('/api/integrations/angelone/holdings/sync').set(auth());
    expect(res.body.data).toMatchObject({ securitiesCreated: 0, snapshotsSaved: 2 });
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM accounts WHERE household_id = $1 AND institution_name = 'Angel One'`, [householdId])).rows[0].n).toBe(1);
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM investment_holdings WHERE family_id = $1`, [householdId])).rows[0].n).toBe(2);
  });

  it('updates quantity and cost on a later sync, and zeroes positions that were sold', async () => {
    holdings = [rawHolding({ quantity: 25, averageprice: 110 })]; // AOTEST2 gone, AOTEST1 bought more
    const res = await request(app).post('/api/integrations/angelone/holdings/sync').set(auth());
    expect(res.body.data).toMatchObject({ holdings: 1, closedPositions: 1 });
    const list = await holdingsApi();
    expect(list.find((h) => h.symbol === 'AOTEST1')).toMatchObject({ current_quantity: 25, average_cost: 110 });
    const sold = list.find((h) => h.symbol === 'AOTEST2');
    expect(!sold || sold.current_quantity === 0).toBe(true);
  });

  it('records each sync for the status screen', async () => {
    const res = await request(app).get('/api/integrations/angelone/status').set(auth());
    expect(res.body.data.lastSync.holdings).toMatchObject({ status: 'OK', summary: expect.objectContaining({ holdings: 1 }) });
  });

  it('logs a failed sync without losing the error reason', async () => {
    responders.push((c) => (path(c).endsWith('/loginByPassword') ? err('AB1000', 'Invalid Email Or Password') : undefined));
    const res = await request(app).post('/api/integrations/angelone/holdings/sync').set(auth());
    expect(res.status).toBe(502);
    const log = await pool.query(`SELECT status, error FROM angelone_sync_log WHERE household_id = $1 AND kind = 'HOLDINGS' ORDER BY created_at DESC LIMIT 1`, [householdId]);
    expect(log.rows[0].status).toBe('FAILED');
    expect(log.rows[0].error).not.toContain(SECRETS.pin);
  });
});

describe('Price refresh through the default provider chain', () => {
  it('stores Angel One prices for held stocks and reports the source', async () => {
    holdings = [rawHolding({ quantity: 25, averageprice: 110 })];
    await request(app).post('/api/integrations/angelone/holdings/sync').set(auth());
    calls = [];
    const res = await request(app).post('/api/integrations/angelone/prices/sync').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBeGreaterThanOrEqual(1);
    expect(res.body.data.bySource.ANGEL_ONE).toBeGreaterThanOrEqual(1);
    const quoteCall = callsTo('/market/v1/quote/')[0];
    expect(quoteCall.body.mode).toBe('FULL');
    const price = await pool.query(
      `SELECT sp.source, sp.volume FROM security_prices sp JOIN securities s ON s.id = sp.security_id WHERE s.isin = 'INEAOTEST001' AND sp.source = 'ANGEL_ONE' AND sp.volume IS NOT NULL ORDER BY sp.price_date DESC LIMIT 1`
    );
    expect(price.rows[0].source).toBe('ANGEL_ONE');
    expect(Number(price.rows[0].volume)).toBe(12345);
  });
});
