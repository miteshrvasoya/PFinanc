import { config } from '../../config/env.js';
import { generateTotp } from './totp.js';

/**
 * Minimal client for Angel One SmartAPI (https://smartapi.angelone.in/docs). Only the endpoints PFinanc uses:
 * login/refresh/logout, profile, holdings, market quotes and scrip search. Everything is read-only.
 *
 * Facts taken from the official docs:
 *  - Base URL https://apiconnect.angelone.in; every call sends X-PrivateKey (the app's API key), X-UserType USER,
 *    X-SourceID WEB and client IP/MAC headers; secure calls add "Authorization: Bearer <jwt>".
 *  - Rate limits are enforced per client code and per API (login 1/s, holdings 1/s, quote 1/s with up to 50
 *    symbols, searchScrip 1/s). Exceeding a limit returns HTTP 403 "Access denied".
 *  - Documented error codes that mean the session is invalid or expired (log in again): AG8001 Invalid Token,
 *    AG8002 Token Expired, AG8003 Token missing, AB8050/AB8051 Invalid/Expired Refresh Token, AB1010 AMX Session
 *    Expired, AB1011 Client not login. AB1015 ("Holding not found") simply means an empty portfolio.
 *
 * Credentials come only from the backend .env, are never logged, and never appear in error messages.
 */

export class AngelOneError extends Error {
  constructor(public readonly code: string, message: string, public readonly httpStatus?: number) {
    super(message);
    this.name = 'AngelOneError';
  }
}

export const SESSION_ERROR_CODES = new Set(['AG8001', 'AG8002', 'AG8003', 'AB8050', 'AB8051', 'AB1010', 'AB1011']);
const REQUEST_TIMEOUT_MS = 15_000;
const SESSION_MAX_AGE_MS = 12 * 3600_000; // proactively renew long-lived sessions; reactive refresh covers the rest

export const angelOneConfigured = (): boolean => {
  const c = config.angelOne;
  return !!(c.apiKey && c.clientCode && c.pin && c.totpSecret);
};

// ── Types (field names exactly as documented) ────────────────────────────────

export interface RawHolding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  t1quantity?: number;
  averageprice: number;
  ltp: number;
  close?: number;
  symboltoken: string;
  profitandloss?: number;
  pnlpercentage?: number;
  product?: string;
}

export interface RawQuote {
  exchange: string;
  tradingSymbol: string;
  symbolToken: string;
  ltp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number; // previous close
  netChange?: number;
  percentChange?: number;
  tradeVolume?: number;
  exchTradeTime?: string; // "21-Jun-2023 10:46:09"
  exchFeedTime?: string;
  '52WeekLow'?: number;
  '52WeekHigh'?: number;
}

export type QuoteMode = 'LTP' | 'OHLC' | 'FULL';

/** Candle intervals offered by the historical API, with the documented maximum days per request. */
export const CANDLE_INTERVALS = {
  ONE_MINUTE: 30, THREE_MINUTE: 60, FIVE_MINUTE: 100, TEN_MINUTE: 100,
  FIFTEEN_MINUTE: 200, THIRTY_MINUTE: 200, ONE_HOUR: 400, ONE_DAY: 2000,
} as const;
export type CandleInterval = keyof typeof CANDLE_INTERVALS;

export interface Candle { t: string; o: number; h: number; l: number; c: number; v: number }

// ── Rate gate: serialises calls per API and enforces a minimum gap ───────────

const lastCall = new Map<string, number>();
const chains = new Map<string, Promise<void>>();
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Multiplier on all gaps. Tests set it to 0; production keeps 1. */
export const rateGate = { scale: 1 };

function gate(key: string, gapMs: number): Promise<void> {
  const prev = chains.get(key) ?? Promise.resolve();
  const run = prev.then(async () => {
    const wait = (lastCall.get(key) ?? 0) + gapMs * rateGate.scale - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall.set(key, Date.now());
  });
  chains.set(key, run.catch(() => undefined));
  return run;
}

/**
 * The candle API also has per-minute (40) and per-hour (2000) budgets. Rather than queue for a minute, fail fast with a
 * rate-limit error so the caller can fall back to stored prices.
 */
const windows = new Map<string, number[]>();
async function windowGuard(key: string, max: number, windowMs: number, patient = false) {
  for (;;) {
    const now = Date.now();
    const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length < max) {
      recent.push(now);
      windows.set(key, recent);
      return;
    }
    windows.set(key, recent);
    // Interactive callers fail fast; batch jobs (the daily signal run) wait for the budget to free up instead.
    if (!patient) throw new AngelOneError('RATE_LIMIT', 'Too many chart requests in the last minute. Wait a moment and try again.');
    await sleep(Math.min(windowMs, recent[0] + windowMs - now + 50) * rateGate.scale);
  }
}
export const resetAngelOneWindows = () => windows.clear();

// ── Session (memory only, never persisted) ───────────────────────────────────

interface Session { jwt: string; refresh: string; feed: string; createdAt: number }
let session: Session | null = null;
let sessionPromise: Promise<Session> | null = null;

export const resetAngelOneSession = () => { session = null; sessionPromise = null; };

function baseHeaders(withAuth: boolean): Record<string, string> {
  const c = config.angelOne;
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': c.localIp,
    'X-ClientPublicIP': c.publicIp,
    'X-MACAddress': c.macAddress,
    'X-PrivateKey': c.apiKey,
  };
  if (withAuth && session) h.Authorization = `Bearer ${session.jwt}`;
  return h;
}

interface CallOptions { body?: unknown; auth: boolean; gateKey: string; gapMs: number }

async function rawCall<T>(method: 'GET' | 'POST', path: string, o: CallOptions): Promise<T> {
  await gate(o.gateKey, o.gapMs);
  let res: Response;
  try {
    res = await fetch(`${config.angelOne.baseUrl}${path}`, {
      method,
      headers: baseHeaders(o.auth),
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: any) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw new AngelOneError(timedOut ? 'TIMEOUT' : 'NETWORK', timedOut ? 'Angel One did not respond in time.' : 'Could not reach Angel One. Check the server\'s internet access.');
  }

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body handled below */ }

  if (res.status === 403) {
    throw new AngelOneError('RATE_LIMIT', 'Angel One rate limit reached (HTTP 403). Wait a few seconds and try again.', 403);
  }
  if (!json || typeof json !== 'object') {
    throw new AngelOneError('BAD_RESPONSE', `Unexpected response from Angel One (HTTP ${res.status}).`, res.status);
  }
  if (json.status === false || (json.errorcode && json.status !== true)) {
    const code = String(json.errorcode || 'UNKNOWN');
    throw new AngelOneError(code, String(json.message || 'Angel One rejected the request.'), res.status);
  }
  return json.data as T;
}

// ── Login / refresh ──────────────────────────────────────────────────────────

async function login(): Promise<Session> {
  const c = config.angelOne;
  if (!angelOneConfigured()) throw new AngelOneError('NOT_CONFIGURED', 'Angel One credentials are not set in the backend .env.');

  const attempt = async () => {
    const data = await rawCall<{ jwtToken: string; refreshToken: string; feedToken: string }>(
      'POST', '/rest/auth/angelbroking/user/v1/loginByPassword',
      { auth: false, gateKey: 'login', gapMs: 1100, body: { clientcode: c.clientCode, password: c.pin, totp: generateTotp(c.totpSecret) } }
    );
    if (!data?.jwtToken) throw new AngelOneError('BAD_RESPONSE', 'Angel One login returned no session token.');
    return { jwt: data.jwtToken, refresh: data.refreshToken, feed: data.feedToken, createdAt: Date.now() } as Session;
  };

  try {
    return await attempt();
  } catch (err) {
    // A code generated right at a 30 s boundary can be rejected; one retry with a fresh code fixes that.
    if (err instanceof AngelOneError && /totp|otp/i.test(err.message)) {
      await sleep(1500 * rateGate.scale);
      return attempt();
    }
    throw err;
  }
}

async function ensureSession(force = false): Promise<Session> {
  if (!force && session && Date.now() - session.createdAt < SESSION_MAX_AGE_MS) return session;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        if (session?.refresh) {
          try {
            const t = await rawCall<{ jwtToken: string; refreshToken: string; feedToken: string }>(
              'POST', '/rest/auth/angelbroking/jwt/v1/generateTokens',
              { auth: true, gateKey: 'generateTokens', gapMs: 1100, body: { refreshToken: session.refresh } }
            );
            if (t?.jwtToken) {
              session = { jwt: t.jwtToken, refresh: t.refreshToken || session.refresh, feed: t.feedToken || session.feed, createdAt: Date.now() };
              return session;
            }
          } catch { /* fall through to a full login */ }
        }
        session = await login();
        return session;
      } finally {
        sessionPromise = null;
      }
    })();
  }
  return sessionPromise;
}

/** Call a secure endpoint; on an expired session renew it once and retry. */
async function secure<T>(method: 'GET' | 'POST', path: string, gateKey: string, gapMs: number, body?: unknown): Promise<T> {
  await ensureSession();
  try {
    return await rawCall<T>(method, path, { auth: true, gateKey, gapMs, body });
  } catch (err) {
    if (err instanceof AngelOneError && SESSION_ERROR_CODES.has(err.code)) {
      await ensureSession(true);
      return rawCall<T>(method, path, { auth: true, gateKey, gapMs, body });
    }
    throw err;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const AngelOneClient = {
  /** Verifies the credentials and returns the (non-sensitive) profile. */
  async getProfile() {
    return secure<{ clientcode: string; name: string; email?: string; exchanges?: string[]; products?: string[] }>(
      'GET', '/rest/secure/angelbroking/user/v1/getProfile', 'profile', 400
    );
  },

  /** Demat holdings: { holdings: RawHolding[], totalholding: {...} }. */
  async getHoldings(): Promise<{ holdings: RawHolding[]; totalholding?: Record<string, number> }> {
    let data: any;
    try {
      data = await secure<any>('GET', '/rest/secure/angelbroking/portfolio/v1/getAllHolding', 'holdings', 1100);
    } catch (err) {
      // AB1015 "Holding not found": the account simply has no holdings.
      if (err instanceof AngelOneError && err.code === 'AB1015') return { holdings: [] };
      throw err;
    }
    if (Array.isArray(data)) return { holdings: data };
    return { holdings: data?.holdings || [], totalholding: data?.totalholding };
  },

  /** Up to 50 tokens per request, 1 request per second (documented limits). */
  async getQuotes(mode: QuoteMode, exchangeTokens: Record<string, string[]>): Promise<{ fetched: RawQuote[]; unfetched: Array<{ exchange: string; symbolToken: string; message?: string; errorCode?: string }> }> {
    const total = Object.values(exchangeTokens).reduce((n, t) => n + t.length, 0);
    if (total === 0) return { fetched: [], unfetched: [] };
    if (total > 50) throw new AngelOneError('TOO_MANY_TOKENS', 'A quote request can carry at most 50 symbols.');
    const data = await secure<any>('POST', '/rest/secure/angelbroking/market/v1/quote/', 'quote', 1100, { mode, exchangeTokens });
    return { fetched: data?.fetched || [], unfetched: data?.unfetched || [] };
  },

  /**
   * Historical candles. fromdate/todate are "yyyy-MM-dd HH:mm" in India time. Each record is documented as
   * [timestamp, open, high, low, close, volume]. Limits: 2/s, 40/min, 2000/h, and a maximum span per interval.
   */
  async getCandles(exchange: 'NSE' | 'BSE', symbolToken: string, interval: CandleInterval, fromdate: string, todate: string, opts: { patient?: boolean } = {}): Promise<Candle[]> {
    await windowGuard('candles', 40, 60_000, opts.patient);
    const rows = await secure<any[]>('POST', '/rest/secure/angelbroking/historical/v1/getCandleData', 'candles', 550, { exchange, symboltoken: symbolToken, interval, fromdate, todate });
    return (rows || [])
      .filter((r) => Array.isArray(r) && r.length >= 5)
      .map((r) => ({ t: String(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]), v: Number(r[5]) || 0 }))
      .filter((c) => c.c > 0);
  },

  async searchScrip(exchange: 'NSE' | 'BSE', text: string): Promise<Array<{ exchange: string; tradingsymbol: string; symboltoken: string }>> {
    return (await secure<any[]>('POST', '/rest/secure/angelbroking/order/v1/searchScrip', 'search', 1100, { exchange, searchscrip: text })) || [];
  },

  /** Ends the Angel One session (they recommend logging out after use). Failure is harmless. */
  async logout(): Promise<void> {
    if (!session) return;
    try {
      await rawCall('POST', '/rest/secure/angelbroking/user/v1/logout', { auth: true, gateKey: 'logout', gapMs: 1100, body: { clientcode: config.angelOne.clientCode } });
    } catch { /* ignore */ }
    resetAngelOneSession();
  },
};

/** Friendly text for errors shown in the apps. Never includes credentials. */
export function describeAngelOneError(err: unknown): { code: string; message: string } {
  if (err instanceof AngelOneError) {
    const hints: Record<string, string> = {
      NOT_CONFIGURED: 'Angel One is not set up. Add ANGELONE_API_KEY, ANGELONE_CLIENT_CODE, ANGELONE_PIN and ANGELONE_TOTP_SECRET to the backend .env and restart.',
      AB1000: 'Angel One rejected the login. Check ANGELONE_CLIENT_CODE and ANGELONE_PIN.',
      AB1006: 'Angel One reports this client is blocked for trading. Contact Angel One support.',
      AB1009: 'Angel One could not find that symbol.',
      AG8001: 'The Angel One session was rejected. Try again; PFinanc will log in afresh.',
    };
    return { code: err.code, message: hints[err.code] || err.message };
  }
  return { code: 'UNKNOWN', message: (err as any)?.message || 'Something went wrong talking to Angel One.' };
}
