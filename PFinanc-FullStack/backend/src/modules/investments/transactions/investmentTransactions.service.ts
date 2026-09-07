import { QueryHelper } from '../../../database/queryHelper.js';
import { logAudit } from '../../../utils/audit.js';

export interface CreateInvestmentTransactionInput {
  household_id: string;
  investment_account_id: string;
  security_id?: string | null;
  transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'BONUS' | 'SPLIT' | 'INTEREST' | 'SIP' | 'REDEMPTION' | 'FEE' | 'TAX' | 'OTHER';
  transaction_date?: string;
  quantity?: number | null;
  price_per_unit?: number | null;
  gross_amount?: number;
  fees?: number;
  taxes?: number;
  net_amount?: number;
  funding_account_id?: string | null; // Optional bank account to deduct cash from
  dividend_account_id?: string | null; // Optional bank account to deposit dividend to
  reference?: string | null;
  notes?: string | null;
  status?: 'DRAFT' | 'CONFIRMED';
  source?: string;
  external_reference?: string | null;
}

export class InvestmentTransactionsService {
  static async create(userId: string, data: CreateInvestmentTransactionInput) {
    const status = data.status || 'CONFIRMED';
    const txDate = data.transaction_date || new Date().toISOString().split('T')[0];
    const fees = data.fees || 0;
    const taxes = data.taxes || 0;

    let qty = data.quantity !== undefined && data.quantity !== null ? parseFloat(String(data.quantity)) : null;
    let price = data.price_per_unit !== undefined && data.price_per_unit !== null ? parseFloat(String(data.price_per_unit)) : null;

    let gross = data.gross_amount !== undefined ? parseFloat(String(data.gross_amount)) : 0;
    if (qty && price && gross === 0) {
      gross = qty * price;
    }

    let net = data.net_amount !== undefined ? parseFloat(String(data.net_amount)) : 0;
    if (net === 0) {
      if (data.transaction_type === 'BUY' || data.transaction_type === 'SIP') {
        net = gross + fees + taxes;
      } else if (data.transaction_type === 'SELL' || data.transaction_type === 'REDEMPTION') {
        net = Math.max(0, gross - fees - taxes);
      } else if (data.transaction_type === 'DIVIDEND' || data.transaction_type === 'INTEREST') {
        net = Math.max(0, gross - taxes);
      } else {
        net = gross;
      }
    }

    // Lookup Security Name for clean descriptions
    let securityName = 'Investment Asset';
    if (data.security_id) {
      const sec = await QueryHelper.queryOne<{ name: string; symbol: string }>(
        `SELECT name, symbol FROM securities WHERE id = $1`,
        [data.security_id]
      );
      if (sec) securityName = `${sec.name} (${sec.symbol})`;
    }

    return QueryHelper.transaction(async (client) => {
      let linkedCashTxId: string | null = null;

      // 1. If funding bank account is provided for BUY/SIP, create linked non-expense cash debit
      if (data.funding_account_id && (data.transaction_type === 'BUY' || data.transaction_type === 'SIP') && net > 0) {
        const cashTx = await QueryHelper.insert('transactions', {
          household_id: data.household_id,
          account_id: data.funding_account_id,
          user_id: userId,
          transaction_type: 'OTHER', // Strictly NOT 'EXPENSE'
          amount: net,
          currency: 'INR',
          transaction_date: txDate,
          description: `Investment Funding: ${data.transaction_type} ${securityName}`,
          merchant_name: securityName,
          status,
          source_type: 'SYSTEM',
          source_reference: `Investment Purchase (${data.transaction_type})`,
        }, client);
        linkedCashTxId = cashTx.id;
      }

      // 2. If dividend account is provided for DIVIDEND/INTEREST, create linked cash income
      if (data.dividend_account_id && (data.transaction_type === 'DIVIDEND' || data.transaction_type === 'INTEREST') && net > 0) {
        const cashTx = await QueryHelper.insert('transactions', {
          household_id: data.household_id,
          account_id: data.dividend_account_id,
          user_id: userId,
          transaction_type: 'INCOME',
          amount: net,
          currency: 'INR',
          transaction_date: txDate,
          description: `Dividend / Investment Income: ${securityName}`,
          merchant_name: securityName,
          status,
          source_type: 'SYSTEM',
          source_reference: `Dividend Income`,
        }, client);
        linkedCashTxId = cashTx.id;
      }

      // 3. Create Investment Transaction
      const invTx = await QueryHelper.insert('investment_transactions', {
        household_id: data.household_id,
        investment_account_id: data.investment_account_id,
        security_id: data.security_id || null,
        transaction_type: data.transaction_type,
        transaction_date: txDate,
        quantity: qty,
        price_per_unit: price,
        gross_amount: gross,
        fees,
        taxes,
        net_amount: net,
        currency: 'INR',
        linked_cash_transaction_id: linkedCashTxId,
        reference: data.reference || null,
        notes: data.notes || null,
        source: data.source || 'MANUAL',
        status,
        external_reference: data.external_reference || null,
        created_by: userId,
      }, client);

      await logAudit(data.household_id, userId, 'INVESTMENT_TRANSACTION', invTx.id, 'CREATE', null, invTx, client);

      return this.getById(invTx.id, data.household_id, client);
    });
  }

  static async list(filter: {
    householdId: string;
    accountId?: string;
    securityId?: string;
    transactionType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: string[] = ['it.household_id = $1'];
    const params: any[] = [filter.householdId];

    if (filter.accountId) {
      params.push(filter.accountId);
      conditions.push(`it.investment_account_id = $${params.length}`);
    }

    if (filter.securityId) {
      params.push(filter.securityId);
      conditions.push(`it.security_id = $${params.length}`);
    }

    if (filter.transactionType) {
      params.push(filter.transactionType);
      conditions.push(`it.transaction_type = $${params.length}`);
    }

    if (filter.status) {
      params.push(filter.status);
      conditions.push(`it.status = $${params.length}`);
    }

    if (filter.startDate) {
      params.push(filter.startDate);
      conditions.push(`it.transaction_date >= $${params.length}`);
    }

    if (filter.endDate) {
      params.push(filter.endDate);
      conditions.push(`it.transaction_date <= $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM investment_transactions it WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes?.count || '0', 10);

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    params.push(limit, offset);

    const sql = `
      SELECT 
        it.id,
        it.household_id,
        it.investment_account_id,
        a.name AS account_name,
        a.institution_name AS account_institution,
        it.security_id,
        s.symbol,
        s.isin,
        s.name AS security_name,
        s.security_type,
        s.asset_class,
        s.exchange,
        it.transaction_type,
        it.transaction_date,
        CAST(it.quantity AS FLOAT) AS quantity,
        CAST(it.price_per_unit AS FLOAT) AS price_per_unit,
        CAST(it.gross_amount AS FLOAT) AS gross_amount,
        CAST(it.fees AS FLOAT) AS fees,
        CAST(it.taxes AS FLOAT) AS taxes,
        CAST(it.net_amount AS FLOAT) AS net_amount,
        it.currency,
        it.linked_cash_transaction_id,
        it.reference,
        it.notes,
        it.source,
        it.status,
        it.external_reference,
        it.created_by,
        u.name AS created_by_name,
        it.created_at
      FROM investment_transactions it
      JOIN accounts a ON a.id = it.investment_account_id
      LEFT JOIN securities s ON s.id = it.security_id
      LEFT JOIN users u ON u.id = it.created_by
      WHERE ${whereClause}
      ORDER BY it.transaction_date DESC, it.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const items = await QueryHelper.query(sql, params);
    return { total, items };
  }

  static async getById(id: string, householdId: string, client?: any) {
    const sql = `
      SELECT 
        it.id,
        it.household_id,
        it.investment_account_id,
        a.name AS account_name,
        a.institution_name AS account_institution,
        it.security_id,
        s.symbol,
        s.isin,
        s.name AS security_name,
        s.security_type,
        s.asset_class,
        s.exchange,
        it.transaction_type,
        it.transaction_date,
        CAST(it.quantity AS FLOAT) AS quantity,
        CAST(it.price_per_unit AS FLOAT) AS price_per_unit,
        CAST(it.gross_amount AS FLOAT) AS gross_amount,
        CAST(it.fees AS FLOAT) AS fees,
        CAST(it.taxes AS FLOAT) AS taxes,
        CAST(it.net_amount AS FLOAT) AS net_amount,
        it.currency,
        it.linked_cash_transaction_id,
        it.reference,
        it.notes,
        it.source,
        it.status,
        it.external_reference,
        it.created_by,
        u.name AS created_by_name,
        it.created_at
      FROM investment_transactions it
      JOIN accounts a ON a.id = it.investment_account_id
      LEFT JOIN securities s ON s.id = it.security_id
      LEFT JOIN users u ON u.id = it.created_by
      WHERE it.id = $1 AND it.household_id = $2
    `;

    return QueryHelper.queryOne(sql, [id, householdId], client);
  }

  static async voidTransaction(id: string, householdId: string, userId: string) {
    const tx = await QueryHelper.queryOne(`SELECT * FROM investment_transactions WHERE id = $1 AND household_id = $2`, [id, householdId]);
    if (!tx) {
      const error: any = new Error('Investment transaction not found');
      error.status = 404;
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    await QueryHelper.transaction(async (client) => {
      await QueryHelper.update('investment_transactions', id, { status: 'VOID' }, '', [], client);
      if (tx.linked_cash_transaction_id) {
        await QueryHelper.update('transactions', tx.linked_cash_transaction_id, { status: 'VOID' }, '', [], client);
      }
      await logAudit(householdId, userId, 'INVESTMENT_TRANSACTION', id, 'VOID', tx, { ...tx, status: 'VOID' }, client);
    });

    return this.getById(id, householdId);
  }
}
