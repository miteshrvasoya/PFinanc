import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';
import { assertCategoryUsable } from '../../middleware/rbac.js';

const fail = (status: number, code: string, message: string): never => {
  const error: any = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
};

export class SplitsService {
  static async getSplitsForTransaction(householdId: string, transactionId: string) {
    return QueryHelper.query(`
      SELECT ts.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.parent_transaction_id AND t.household_id = $2
      LEFT JOIN categories c ON c.id = ts.category_id
      WHERE ts.parent_transaction_id = $1
      ORDER BY ts.created_at ASC
    `, [transactionId, householdId]);
  }

  /**
   * Replace the category breakdown of a transaction.
   *
   * The parent keeps its own transaction_type and amount: it is still the single ledger entry that moves
   * money (previously it was rewritten to 'SPLIT', a type the balance ledger and analytics ignore, so the
   * money disappeared). Splits only re-attribute the amount across categories for reporting.
   */
  static async splitTransaction(householdId: string, currentUserId: string, transactionId: string, splits: any[]) {
    if (!Array.isArray(splits) || splits.length < 2) {
      fail(400, 'INVALID_SPLITS', 'Provide at least two split lines');
    }

    return QueryHelper.transaction(async (client) => {
      const parent = await QueryHelper.queryOne(
        'SELECT * FROM transactions WHERE id = $1 AND household_id = $2 FOR UPDATE',
        [transactionId, householdId],
        client
      );
      if (!parent) fail(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
      if (parent.transfer_id) fail(400, 'CANNOT_SPLIT_TRANSFER', 'Transfers cannot be split');
      if (parent.status === 'VOID' || parent.status === 'REJECTED') {
        fail(400, 'CANNOT_SPLIT_INACTIVE', 'Void or rejected transactions cannot be split');
      }

      const amounts = splits.map((s) => Number(s?.amount));
      if (amounts.some((a) => !Number.isFinite(a) || a <= 0)) {
        fail(400, 'INVALID_SPLITS', 'Every split amount must be a positive number');
      }
      const totalSplitAmount = amounts.reduce((sum, a) => sum + a, 0);
      if (Math.abs(totalSplitAmount - parseFloat(parent.amount)) > 0.01) {
        fail(400, 'SPLIT_TOTAL_MISMATCH', 'Split amounts must equal the original transaction amount');
      }
      for (const split of splits) {
        await assertCategoryUsable(split.category_id, householdId, client);
      }

      // Older rows may have been rewritten to 'SPLIT'; recover the real type from their previous splits.
      let parentType = parent.transaction_type;
      if (parentType === 'SPLIT') {
        const prior = await QueryHelper.queryOne(
          `SELECT transaction_type FROM transaction_splits WHERE parent_transaction_id = $1 AND transaction_type <> 'SPLIT' LIMIT 1`,
          [transactionId],
          client
        );
        parentType = prior?.transaction_type || 'EXPENSE';
      }

      await QueryHelper.query('DELETE FROM transaction_splits WHERE parent_transaction_id = $1', [transactionId], client);

      const createdSplits = [];
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        const result = await QueryHelper.query(`
          INSERT INTO transaction_splits (parent_transaction_id, category_id, amount, description, transaction_type, linked_entity_type, linked_entity_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [
          transactionId,
          split.category_id || null,
          amounts[i],
          split.description || parent.description,
          parentType, // splits share the parent's direction; mixing types would break the ledger
          split.linked_entity_type || null,
          split.linked_entity_id || null,
        ], client);
        createdSplits.push(result[0]);
      }

      if (parentType !== parent.transaction_type) {
        await QueryHelper.query(
          'UPDATE transactions SET transaction_type = $1, updated_at = NOW() WHERE id = $2',
          [parentType, transactionId],
          client
        );
      }

      await logAudit(householdId, currentUserId, 'TRANSACTION', transactionId, 'UPDATE', { splits: 'replaced' }, { splits_count: createdSplits.length }, client);
      return createdSplits;
    });
  }
}
