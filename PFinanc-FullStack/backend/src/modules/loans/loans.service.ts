import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export class LoansService {
  static async getLoans(householdId: string, type?: string) {
    let sql = 'SELECT * FROM loans WHERE household_id = $1';
    const params: any[] = [householdId];

    if (type) {
      params.push(type);
      sql += ' AND loan_type = $2';
    }

    sql += ' ORDER BY created_at DESC';
    return QueryHelper.query(sql, params);
  }

  static async getLoanById(id: string, householdId: string) {
    return QueryHelper.queryOne('SELECT * FROM loans WHERE id = $1 AND household_id = $2', [id, householdId]);
  }

  static async createLoan(householdId: string, currentUserId: string, data: any) {
    const loan = await QueryHelper.insert('loans', {
      household_id: householdId,
      name: data.name,
      loan_type: data.loan_type,
      counterparty: data.counterparty,
      principal_amount: data.principal_amount,
      outstanding_amount: data.outstanding_amount ?? data.principal_amount,
      interest_rate: data.interest_rate,
      tenure_months: data.tenure_months,
      emi_amount: data.emi_amount,
      start_date: data.start_date,
      end_date: data.end_date,
      linked_account_id: data.linked_account_id,
      status: 'ACTIVE'
    });

    await logAudit(householdId, currentUserId, 'LOAN', loan.id, 'CREATE', null, loan);
    return loan;
  }

  static async updateLoan(id: string, householdId: string, currentUserId: string, data: any) {
    const old = await this.getLoanById(id, householdId);
    if (!old) throw new Error('Loan not found');

    const updated = await QueryHelper.update('loans', id, data, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'LOAN', id, 'UPDATE', old, updated);
    return updated;
  }
}
