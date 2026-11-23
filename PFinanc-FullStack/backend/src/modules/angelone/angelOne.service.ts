import { config } from '../../config/env.js';
import { pool } from '../../database/db.js';
import { QueryHelper } from '../../database/queryHelper.js';
import { HoldingsService } from '../investments/holdings/holdings.service.js';
import { MarketDataService } from '../investments/prices/marketData.service.js';
import { AngelOneClient, AngelOneError, angelOneConfigured, describeAngelOneError, RawHolding } from './angelOneClient.js';
import { AngelOneProvider, istDate } from './angelOneProvider.js';
import { baseSymbol, ensureInstrumentMaster } from './instruments.js';

export function httpError(status: number, code: string, message: string) {
  const e: any = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export interface AngelHolding {
  symbol: string;
  tradingSymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  averagePrice: number;
  ltp: number;
  previousClose: number | null;
  investedValue: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  token: string;
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const maskClient = (c: string) => (c.length <= 3 ? '•••' : `${c[0]}${'•'.repeat(Math.max(2, c.length - 3))}${c.slice(-2)}`);

/** ETFs are listed like stocks but should be classed as ETFs. Heuristic on the symbol only. */
const looksLikeEtf = (symbol: string) => /BEES$|ETF$|^ETF|IETF|LIQUID|NIFTY(BEES|IETF)/i.test(symbol);

export class AngelOneService {
  /** The one household allowed to use this server's broker login: ANGELONE_HOUSEHOLD_ID, else the oldest household. */
  static async allowedHouseholdId(): Promise<string | null> {
    if (config.angelOne.householdId) return config.angelOne.householdId;
    const row = await QueryHelper.queryOne<{ id: string }>(`SELECT id FROM households ORDER BY created_at ASC LIMIT 1`);
    return row?.id ?? null;
  }

  /**
   * The broker credentials belong to one person, so on a server with several households only the allowed
   * household's owner/admins may read the account or write its data. Everyone else gets a 403.
   */
  static async assertAccess(householdId: string, userId: string) {
    if (!angelOneConfigured()) throw httpError(400, 'NOT_CONFIGURED', describeAngelOneError(new AngelOneError('NOT_CONFIGURED', '')).message);
    if ((await this.allowedHouseholdId()) !== householdId) {
      throw httpError(403, 'NOT_ALLOWED', 'The Angel One connection on this server belongs to a different household.');
    }
    const m = await QueryHelper.queryOne<{ role: string }>(`SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`, [householdId, userId]);
    if (!m || (m.role !== 'OWNER' && m.role !== 'ADMIN')) {
      throw httpError(403, 'OWNER_OR_ADMIN_ONLY', 'Only a household owner or admin can use the Angel One connection.');
    }
  }

  // ── Status ───────────────────────────────────────────────────────────────

  static async getStatus(householdId: string, userId: string) {
    const configured = angelOneConfigured();
    const allowed = (await this.allowedHouseholdId()) === householdId;
    const m = await QueryHelper.queryOne<{ role: string }>(`SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`, [householdId, userId]);
    const canManage = !!m && (m.role === 'OWNER' || m.role === 'ADMIN');

    const base = {
      configured,
      available: configured && allowed && canManage,
      requiredEnv: ['ANGELONE_API_KEY', 'ANGELONE_CLIENT_CODE', 'ANGELONE_PIN', 'ANGELONE_TOTP_SECRET'],
      coverage: {
        stocksAndEtfs: 'Live prices and holdings through Angel One SmartAPI.',
        mutualFunds: 'Mutual funds are not available in SmartAPI, so their NAVs continue to come from the free AMFI-based source.',
      },
    };
    if (!configured || !allowed || !canManage) {
      return {
        ...base,
        reason: !configured
          ? 'Not configured. Add the Angel One credentials to the backend .env and restart.'
          : !allowed ? 'The Angel One connection on this server belongs to a different household.'
          : 'Only a household owner or admin can use the Angel One connection.',
      };
    }

    const logs = await QueryHelper.query<any>(
      `SELECT DISTINCT ON (kind) kind, status, summary, error, created_at
       FROM angelone_sync_log WHERE household_id = $1 OR kind = 'MASTER' ORDER BY kind, created_at DESC`,
      [householdId]
    );
    const inst = await QueryHelper.queryOne<{ n: string; newest: Date | null }>(`SELECT COUNT(*)::text AS n, MAX(loaded_at) AS newest FROM angelone_instruments`);
    return {
      ...base,
      clientCode: maskClient(config.angelOne.clientCode),
      autoRefreshPrices: config.angelOne.autoRefreshPrices,
      priceRefreshMinutes: config.angelOne.priceRefreshMinutes,
      instruments: { count: Number(inst?.n || 0), loadedAt: inst?.newest ?? null },
      lastSync: Object.fromEntries(logs.map((l) => [l.kind.toLowerCase(), { status: l.status, at: l.created_at, summary: l.summary, error: l.error }])),
    };
  }

  /** Logs in and reads the profile: proves the API key, client code, PIN and TOTP secret all work. */
  static async testConnection(householdId: string, userId: string) {
    await this.assertAccess(householdId, userId);
    const p = await AngelOneClient.getProfile();
    return { connected: true, name: p.name, clientCode: maskClient(p.clientcode || config.angelOne.clientCode), exchanges: p.exchanges ?? [], products: p.products ?? [] };
  }

  // ── Holdings ─────────────────────────────────────────────────────────────

  static normalizeHoldings(raw: RawHolding[]): AngelHolding[] {
    return raw
      .filter((h) => Number(h.quantity) > 0)
      .map((h) => {
        const qty = Number(h.quantity);
        const avg = Number(h.averageprice) || 0;
        const ltp = Number(h.ltp) || 0;
        const invested = qty * avg;
        const current = qty * ltp;
        const pnl = h.profitandloss != null ? Number(h.profitandloss) : current - invested;
        return {
          symbol: baseSymbol(h.tradingsymbol),
          tradingSymbol: h.tradingsymbol,
          exchange: h.exchange,
          isin: (h.isin || '').toUpperCase(),
          quantity: qty,
          averagePrice: round2(avg),
          ltp: round2(ltp),
          previousClose: h.close != null ? round2(Number(h.close)) : null,
          investedValue: round2(invested),
          currentValue: round2(current),
          pnl: round2(pnl),
          pnlPct: h.pnlpercentage != null ? round2(Number(h.pnlpercentage)) : invested > 0 ? round2((pnl / invested) * 100) : 0,
          token: h.symboltoken,
        };
      });
  }

  /** Live read from Angel One without storing anything, annotated with what PFinanc already knows. */
  static async previewHoldings(householdId: string, userId: string) {
    await this.assertAccess(householdId, userId);
    const { holdings: raw } = await AngelOneClient.getHoldings();
    const holdings = this.normalizeHoldings(raw);

    const known = await HoldingsService.calculateHoldings({ householdId, userId });
    const byIsin = new Map<string, number>();
    for (const k of known) if (k.isin) byIsin.set(k.isin.toUpperCase(), (byIsin.get(k.isin.toUpperCase()) || 0) + k.current_quantity);
    const existing = await QueryHelper.query<{ isin: string }>(`SELECT isin FROM securities WHERE isin = ANY($1::text[])`, [holdings.map((h) => h.isin).filter(Boolean)]);
    const existingIsins = new Set(existing.map((e) => e.isin));

    const invested = holdings.reduce((s, h) => s + h.investedValue, 0);
    const current = holdings.reduce((s, h) => s + h.currentValue, 0);
    return {
      fetchedAt: new Date().toISOString(),
      totals: { holdingsCount: holdings.length, invested: round2(invested), currentValue: round2(current), pnl: round2(current - invested), pnlPct: invested > 0 ? round2(((current - invested) / invested) * 100) : 0 },
      holdings: holdings.map((h) => ({ ...h, isNewSecurity: !existingIsins.has(h.isin), pfinancQuantity: byIsin.get(h.isin) ?? 0 })),
    };
  }

  /**
   * Import the current Angel One holdings as holding snapshots on a dedicated "Angel One" brokerage account.
   * Snapshots are keyed per account + security + day, so re-running the same day updates in place, and the app's
   * holdings engine never double counts them with transaction history. Positions that disappeared from the
   * account get a zero-quantity snapshot so they stop showing as owned.
   */
  static async syncHoldings(householdId: string, userId: string) {
    await this.assertAccess(householdId, userId);
    try {
      const { holdings: raw } = await AngelOneClient.getHoldings();
      const holdings = this.normalizeHoldings(raw);
      const today = istDate();

      const client = await pool.connect();
      const summary = { account: '', holdings: holdings.length, securitiesCreated: 0, snapshotsSaved: 0, closedPositions: 0, pricesSaved: 0, skippedNoIsin: 0 };
      try {
        await client.query('BEGIN');

        let account = await QueryHelper.queryOne<{ id: string; name: string }>(
          `SELECT id, name FROM accounts WHERE household_id = $1 AND owner_user_id = $2 AND account_type = 'BROKERAGE' AND institution_name = 'Angel One' AND is_active = true ORDER BY created_at LIMIT 1`,
          [householdId, userId], client
        );
        if (!account) {
          account = await QueryHelper.insert<{ id: string; name: string }>('accounts', {
            household_id: householdId, owner_user_id: userId, name: 'Angel One (Demat)', account_type: 'BROKERAGE',
            institution_name: 'Angel One', account_number_masked: maskClient(config.angelOne.clientCode), currency: 'INR',
            opening_balance: 0, is_shared: false, notes: 'Holdings synced from Angel One SmartAPI',
          }, client);
        }
        summary.account = account!.name;

        const seen = new Set<string>();
        for (const h of holdings) {
          if (!h.isin) { summary.skippedNoIsin++; continue; }
          const type = looksLikeEtf(h.symbol) ? 'ETF' : 'STOCK';
          let sec = await QueryHelper.queryOne<{ id: string }>(`SELECT id FROM securities WHERE isin = $1`, [h.isin], client);
          if (!sec) sec = await QueryHelper.queryOne<{ id: string }>(`SELECT id FROM securities WHERE UPPER(symbol) = $1 AND exchange = $2 LIMIT 1`, [h.symbol, h.exchange], client);
          if (!sec) {
            sec = await QueryHelper.insert<{ id: string }>('securities', {
              symbol: h.symbol, isin: h.isin, name: h.symbol, security_type: type, exchange: h.exchange === 'BSE' ? 'BSE' : 'NSE',
              asset_class: type === 'ETF' ? 'ETF' : 'EQUITY', currency: 'INR',
            }, client);
            summary.securitiesCreated++;
          }
          seen.add(sec!.id);

          await client.query(
            `INSERT INTO investment_holdings (family_id, user_id, investment_account_id, instrument_id, quantity, average_cost, invested_amount, current_price, current_value, as_of_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (investment_account_id, instrument_id, as_of_date) DO UPDATE SET
               quantity = EXCLUDED.quantity, average_cost = EXCLUDED.average_cost, invested_amount = EXCLUDED.invested_amount,
               current_price = EXCLUDED.current_price, current_value = EXCLUDED.current_value, updated_at = NOW()`,
            [householdId, userId, account!.id, sec!.id, h.quantity, h.averagePrice, h.investedValue, h.ltp, h.currentValue, today]
          );
          summary.snapshotsSaved++;

          if (h.ltp > 0) {
            await client.query(
              `INSERT INTO security_prices (security_id, price_date, close, adjusted_close, currency, source, is_stale)
               VALUES ($1,$2,$3,$3,'INR','ANGEL_ONE',false)
               ON CONFLICT (security_id, price_date) DO UPDATE SET close = EXCLUDED.close, adjusted_close = EXCLUDED.adjusted_close, source = 'ANGEL_ONE', is_stale = false`,
              [sec!.id, today, h.ltp]
            );
            summary.pricesSaved++;
          }
        }

        // Positions sold since the last sync: latest snapshot still shows units, Angel One no longer lists them.
        const open = await QueryHelper.query<{ instrument_id: string; average_cost: string }>(
          `SELECT instrument_id, average_cost FROM (
             SELECT DISTINCT ON (instrument_id) instrument_id, quantity, average_cost
             FROM investment_holdings WHERE investment_account_id = $1 ORDER BY instrument_id, as_of_date DESC
           ) latest WHERE quantity > 0`,
          [account!.id], client
        );
        for (const o of open) {
          if (seen.has(o.instrument_id)) continue;
          await client.query(
            `INSERT INTO investment_holdings (family_id, user_id, investment_account_id, instrument_id, quantity, average_cost, invested_amount, current_price, current_value, as_of_date)
             VALUES ($1,$2,$3,$4,0,$5,0,NULL,0,$6)
             ON CONFLICT (investment_account_id, instrument_id, as_of_date) DO UPDATE SET quantity = 0, invested_amount = 0, current_value = 0, updated_at = NOW()`,
            [householdId, userId, account!.id, o.instrument_id, o.average_cost, today]
          );
          summary.closedPositions++;
        }

        await client.query(`INSERT INTO angelone_sync_log (household_id, kind, status, summary) VALUES ($1,'HOLDINGS','OK',$2)`, [householdId, JSON.stringify(summary)]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
      return summary;
    } catch (err) {
      await this.logFailure(householdId, 'HOLDINGS', err);
      throw err;
    }
  }

  // ── Prices ───────────────────────────────────────────────────────────────

  /** Refresh prices for everything the household holds, Angel One first, with the existing fallbacks behind it. */
  static async syncPrices(householdId: string, userId?: string) {
    if (userId) await this.assertAccess(householdId, userId);
    try {
      await ensureInstrumentMaster().catch((e) => console.warn('[AngelOne] instrument master unavailable:', (e as Error).message));
      const result = await MarketDataService.refreshPrices(householdId);
      const bySource = await QueryHelper.query<{ source: string; n: string }>(
        `SELECT sp.source, COUNT(*)::text AS n FROM security_prices sp
         WHERE sp.price_date >= $2 AND sp.security_id IN (
           SELECT s.id FROM securities s WHERE EXISTS (SELECT 1 FROM investment_transactions it WHERE it.security_id = s.id AND it.household_id = $1 AND it.status <> 'VOID')
              OR EXISTS (SELECT 1 FROM investment_holdings ih WHERE ih.instrument_id = s.id AND ih.family_id = $1))
         GROUP BY sp.source`,
        [householdId, istDate(new Date(Date.now() - 3 * 86_400_000))]
      );
      const summary = { ...result, bySource: Object.fromEntries(bySource.map((r) => [r.source, Number(r.n)])) };
      await QueryHelper.query(
        `INSERT INTO angelone_sync_log (household_id, kind, status, summary) VALUES ($1,'PRICES',$2,$3)`,
        [householdId, result.stale > 0 && result.updated === 0 ? 'FAILED' : result.stale > 0 ? 'PARTIAL' : 'OK', JSON.stringify(summary)]
      );
      return summary;
    } catch (err) {
      await this.logFailure(householdId, 'PRICES', err);
      throw err;
    }
  }

  /** Live quotes for any NSE/BSE symbol (owned or not). Mutual funds are not covered by SmartAPI. */
  static async getQuotes(householdId: string, userId: string, symbols: string[], exchange: 'NSE' | 'BSE' = 'NSE') {
    await this.assertAccess(householdId, userId);
    const clean = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z0-9&_-]{1,30}$/.test(s)))).slice(0, 50);
    if (clean.length === 0) throw httpError(400, 'NO_SYMBOLS', 'Give at least one symbol, for example RELIANCE or TCS.');
    await ensureInstrumentMaster();
    const secs = clean.map((s) => ({ id: `adhoc:${s}`, symbol: s, isin: null, exchange, security_type: 'STOCK' }));
    const quotes = await new AngelOneProvider().getQuotes(secs);
    return clean.map((s) => {
      const q = quotes.get(`adhoc:${s}`);
      return q
        ? { symbol: s, found: true, price: q.price, open: q.open ?? null, high: q.high ?? null, low: q.low ?? null, previousClose: q.previousClose ?? null, changePct: q.changePct ?? null, volume: q.volume ?? null, priceDate: q.priceDate }
        : { symbol: s, found: false };
    });
  }

  private static async logFailure(householdId: string, kind: 'PRICES' | 'HOLDINGS', err: unknown) {
    const { message } = describeAngelOneError(err);
    await QueryHelper.query(`INSERT INTO angelone_sync_log (household_id, kind, status, error) VALUES ($1,$2,'FAILED',$3)`, [householdId, kind, message.slice(0, 500)]).catch(() => undefined);
  }
}
