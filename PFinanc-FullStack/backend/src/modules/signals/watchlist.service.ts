import { QueryHelper } from '../../database/queryHelper.js';
import { baseSymbol } from '../angelone/instruments.js';
import { resolveTarget } from './candles.service.js';
import { httpError } from './signals.service.js';
import { DISCLAIMER } from './types.js';

const MAX_WATCHLIST = 200;

export const WatchlistService = {
  async list(householdId: string) {
    const items = await QueryHelper.query<any>(
      `SELECT w.id, w.symbol, w.exchange, w.note, w.created_at, s.label, s.score, to_char(s.as_of_date,'YYYY-MM-DD') AS as_of_date
       FROM watchlist w
       LEFT JOIN LATERAL (SELECT label, score, as_of_date FROM signals WHERE household_id = w.household_id AND symbol = w.symbol ORDER BY as_of_date DESC LIMIT 1) s ON TRUE
       WHERE w.household_id = $1 ORDER BY w.symbol`, [householdId]
    );
    return { items, disclaimer: DISCLAIMER };
  },

  async add(householdId: string, userId: string, input: { symbol?: string; exchange?: string; note?: string }) {
    const symbol = baseSymbol(String(input.symbol || '').trim());
    if (!/^[A-Z0-9&_-]{1,30}$/.test(symbol)) throw httpError(400, 'INVALID_SYMBOL', 'Enter an NSE/BSE symbol such as RELIANCE or TCS.');
    const exchange = input.exchange === 'BSE' ? 'BSE' : 'NSE';
    const count = await QueryHelper.queryOne<{ n: string }>(`SELECT COUNT(*)::text AS n FROM watchlist WHERE household_id = $1`, [householdId]);
    if (Number(count?.n || 0) >= MAX_WATCHLIST) throw httpError(400, 'WATCHLIST_FULL', `The watchlist is limited to ${MAX_WATCHLIST} symbols.`);
    if (!(await resolveTarget(symbol, exchange))) throw httpError(400, 'SYMBOL_NOT_FOUND', `"${symbol}" was not found in the Angel One ${exchange} cash instrument list.`);
    const row = await QueryHelper.queryOne<any>(
      `INSERT INTO watchlist (household_id, symbol, exchange, note, added_by) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (household_id, symbol) DO UPDATE SET note = COALESCE(EXCLUDED.note, watchlist.note) RETURNING id, symbol, exchange, note, created_at`,
      [householdId, symbol, exchange, input.note ? String(input.note).slice(0, 200) : null, userId]
    );
    return row;
  },

  async remove(householdId: string, idOrSymbol: string) {
    const r = await QueryHelper.queryOne<{ id: string }>(
      `DELETE FROM watchlist WHERE household_id = $1 AND (id::text = $2 OR symbol = $3) RETURNING id`, [householdId, idOrSymbol, idOrSymbol.toUpperCase()]
    );
    if (!r) throw httpError(404, 'NOT_FOUND', 'That symbol is not on the watchlist.');
  },
};
