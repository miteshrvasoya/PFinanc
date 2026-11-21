import { QueryHelper } from '../../database/queryHelper.js';
import { toLocalDateString } from '../../utils/date.js';
import { logAudit } from '../../utils/audit.js';
import { accessibleAccountSql, assertAccountInHousehold, assertCategoryUsable } from '../../middleware/rbac.js';

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
  needsReview?: boolean;
  /** Set for MEMBER/VIEWER callers: only transactions on accounts this user can access are returned. */
  restrictToUserId?: string;
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

    if (filter.restrictToUserId) {
      params.push(filter.restrictToUserId);
      conditions.push(`t.account_id IN (SELECT acc.id FROM accounts acc WHERE acc.household_id = t.household_id AND ${accessibleAccountSql('acc', `$${params.length}`)})`);
    }

    if (filter.needsReview !== undefined) {
      params.push(filter.needsReview);
      conditions.push(`t.needs_review = $${params.length}`);
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
        t.linked_entity_type,
        t.linked_entity_id,
        t.needs_review,
        t.review_note,
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
        t.linked_entity_type,
        t.linked_entity_id,
        t.needs_review,
        t.review_note,
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
    if (data.transaction_type === 'TRANSFER') {
      // A TRANSFER row without a transfers record is ignored by the balance ledger (money would vanish).
      const error: any = new Error('Transfers must be created via /api/transfers so both legs are recorded');
      error.status = 400;
      error.code = 'USE_TRANSFER_SERVICE';
      throw error;
    }
    await assertAccountInHousehold(data.account_id, householdId);
    await assertCategoryUsable(data.category_id, householdId);
    const transaction = await QueryHelper.insert('transactions', {
      household_id: householdId,
      account_id: data.account_id,
      user_id: data.user_id || currentUserId,
      category_id: data.category_id || null,
      related_transaction_id: data.related_transaction_id || null,
      transaction_type: data.transaction_type,
      amount: data.amount,
      currency: data.currency || 'INR',
      transaction_date: data.transaction_date || toLocalDateString(),
      description: data.description,
      merchant_name: data.merchant_name || null,
      status: data.status || 'CONFIRMED',
      source_type: data.source_type || 'MANUAL',
      source_reference: data.source_reference || null,
      external_reference: data.external_reference || null,
      notes: data.notes || null,
      linked_entity_type: data.linked_entity_type || null,
      linked_entity_id: data.linked_entity_id || null,
      source_candidate_id: data.source_candidate_id || null,
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

    if ('category_id' in data) {
      await assertCategoryUsable(data.category_id, householdId);
    }

    if (data.linked_entity_id) {
      const table = data.linked_entity_type === 'RENT' ? 'rent_agreements' : data.linked_entity_type === 'LOAN' ? 'loans' : null;
      const linked = table
        ? await QueryHelper.queryOne(`SELECT 1 FROM ${table} WHERE id = $1 AND household_id = $2`, [data.linked_entity_id, householdId])
        : null;
      if (!linked) {
        const error: any = new Error('Linked loan / rent agreement not found in this household');
        error.status = 400;
        error.code = 'INVALID_LINKED_ENTITY';
        throw error;
      }
    } else if (data.linked_entity_type === null || data.linked_entity_id === null) {
      data = { ...data, linked_entity_type: null, linked_entity_id: null };
    }

    // Re-categorizing a flagged transaction counts as reviewing it, unless the caller says otherwise.
    const updateData = { ...data };
    if (old.needs_review && 'category_id' in data && data.needs_review === undefined) {
      updateData.needs_review = false;
    }

    const updated = await QueryHelper.update('transactions', id, updateData, 'household_id = $1', [householdId]);
    if (data.transaction_type && data.transaction_type !== old.transaction_type) {
      // Split lines share their parent's direction.
      await QueryHelper.query(`UPDATE transaction_splits SET transaction_type = $1 WHERE parent_transaction_id = $2`, [data.transaction_type, id]);
    }
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

    if (old.status === status) {
      return this.getTransactionById(id, householdId);
    }
    // Void is terminal (docs/accounting-rules.md: "Void Immutability"); rejected drafts may only be voided.
    if (old.status === 'VOID' || (old.status === 'REJECTED' && status !== 'VOID')) {
      const error: any = new Error(`A ${old.status.toLowerCase()} transaction cannot be changed to ${status.toLowerCase()}`);
      error.status = 400;
      error.code = 'INVALID_STATUS_TRANSITION';
      throw error;
    }

    await QueryHelper.transaction(async (client) => {
      if (old.transfer_id) {
        // Part of a transfer: update the transfer and both legs atomically
        await QueryHelper.update('transfers', old.transfer_id, { status }, 'household_id = $1', [householdId], client);
        await QueryHelper.query(
          `UPDATE transactions SET status = $1, updated_at = NOW() WHERE transfer_id = $2 AND household_id = $3`,
          [status, old.transfer_id, householdId],
          client
        );
      } else {
        await QueryHelper.update('transactions', id, { status }, 'household_id = $1', [householdId], client);
      }

      // Keep investment trades consistent with their funding / payout cash leg.
      const investmentStatus = status === 'CONFIRMED' ? 'CONFIRMED' : 'VOID';
      await QueryHelper.query(
        `UPDATE investment_transactions SET status = $1, updated_at = NOW()
         WHERE linked_cash_transaction_id = $2 AND household_id = $3
           AND status <> 'VOID' AND ($1 = 'VOID' OR status = 'DRAFT')`,
        [investmentStatus, id, householdId],
        client
      );
    });

    await logAudit(householdId, currentUserId, 'TRANSACTION', id, status as any, old, { ...old, status });
    return this.getTransactionById(id, householdId);
  }
}
