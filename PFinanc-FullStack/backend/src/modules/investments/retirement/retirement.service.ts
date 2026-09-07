import { QueryHelper } from '../../../database/queryHelper.js';
import { logAudit } from '../../../utils/audit.js';

export class RetirementService {
  static async listAccounts(householdId: string, userId?: string) {
    const conditions = ['ra.household_id = $1'];
    const params: any[] = [householdId];

    if (userId) {
      params.push(userId);
      conditions.push(`ra.user_id = $${params.length}`);
    }

    const sql = `
      SELECT 
        ra.id,
        ra.household_id,
        ra.user_id,
        u.name AS user_name,
        ra.account_id,
        ra.asset_type,
        ra.institution_name,
        ra.account_number_masked,
        CAST(ra.opening_balance AS FLOAT) AS opening_balance,
        CAST(ra.current_balance AS FLOAT) AS current_balance,
        ra.notes,
        ra.created_at,
        ra.updated_at,
        (
          SELECT COUNT(*) 
          FROM retirement_contributions rc 
          WHERE rc.retirement_account_id = ra.id
        ) AS contribution_count,
        (
          SELECT MAX(rc.contribution_date)
          FROM retirement_contributions rc
          WHERE rc.retirement_account_id = ra.id
        ) AS last_contribution_date
      FROM retirement_accounts ra
      JOIN users u ON u.id = ra.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ra.asset_type ASC, ra.institution_name ASC
    `;

    return QueryHelper.query(sql, params);
  }

  static async createAccount(userId: string, data: any) {
    const openingBal = parseFloat(data.opening_balance || '0');
    const currentBal = parseFloat(data.current_balance || String(openingBal));

    const accNum = data.account_number
      ? `${data.asset_type}-XXXX-${data.account_number.slice(-4)}`
      : data.account_number_masked || `${data.asset_type}-ACC`;

    const acc = await QueryHelper.insert('retirement_accounts', {
      household_id: data.household_id,
      user_id: data.user_id || userId,
      account_id: data.account_id || null,
      asset_type: data.asset_type,
      institution_name: data.institution_name || data.asset_type,
      account_number_masked: accNum,
      opening_balance: openingBal,
      current_balance: currentBal,
      notes: data.notes || null,
    });

    await logAudit(data.household_id, userId, 'RETIREMENT_ACCOUNT', acc.id, 'CREATE', null, acc);
    return acc;
  }

  static async getContributions(accountId: string, householdId: string) {
    return QueryHelper.query(
      `SELECT 
        id,
        retirement_account_id,
        contribution_date,
        CAST(employee_contribution AS FLOAT) AS employee_contribution,
        CAST(employer_contribution AS FLOAT) AS employer_contribution,
        CAST(interest_amount AS FLOAT) AS interest_amount,
        CAST(withdrawal_amount AS FLOAT) AS withdrawal_amount,
        CAST(total_closing_balance AS FLOAT) AS total_closing_balance,
        notes,
        created_at
       FROM retirement_contributions
       WHERE retirement_account_id = $1 AND household_id = $2
       ORDER BY contribution_date DESC`,
      [accountId, householdId]
    );
  }

  static async addContribution(userId: string, householdId: string, data: any) {
    const account = await QueryHelper.queryOne<{ current_balance: string }>(
      `SELECT current_balance FROM retirement_accounts WHERE id = $1 AND household_id = $2`,
      [data.retirement_account_id, householdId]
    );

    if (!account) {
      const error: any = new Error('Retirement account not found');
      error.status = 404;
      error.code = 'RETIREMENT_ACCOUNT_NOT_FOUND';
      throw error;
    }

    const prevBal = parseFloat(account.current_balance);
    const emp = parseFloat(data.employee_contribution || '0');
    const empyr = parseFloat(data.employer_contribution || '0');
    const intAmt = parseFloat(data.interest_amount || '0');
    const withdr = parseFloat(data.withdrawal_amount || '0');

    let closing = data.total_closing_balance ? parseFloat(data.total_closing_balance) : (prevBal + emp + empyr + intAmt - withdr);

    return QueryHelper.transaction(async (client) => {
      const contrib = await QueryHelper.insert('retirement_contributions', {
        retirement_account_id: data.retirement_account_id,
        household_id: householdId,
        contribution_date: data.contribution_date || new Date().toISOString().split('T')[0],
        employee_contribution: emp,
        employer_contribution: empyr,
        interest_amount: intAmt,
        withdrawal_amount: withdr,
        total_closing_balance: closing,
        notes: data.notes || null,
      }, client);

      await QueryHelper.update('retirement_accounts', data.retirement_account_id, {
        current_balance: closing,
      }, '', [], client);

      await logAudit(householdId, userId, 'RETIREMENT_CONTRIBUTION', contrib.id, 'CREATE', null, contrib, client);
      return contrib;
    });
  }
}
