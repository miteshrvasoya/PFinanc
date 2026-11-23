import type { IMarketDataProvider, MarketQuote } from '../investments/prices/marketData.service.js';
import { AngelOneClient, angelOneConfigured, describeAngelOneError, RawQuote } from './angelOneClient.js';
import { ensureInstrumentMaster, resolveInstruments } from './instruments.js';

const MONTHS: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

/** Today's date in India (the market's calendar), as YYYY-MM-DD. */
export const istDate = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);

/** "21-Jun-2023 10:46:09" -> "2023-06-21". Falls back to today in IST. */
export function quoteDate(q: RawQuote): string {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})/.exec(q.exchTradeTime || q.exchFeedTime || '');
  if (m && MONTHS[m[2]]) return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, '0')}`;
  return istDate();
}

/**
 * Live NSE/BSE prices for stocks and ETFs through SmartAPI's market quote endpoint. Mutual funds are NOT covered by
 * SmartAPI, so they are left to the next provider in the chain.
 */
export class AngelOneProvider implements IMarketDataProvider {
  name = 'ANGEL_ONE';

  async getQuotes(securities: Array<{ id: string; symbol: string; isin?: string | null; exchange: string; security_type: string }>) {
    const results = new Map<string, MarketQuote>();
    if (!angelOneConfigured()) return results;

    const eligible = securities.filter((s) => s.security_type === 'STOCK' || s.security_type === 'ETF');
    if (eligible.length === 0) return results;

    await ensureInstrumentMaster();
    const resolved = await resolveInstruments(eligible);
    const byKey = new Map<string, string>(); // "NSE:2885" -> security id
    const entries = eligible.filter((s) => resolved.has(s.id));
    for (const s of entries) byKey.set(`${resolved.get(s.id)!.exchange}:${resolved.get(s.id)!.token}`, s.id);

    // The documented limit is 50 symbols per request.
    for (let i = 0; i < entries.length; i += 50) {
      const chunk = entries.slice(i, i + 50);
      const exchangeTokens: Record<string, string[]> = {};
      for (const s of chunk) {
        const r = resolved.get(s.id)!;
        (exchangeTokens[r.exchange] ||= []).push(r.token);
      }
      try {
        const { fetched } = await AngelOneClient.getQuotes('FULL', exchangeTokens);
        for (const q of fetched) {
          const id = byKey.get(`${q.exchange}:${q.symbolToken}`);
          if (!id || !(q.ltp > 0)) continue;
          results.set(id, {
            securityId: id,
            price: q.ltp,
            open: q.open || undefined,
            high: q.high || undefined,
            low: q.low || undefined,
            priceDate: quoteDate(q),
            currency: 'INR',
            source: this.name,
            isStale: false,
            previousClose: q.close || undefined,
            changePct: q.percentChange,
            volume: q.tradeVolume,
          });
        }
      } catch (err) {
        // Report the reason (never credentials) and let the chain fall back for what is missing.
        console.warn('[AngelOne] quote batch failed:', describeAngelOneError(err).message);
        if (!results.size && i === 0) throw err;
      }
    }
    return results;
  }
}
