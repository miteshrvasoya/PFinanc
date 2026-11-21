import { QueryHelper } from '../../database/queryHelper.js';
import { pickFields, notFoundError } from '../../utils/object.js';
import { assertCategoryUsable } from '../../middleware/rbac.js';
import { logAudit } from '../../utils/audit.js';

export class BudgetsService {
  static async getBudgets(householdId: string) {
    const sql = `
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM budgets b 
      LEFT JOIN categories c ON c.id = b.category_id 
      WHERE b.household_id = $1 
      ORDER BY b.created_at DESC
    `;
    return QueryHelper.query(sql, [householdId]);
  }

  static async createBudget(householdId: string, currentUserId: string, data: any) {
    await assertCategoryUsable(data.category_id, householdId);
    const budget = await QueryHelper.insert('budgets', {
      household_id: householdId,
      category_id: data.category_id || null,
      amount: data.amount,
      period: data.period || 'MONTHLY',
      start_date: data.start_date,
      end_date: data.end_date,
    });

    await logAudit(householdId, currentUserId, 'BUDGET', budget.id, 'CREATE', null, budget);
    return budget;
  }

  static async updateBudget(id: string, householdId: string, currentUserId: string, data: any) {
    const old = await QueryHelper.queryOne('SELECT * FROM budgets WHERE id = $1 AND household_id = $2', [id, householdId]);
    if (!old) throw notFoundError('Budget not found', 'BUDGET_NOT_FOUND');

    const changes = pickFields(data, ['category_id', 'amount', 'period', 'start_date', 'end_date']);
    if ('category_id' in changes) await assertCategoryUsable(changes.category_id, householdId);
    const updated = await QueryHelper.update('budgets', id, changes, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'BUDGET', id, 'UPDATE', old, updated);
    return updated;
  }

  static async deleteBudget(id: string, householdId: string, currentUserId: string) {
    const old = await QueryHelper.queryOne('SELECT * FROM budgets WHERE id = $1 AND household_id = $2', [id, householdId]);
    if (!old) throw notFoundError('Budget not found', 'BUDGET_NOT_FOUND');

    await QueryHelper.query('DELETE FROM budgets WHERE id = $1 AND household_id = $2', [id, householdId]);
    await logAudit(householdId, currentUserId, 'BUDGET', id, 'DELETE', old, null);
    return true;
  }
}
