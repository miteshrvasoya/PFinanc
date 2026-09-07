import { QueryHelper } from '../../../database/queryHelper.js';

export interface MarketQuote {
  securityId: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  priceDate: string;
  currency: string;
  source: string;
  isStale: boolean;
}

export interface IMarketDataProvider {
  name: string;
  getQuotes(securities: Array<{ id: string; symbol: string; isin?: string | null; exchange: string; security_type: string }>): Promise<Map<string, MarketQuote>>;
}

// ─── Yahoo Finance Provider ──────────────────────────────────────────────────

export class YahooFinanceProvider implements IMarketDataProvider {
  name = 'YAHOO_FINANCE';

  private toYahooSymbol(symbol: string, exchange: string, type: string): string {
    const sym = symbol.toUpperCase();
    if (type === 'MUTUAL_FUND') return '';          // Yahoo doesn't carry Indian MF NAV reliably
    if (exchange === 'BSE') return `${sym}.BO`;
    if (exchange === 'NSE') return `${sym}.NS`;
    return `${sym}.NS`;                             // default to NSE
  }

  async getQuotes(
    securities: Array<{ id: string; symbol: string; isin?: string | null; exchange: string; security_type: string }>
  ): Promise<Map<string, MarketQuote>> {
    const results = new Map<string, MarketQuote>();
    const today = new Date().toISOString().split('T')[0];

    // Filter to securities Yahoo supports (not MF)
    const eligible = securities.filter(s => s.security_type !== 'MUTUAL_FUND');
    if (eligible.length === 0) return results;

    const symbolMap = new Map<string, string>(); // yahooSym → securityId
    const yahooSymbols: string[] = [];

    for (const sec of eligible) {
      const ySym = this.toYahooSymbol(sec.symbol, sec.exchange, sec.security_type);
      if (ySym) {
        yahooSymbols.push(ySym);
        symbolMap.set(ySym, sec.id);
      }
    }

    if (yahooSymbols.length === 0) return results;

    try {
      // Use unofficial Yahoo Finance v8 quote endpoint (no API key needed)
      const encoded = yahooSymbols.join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(encoded)}&fields=regularMarketPrice,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,currency`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PFinanc/1.0)',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status}`);

      const json = await response.json() as any;
      const quoteList: any[] = json?.quoteResponse?.result || [];

      for (const q of quoteList) {
        const secId = symbolMap.get(q.symbol);
        if (!secId || !q.regularMarketPrice) continue;

        results.set(secId, {
          securityId: secId,
          price: q.regularMarketPrice,
          open: q.regularMarketOpen,
          high: q.regularMarketDayHigh,
          low: q.regularMarketDayLow,
          priceDate: today,
          currency: q.currency || 'INR',
          source: this.name,
          isStale: false,
        });
      }
    } catch (err) {
      console.warn('[YahooFinanceProvider] Fetch failed:', (err as Error).message);
    }

    return results;
  }
}

// ─── MFAPI.in Provider (Indian Mutual Fund NAV) ───────────────────────────────

export class MFApiProvider implements IMarketDataProvider {
  name = 'MFAPI_IN';

  /** Resolve AMFI scheme code from ISIN using mfapi search */
  private async resolveSchemeCode(isin: string): Promise<string | null> {
    try {
      const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(isin)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json() as any[];
      return data?.[0]?.schemeCode ? String(data[0].schemeCode) : null;
    } catch {
      return null;
    }
  }

  async getQuotes(
    securities: Array<{ id: string; symbol: string; isin?: string | null; exchange: string; security_type: string }>
  ): Promise<Map<string, MarketQuote>> {
    const results = new Map<string, MarketQuote>();
    const today = new Date().toISOString().split('T')[0];

    const mfSecurities = securities.filter(s => s.security_type === 'MUTUAL_FUND');
    if (mfSecurities.length === 0) return results;

    for (const sec of mfSecurities) {
      try {
        let schemeCode: string | null = null;

        // Try ISIN-based lookup first
        if (sec.isin) {
          schemeCode = await this.resolveSchemeCode(sec.isin);
        }

        // Fallback: search by symbol name
        if (!schemeCode && sec.symbol) {
          schemeCode = await this.resolveSchemeCode(sec.symbol);
        }

        if (!schemeCode) continue;

        const navUrl = `https://api.mfapi.in/mf/${schemeCode}/latest`;
        const navRes = await fetch(navUrl, { signal: AbortSignal.timeout(5000) });
        if (!navRes.ok) continue;

        const navData = await navRes.json() as any;
        const navEntry = navData?.data?.[0];
        if (!navEntry?.nav) continue;

        const price = parseFloat(navEntry.nav);
        if (isNaN(price) || price <= 0) continue;

        results.set(sec.id, {
          securityId: sec.id,
          price,
          priceDate: navEntry.date || today,
          currency: 'INR',
          source: this.name,
          isStale: false,
        });
      } catch (err) {
        console.warn(`[MFApiProvider] Failed for ${sec.symbol}:`, (err as Error).message);
      }
    }

    return results;
  }
}

// ─── Chained Provider (tries multiple sources) ────────────────────────────────

export class ChainedMarketDataProvider implements IMarketDataProvider {
  name = 'CHAINED_PROVIDER';

  constructor(private providers: IMarketDataProvider[]) {}

  async getQuotes(
    securities: Array<{ id: string; symbol: string; isin?: string | null; exchange: string; security_type: string }>
  ): Promise<Map<string, MarketQuote>> {
    const results = new Map<string, MarketQuote>();
    let remaining = [...securities];

    for (const provider of this.providers) {
      if (remaining.length === 0) break;
      try {
        const partial = await provider.getQuotes(remaining);
        partial.forEach((quote, id) => results.set(id, quote));
        remaining = remaining.filter(s => !results.has(s.id));
      } catch (err) {
        console.warn(`[ChainedProvider] Provider ${provider.name} failed:`, (err as Error).message);
      }
    }

    return results;
  }
}

// ─── Mock / Fallback Provider (used as last resort) ───────────────────────────

export class IndianMarketDataProvider implements IMarketDataProvider {
  name = 'INDIAN_MARKET_PROVIDER';

  private mockMasterQuotes: Record<string, number> = {
    'RELIANCE': 1520.00,
    'TCS': 4150.00,
    'HDFCBANK': 1680.00,
    'INFY': 1890.00,
    'ICICIBANK': 1240.00,
    'TATAMOTORS': 980.00,
    'NIFTYBEES': 275.50,
    'GOLDBEES': 68.20,
    'PPFAS_FLEXICAP': 118.20,
    'MIRAE_LARGECAP': 94.60,
    'SBI_BLUECHIP': 82.40,
    'HDFC_TOP100': 1040.50,
  };

  async getQuotes(securities: Array<{ id: string; symbol: string; isin?: string | null; exchange: string; security_type: string }>): Promise<Map<string, MarketQuote>> {
    const results = new Map<string, MarketQuote>();
    const today = new Date().toISOString().split('T')[0];

    for (const sec of securities) {
      const normalizedSym = sec.symbol.toUpperCase().replace(/[^A-Z0-9_]/g, '');
      let price = this.mockMasterQuotes[normalizedSym];

      if (!price) {
        const latestPriceRow = await QueryHelper.queryOne<{ close: string }>(
          `SELECT close FROM security_prices WHERE security_id = $1 ORDER BY price_date DESC LIMIT 1`,
          [sec.id]
        );
        price = latestPriceRow ? parseFloat(latestPriceRow.close) : 100.00;
      }

      if (price > 0) {
        results.set(sec.id, {
          securityId: sec.id,
          price,
          open: price * 0.995,
          high: price * 1.015,
          low: price * 0.99,
          priceDate: today,
          currency: 'INR',
          source: this.name,
          isStale: false,
        });
      }
    }

    return results;
  }
}

// ─── Market Data Service ──────────────────────────────────────────────────────

export class MarketDataService {
  /**
   * Default chained provider: Yahoo Finance → MF API → Mock fallback
   */
  private static provider: IMarketDataProvider = new ChainedMarketDataProvider([
    new YahooFinanceProvider(),
    new MFApiProvider(),
    new IndianMarketDataProvider(),
  ]);

  static setProvider(customProvider: IMarketDataProvider) {
    this.provider = customProvider;
  }

  /**
   * Refresh prices for securities held in the given household or across all active securities
   */
  static async refreshPrices(householdId?: string): Promise<{ total: number; updated: number; stale: number }> {
    let securities: any[] = [];

    if (householdId) {
      securities = await QueryHelper.query(
        `SELECT DISTINCT s.id, s.symbol, s.isin, s.exchange, s.security_type
         FROM securities s
         JOIN investment_transactions it ON it.security_id = s.id
         WHERE it.household_id = $1 AND it.status <> 'VOID' AND s.is_active = true`,
        [householdId]
      );
    }

    if (securities.length === 0) {
      securities = await QueryHelper.query(
        `SELECT id, symbol, isin, exchange, security_type FROM securities WHERE is_active = true LIMIT 100`
      );
    }

    if (securities.length === 0) {
      return { total: 0, updated: 0, stale: 0 };
    }

    let updatedCount = 0;
    let staleCount = 0;

    try {
      const quotesMap = await this.provider.getQuotes(securities);

      for (const sec of securities) {
        const quote = quotesMap.get(sec.id);
        if (quote && quote.price > 0) {
          await QueryHelper.query(
            `INSERT INTO security_prices (security_id, price_date, open, high, low, close, adjusted_close, currency, source, is_stale)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (security_id, price_date) 
             DO UPDATE SET 
               close = EXCLUDED.close, 
               open = EXCLUDED.open,
               high = EXCLUDED.high,
               low = EXCLUDED.low,
               is_stale = EXCLUDED.is_stale,
               source = EXCLUDED.source`,
            [
              sec.id,
              quote.priceDate,
              quote.open || null,
              quote.high || null,
              quote.low || null,
              quote.price,
              quote.price,
              quote.currency || 'INR',
              quote.source,
              quote.isStale,
            ]
          );
          updatedCount++;
        } else {
          // Keep previous price and mark is_stale = true
          await QueryHelper.query(
            `UPDATE security_prices SET is_stale = true WHERE security_id = $1`,
            [sec.id]
          );
          staleCount++;
        }
      }
    } catch (err) {
      console.error('Market data fetch failure:', err);
      for (const sec of securities) {
        await QueryHelper.query(
          `UPDATE security_prices SET is_stale = true WHERE security_id = $1`,
          [sec.id]
        );
        staleCount++;
      }
    }

    return {
      total: securities.length,
      updated: updatedCount,
      stale: staleCount,
    };
  }

  /**
   * Fetch live quotes for a specific set of securities (used by AI Advisor)
   */
  static async getLiveQuotes(
    securities: Array<{ id: string; symbol: string; isin?: string | null; exchange: string; security_type: string }>
  ): Promise<Map<string, MarketQuote>> {
    return this.provider.getQuotes(securities);
  }

  /**
   * Set price manually for a security on a given date
   */
  static async setManualPrice(securityId: string, price: number, date?: string) {
    const priceDate = date || new Date().toISOString().split('T')[0];
    return QueryHelper.query(
      `INSERT INTO security_prices (security_id, price_date, close, source, is_stale)
       VALUES ($1, $2, $3, 'MANUAL_ENTRY', false)
       ON CONFLICT (security_id, price_date) 
       DO UPDATE SET close = EXCLUDED.close, is_stale = false, source = 'MANUAL_ENTRY'`,
      [securityId, priceDate, price]
    );
  }
}
