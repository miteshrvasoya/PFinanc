import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export class SplitsService {
  static async getSplitsForTransaction(transactionId: string) {
    return QueryHelper.query(`
      SELECT ts.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM transaction_splits ts
      LEFT JOIN categories c ON c.id = ts.category_id
      WHERE ts.parent_transaction_id = $1
      ORDER BY ts.created_at ASC
    `, [transactionId]);
  }

  static async splitTransaction(householdId: string, currentUserId: string, transactionId: string, splits: any[]) {
    return QueryHelper.transaction(async (client) => {
      const parent = await QueryHelper.queryOne('SELECT * FROM transactions WHERE id = $1 AND household_id = $2', [transactionId, householdId], client);
      if (!parent) throw new Error('Transaction not found');

      const totalSplitAmount = splits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (Math.abs(totalSplitAmount - parseFloat(parent.amount)) > 0.01) {
        throw new Error('Split amounts must equal the original transaction amount');
      }

      // First delete existing splits if any
      await QueryHelper.query('DELETE FROM transaction_splits WHERE parent_transaction_id = $1', [transactionId], client);

      const createdSplits = [];
      for (const split of splits) {
        const result = await QueryHelper.query(`
          INSERT INTO transaction_splits (parent_transaction_id, category_id, amount, description, transaction_type, linked_entity_type, linked_entity_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [
          transactionId, 
          split.category_id || null, 
          split.amount, 
          split.description || parent.description, 
          split.transaction_type || parent.transaction_type,
          split.linked_entity_type || null,
          split.linked_entity_id || null
        ], client);
        createdSplits.push(result[0]);
      }

      // Mark the parent transaction as a SPLIT type to indicate it is composed of splits
      // But we preserve its original amount
      await QueryHelper.query('UPDATE transactions SET transaction_type = $1 WHERE id = $2', ['SPLIT', transactionId], client);
      
      await logAudit(householdId, currentUserId, 'TRANSACTION', transactionId, 'UPDATE', { splits: 'created' }, { splits_count: createdSplits.length });
      return createdSplits;
    });
  }
}
