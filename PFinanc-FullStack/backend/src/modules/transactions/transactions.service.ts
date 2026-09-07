import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export interface TransactionFilter {
  householdId: string;
  userId?: string;
  accountId?: string;
  categoryId?: string;
  transactionType?: string;
  status?: string;
  sourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class TransactionsService {
  static async listTransactions(filter: TransactionFilter) {
    const conditions: string[] = ['t.household_id = $1'];
    const params: any[] = [filter.householdId];

    if (filter.accountId) {
      params.push(filter.accountId);
      conditions.push(`t.account_id = $${params.length}`);
    }

    if (filter.userId) {
      params.push(filter.userId);
      conditions.push(`t.user_id = $${params.length}`);
    }

    if (filter.categoryId) {
      params.push(filter.categoryId);
      conditions.push(`t.category_id = $${params.length}`);
    }

    if (filter.transactionType) {
      params.push(filter.transactionType);
      conditions.push(`t.transaction_type = $${params.length}`);
    }

    if (filter.status) {
      params.push(filter.status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (filter.sourceType) {
      params.push(filter.sourceType);
      conditions.push(`t.source_type = $${params.length}`);
    }

    if (filter.startDate) {
      params.push(filter.startDate);
      conditions.push(`t.transaction_date >= $${params.length}`);
    }

    if (filter.endDate) {
      params.push(filter.endDate);
      conditions.push(`t.transaction_date <= $${params.length}`);
    }

    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(t.description ILIKE $${params.length} OR t.merchant_name ILIKE $${params.length} OR t.external_reference ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions t WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes?.count || '0', 10);

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;

    params.push(limit, offset);
    const limitOffsetClause = `ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const sql = `
      SELECT 
        t.id,
        t.household_id,
        t.account_id,
        a.name AS account_name,
        a.account_type,
        a.currency,
        t.user_id,
        u.name AS user_name,
        t.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        t.transfer_id,
        tr.source_account_id,
        sa.name AS transfer_source_account_name,
        tr.destination_account_id,
        da.name AS transfer_dest_account_name,
        t.related_transaction_id,
        t.transaction_type,
        CAST(t.amount AS FLOAT) AS amount,
        t.currency,
        t.transaction_date,
        t.description,
        t.merchant_name,
        t.status,
        t.source_type,
        t.source_reference,
        t.external_reference,
        t.notes,
        t.created_at,
        t.updated_at
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN transfers tr ON tr.id = t.transfer_id
      LEFT JOIN accounts sa ON sa.id = tr.source_account_id
      LEFT JOIN accounts da ON da.id = tr.destination_account_id
      WHERE ${whereClause}
      ${limitOffsetClause}
    `;

    const items = await QueryHelper.query(sql, params);
    return { total, items, limit, offset };
  }

  static async getTransactionById(id: string, householdId: string) {
    const sql = `
      SELECT 
        t.id,
        t.household_id,
        t.account_id,
        a.name AS account_name,
        a.account_type,
        t.user_id,
        u.name AS user_name,
        t.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        t.transfer_id,
        tr.source_account_id,
        sa.name AS transfer_source_account_name,
        tr.destination_account_id,
        da.name AS transfer_dest_account_name,
        t.related_transaction_id,
        rt.description AS related_transaction_description,
        t.transaction_type,
        CAST(t.amount AS FLOAT) AS amount,
        t.currency,
        t.transaction_date,
        t.description,
        t.merchant_name,
        t.status,
        t.source_type,
        t.source_reference,
        t.external_reference,
        t.notes,
        t.created_at,
        t.updated_at
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN transfers tr ON tr.id = t.transfer_id
      LEFT JOIN accounts sa ON sa.id = tr.source_account_id
      LEFT JOIN accounts da ON da.id = tr.destination_account_id
      LEFT JOIN transactions rt ON rt.id = t.related_transaction_id
      WHERE t.id = $1 AND t.household_id = $2
    `;

    return QueryHelper.queryOne(sql, [id, householdId]);
  }

  static async createTransaction(householdId: string, currentUserId: string, data: any) {
    const transaction = await QueryHelper.insert('transactions', {
      household_id: householdId,
      account_id: data.account_id,
      user_id: data.user_id || currentUserId,
      category_id: data.category_id || null,
      related_transaction_id: data.related_transaction_id || null,
      transaction_type: data.transaction_type,
      amount: data.amount,
      currency: data.currency || 'INR',
      transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
      description: data.description,
      merchant_name: data.merchant_name || null,
      status: data.status || 'CONFIRMED',
      source_type: data.source_type || 'MANUAL',
      source_reference: data.source_reference || null,
      external_reference: data.external_reference || null,
      notes: data.notes || null,
    });

    await logAudit(householdId, currentUserId, 'TRANSACTION', transaction.id, 'CREATE', null, transaction);
    return this.getTransactionById(transaction.id, householdId);
  }

  static async updateTransaction(id: string, householdId: string, currentUserId: string, data: any) {
    const old = await QueryHelper.queryOne(`SELECT * FROM transactions WHERE id = $1 AND household_id = $2`, [id, householdId]);
    if (!old) {
      const error: any = new Error('Transaction not found');
      error.status = 404;
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    if (old.transfer_id && (data.amount || data.transaction_type || data.account_id)) {
      const error: any = new Error('Transfers must be modified through the transfer management service');
      error.status = 400;
      error.code = 'TRANSFER_TRANSACTION_IMMUTABLE';
      throw error;
    }

    const updated = await QueryHelper.update('transactions', id, data, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'TRANSACTION', id, 'UPDATE', old, updated);
    return this.getTransactionById(id, householdId);
  }

  static async setStatus(id: string, householdId: string, currentUserId: string, status: 'CONFIRMED' | 'REJECTED' | 'VOID') {
    const old = await QueryHelper.queryOne(`SELECT * FROM transactions WHERE id = $1 AND household_id = $2`, [id, householdId]);
    if (!old) {
      const error: any = new Error('Transaction not found');
      error.status = 404;
      error.code = 'TRANSACTION_NOT_FOUND';
      throw error;
    }

    // If part of transfer, update transfer and both legs atomically
    if (old.transfer_id) {
      await QueryHelper.transaction(async (client) => {
        await QueryHelper.update('transfers', old.transfer_id, { status }, '', [], client);
        await QueryHelper.query(`UPDATE transactions SET status = $1 WHERE transfer_id = $2`, [status, old.transfer_id], client);
      });
    } else {
      await QueryHelper.update('transactions', id, { status }, 'household_id = $1', [householdId]);
    }

    await logAudit(householdId, currentUserId, 'TRANSACTION', id, status as any, old, { ...old, status });
    return this.getTransactionById(id, householdId);
  }
}
