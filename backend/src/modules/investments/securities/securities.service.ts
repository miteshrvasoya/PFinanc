import { QueryHelper } from '../../../database/queryHelper.js';
import { logAudit } from '../../../utils/audit.js';

export interface SecurityWithPrice {
  id: string;
  symbol: string;
  isin: string | null;
  name: string;
  security_type: string;
  exchange: string;
  currency: string;
  sector: string | null;
  fund_house: string | null;
  asset_class: string;
  is_active: boolean;
  metadata: any;
  latest_price: number | null;
  price_date: string | null;
  is_stale: boolean;
  created_at: string;
  updated_at: string;
}

export class SecuritiesService {
  /**
   * Search securities by symbol, ISIN, or name
   */
  static async search(query: string, limit = 20): Promise<SecurityWithPrice[]> {
    const q = `%${query.trim()}%`;
    const sql = `
      SELECT 
        s.*,
        CAST(p.close AS FLOAT) AS latest_price,
        p.price_date,
        COALESCE(p.is_stale, false) AS is_stale
      FROM securities s
      LEFT JOIN LATERAL (
        SELECT close, price_date, is_stale
        FROM security_prices sp
        WHERE sp.security_id = s.id
        ORDER BY price_date DESC
        LIMIT 1
      ) p ON true
      WHERE s.is_active = true AND (
        s.symbol ILIKE $1 OR s.name ILIKE $1 OR s.isin ILIKE $1 OR s.fund_house ILIKE $1
      )
      ORDER BY 
        CASE 
          WHEN s.symbol ILIKE $1 THEN 1 
          WHEN s.name ILIKE $1 THEN 2 
          ELSE 3 
        END,
        s.symbol ASC
      LIMIT $2
    `;

    return QueryHelper.query<SecurityWithPrice>(sql, [q, limit]);
  }

  /**
   * List all securities with optional filtering
   */
  static async list(filter: {
    securityType?: string;
    assetClass?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: SecurityWithPrice[] }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filter.securityType) {
      params.push(filter.securityType);
      conditions.push(`s.security_type = $${params.length}`);
    }

    if (filter.assetClass) {
      params.push(filter.assetClass);
      conditions.push(`s.asset_class = $${params.length}`);
    }

    if (filter.isActive !== undefined) {
      params.push(filter.isActive);
      conditions.push(`s.is_active = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM securities s WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes?.count || '0', 10);

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const sql = `
      SELECT 
        s.*,
        CAST(p.close AS FLOAT) AS latest_price,
        p.price_date,
        COALESCE(p.is_stale, false) AS is_stale
      FROM securities s
      LEFT JOIN LATERAL (
        SELECT close, price_date, is_stale
        FROM security_prices sp
        WHERE sp.security_id = s.id
        ORDER BY price_date DESC
        LIMIT 1
      ) p ON true
      WHERE ${whereClause}
      ORDER BY s.security_type ASC, s.name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const items = await QueryHelper.query<SecurityWithPrice>(sql, params);
    return { total, items };
  }

  /**
   * Get single security by ID with price history
   */
  static async getById(id: string): Promise<any | null> {
    const security = await QueryHelper.queryOne(
      `SELECT 
        s.*,
        CAST(p.close AS FLOAT) AS latest_price,
        p.price_date,
        COALESCE(p.is_stale, false) AS is_stale
      FROM securities s
      LEFT JOIN LATERAL (
        SELECT close, price_date, is_stale
        FROM security_prices sp
        WHERE sp.security_id = s.id
        ORDER BY price_date DESC
        LIMIT 1
      ) p ON true
      WHERE s.id = $1`,
      [id]
    );

    if (!security) return null;

    const priceHistory = await QueryHelper.query(
      `SELECT price_date, CAST(open AS FLOAT) as open, CAST(high AS FLOAT) as high, 
              CAST(low AS FLOAT) as low, CAST(close AS FLOAT) as close, volume, is_stale
       FROM security_prices
       WHERE security_id = $1
       ORDER BY price_date DESC
       LIMIT 60`,
      [id]
    );

    return { ...security, priceHistory };
  }

  /**
   * Find or create security by ISIN or Symbol+Exchange
   */
  static async findOrCreate(data: {
    symbol: string;
    isin?: string | null;
    name: string;
    security_type: 'STOCK' | 'MUTUAL_FUND' | 'ETF' | 'OTHER';
    exchange?: string;
    currency?: string;
    sector?: string | null;
    fund_house?: string | null;
    asset_class?: 'EQUITY' | 'MUTUAL_FUND' | 'ETF' | 'FIXED_INCOME' | 'RETIREMENT' | 'OTHER';
    initial_price?: number;
  }, userId?: string) {
    let existing = null;
    if (data.isin) {
      existing = await QueryHelper.queryOne(`SELECT * FROM securities WHERE isin = $1`, [data.isin]);
    }
    if (!existing) {
      existing = await QueryHelper.queryOne(
        `SELECT * FROM securities WHERE symbol = $1 AND exchange = $2`,
        [data.symbol.toUpperCase(), data.exchange || 'NSE']
      );
    }

    if (existing) {
      return this.getById(existing.id);
    }

    const security = await QueryHelper.insert('securities', {
      symbol: data.symbol.toUpperCase(),
      isin: data.isin || null,
      name: data.name,
      security_type: data.security_type,
      exchange: data.exchange || 'NSE',
      currency: data.currency || 'INR',
      sector: data.sector || null,
      fund_house: data.fund_house || null,
      asset_class: data.asset_class || (data.security_type === 'STOCK' ? 'EQUITY' : data.security_type),
      is_active: true,
    });

    if (data.initial_price && data.initial_price > 0) {
      await QueryHelper.insert('security_prices', {
        security_id: security.id,
        price_date: new Date().toISOString().split('T')[0],
        close: data.initial_price,
        source: 'MANUAL_INITIAL',
        is_stale: false,
      });
    }

    return this.getById(security.id);
  }
}
