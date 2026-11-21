import { QueryHelper } from '../../database/queryHelper.js';
import { pickFields, notFoundError } from '../../utils/object.js';
import { assertAccountInHousehold } from '../../middleware/rbac.js';
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
    if (data.linked_account_id) await assertAccountInHousehold(data.linked_account_id, householdId);
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
    if (!old) throw notFoundError('Loan not found', 'LOAN_NOT_FOUND');

    const changes = pickFields(data, [
      'name', 'loan_type', 'counterparty', 'principal_amount', 'outstanding_amount', 'interest_rate',
      'tenure_months', 'emi_amount', 'start_date', 'end_date', 'status', 'linked_account_id',
    ]);
    if (changes.linked_account_id) await assertAccountInHousehold(changes.linked_account_id, householdId);
    const updated = await QueryHelper.update('loans', id, changes, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'LOAN', id, 'UPDATE', old, updated);
    return updated;
  }

  /**
   * Current outstanding per active loan.
   * Borrowed loans with an interest rate and EMI payments linked to them are amortised from the
   * principal (interest = balance × rate / 12 per EMI, the rest reduces principal), so the figure
   * stays right as new EMIs are recorded. Otherwise the stored outstanding_amount is used.
   */
  static async getOutstanding(householdId: string, linkedOwnerUserId?: string) {
    const params: any[] = [householdId];
    let ownerSql = '';
    if (linkedOwnerUserId) {
      params.push(linkedOwnerUserId);
      ownerSql = `AND l.linked_account_id IN (SELECT id FROM accounts WHERE owner_user_id = $${params.length})`;
    }
    const loans = await QueryHelper.query<any>(
      `SELECT l.id, l.name, l.loan_type, l.counterparty,
              l.principal_amount::float AS principal, l.outstanding_amount::float AS stored_outstanding,
              l.interest_rate::float AS rate, l.emi_amount::float AS emi,
              COALESCE(
                (SELECT json_agg(t.amount::float ORDER BY t.transaction_date, t.created_at)
                 FROM transactions t
                 WHERE t.household_id = l.household_id AND t.status = 'CONFIRMED'
                   AND t.linked_entity_type = 'LOAN' AND t.linked_entity_id = l.id
                   AND t.transaction_type IN ('EMI_PAYMENT', 'BORROWED_PRINCIPAL_REPAID')),
                '[]'::json) AS payments
       FROM loans l
       WHERE l.household_id = $1 AND l.status = 'ACTIVE' ${ownerSql}
       ORDER BY l.created_at`,
      params
    );

    return loans.map((l) => {
      const payments: number[] = Array.isArray(l.payments) ? l.payments : [];
      let outstanding = l.stored_outstanding;
      let method: 'AMORTISED' | 'STORED' = 'STORED';
      if (l.loan_type !== 'LENT_TO_PERSON' && l.principal > 0 && l.rate > 0 && payments.length > 0) {
        let balance = l.principal;
        for (const paid of payments) {
          const interest = (balance * l.rate) / 1200;
          balance = Math.max(0, balance - Math.max(0, paid - interest));
        }
        outstanding = Math.round(balance * 100) / 100;
        method = 'AMORTISED';
      }
      return {
        id: l.id,
        name: l.name,
        loanType: l.loan_type,
        counterparty: l.counterparty,
        emi: l.emi || 0,
        outstanding: outstanding || 0,
        paymentsRecorded: payments.length,
        method,
      };
    });
  }
}
