import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export interface AccountWithBalance {
  id: string;
  household_id: string;
  owner_user_id: string;
  owner_name: string;
  name: string;
  account_type: string;
  institution_name: string;
  account_number_masked: string;
  currency: string;
  opening_balance: number;
  opening_balance_date: string;
  is_shared: boolean;
  is_active: boolean;
  notes: string;
  total_credits: number;
  total_debits: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export class AccountsService {
  /**
   * List all accounts accessible by the current user within a household
   */
  static async listAccounts(householdId: string, userId: string): Promise<AccountWithBalance[]> {
    // Check user's household role
    const member = await QueryHelper.queryOne<{ role: string }>(
      `SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
      [householdId, userId]
    );

    if (!member) {
      const error: any = new Error('Access denied to household');
      error.status = 403;
      error.code = 'ACCESS_DENIED';
      throw error;
    }

    const isPrivileged = member.role === 'OWNER' || member.role === 'ADMIN';

    const sql = `
      WITH account_ledger AS (
        SELECT 
          a.id AS account_id,
          COALESCE(SUM(
            CASE 
              WHEN t.status = 'CONFIRMED' AND (
                t.transaction_type IN ('INCOME', 'REFUND') 
                OR (t.transaction_type = 'TRANSFER' AND tr.destination_account_id = a.id)
              ) THEN t.amount 
              ELSE 0 
            END
          ), 0) AS total_credits,
          COALESCE(SUM(
            CASE 
              WHEN t.status = 'CONFIRMED' AND (
                t.transaction_type IN ('EXPENSE', 'FEE', 'OTHER') 
                OR (t.transaction_type = 'TRANSFER' AND tr.source_account_id = a.id)
              ) THEN t.amount 
              ELSE 0 
            END
          ), 0) AS total_debits
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id
        LEFT JOIN transfers tr ON t.transfer_id = tr.id
        WHERE a.household_id = $1
        GROUP BY a.id
      )
      SELECT 
        a.id,
        a.household_id,
        a.owner_user_id,
        u.name AS owner_name,
        a.name,
        a.account_type,
        a.institution_name,
        a.account_number_masked,
        a.currency,
        CAST(a.opening_balance AS FLOAT) AS opening_balance,
        a.opening_balance_date,
        a.is_shared,
        a.is_active,
        a.notes,
        CAST(al.total_credits AS FLOAT) AS total_credits,
        CAST(al.total_debits AS FLOAT) AS total_debits,
        CAST((a.opening_balance + al.total_credits - al.total_debits) AS FLOAT) AS current_balance,
        a.created_at,
        a.updated_at
      FROM accounts a
      JOIN users u ON u.id = a.owner_user_id
      JOIN account_ledger al ON al.account_id = a.id
      LEFT JOIN account_access aa ON aa.account_id = a.id AND aa.user_id = $2
      WHERE a.household_id = $1
        ${!isPrivileged ? `AND (a.owner_user_id = $2 OR a.is_shared = true OR aa.user_id IS NOT NULL)` : ''}
      ORDER BY a.is_active DESC, a.name ASC
    `;

    return QueryHelper.query<AccountWithBalance>(sql, [householdId, userId]);
  }

  /**
   * Get single account details with balance
   */
  static async getAccountById(accountId: string, householdId: string): Promise<AccountWithBalance | null> {
    const sql = `
      WITH account_ledger AS (
        SELECT 
          a.id AS account_id,
          COALESCE(SUM(
            CASE 
              WHEN t.status = 'CONFIRMED' AND (
                t.transaction_type IN ('INCOME', 'REFUND') 
                OR (t.transaction_type = 'TRANSFER' AND tr.destination_account_id = a.id)
              ) THEN t.amount 
              ELSE 0 
            END
          ), 0) AS total_credits,
          COALESCE(SUM(
            CASE 
              WHEN t.status = 'CONFIRMED' AND (
                t.transaction_type IN ('EXPENSE', 'FEE', 'OTHER') 
                OR (t.transaction_type = 'TRANSFER' AND tr.source_account_id = a.id)
              ) THEN t.amount 
              ELSE 0 
            END
          ), 0) AS total_debits
        FROM accounts a
        LEFT JOIN transactions t ON t.account_id = a.id
        LEFT JOIN transfers tr ON t.transfer_id = tr.id
        WHERE a.id = $1 AND a.household_id = $2
        GROUP BY a.id
      )
      SELECT 
        a.id,
        a.household_id,
        a.owner_user_id,
        u.name AS owner_name,
        a.name,
        a.account_type,
        a.institution_name,
        a.account_number_masked,
        a.currency,
        CAST(a.opening_balance AS FLOAT) AS opening_balance,
        a.opening_balance_date,
        a.is_shared,
        a.is_active,
        a.notes,
        CAST(COALESCE(al.total_credits, 0) AS FLOAT) AS total_credits,
        CAST(COALESCE(al.total_debits, 0) AS FLOAT) AS total_debits,
        CAST((a.opening_balance + COALESCE(al.total_credits, 0) - COALESCE(al.total_debits, 0)) AS FLOAT) AS current_balance,
        a.created_at,
        a.updated_at
      FROM accounts a
      JOIN users u ON u.id = a.owner_user_id
      LEFT JOIN account_ledger al ON al.account_id = a.id
      WHERE a.id = $1 AND a.household_id = $2
    `;

    return QueryHelper.queryOne<AccountWithBalance>(sql, [accountId, householdId]);
  }

  static async createAccount(householdId: string, currentUserId: string, data: any) {
    const maskedNumber = data.account_number
      ? `XXXX XXXX ${data.account_number.slice(-4)}`
      : data.account_number_masked || null;

    const account = await QueryHelper.insert('accounts', {
      household_id: householdId,
      owner_user_id: data.owner_user_id || currentUserId,
      name: data.name,
      account_type: data.account_type,
      institution_name: data.institution_name || null,
      account_number_masked: maskedNumber,
      currency: data.currency || 'INR',
      opening_balance: data.opening_balance || 0.00,
      opening_balance_date: data.opening_balance_date || new Date().toISOString().split('T')[0],
      is_shared: data.is_shared ?? false,
      is_active: true,
      notes: data.notes || null,
    });

    await logAudit(householdId, currentUserId, 'ACCOUNT', account.id, 'CREATE', null, account);
    return this.getAccountById(account.id, householdId);
  }

  static async updateAccount(accountId: string, householdId: string, currentUserId: string, data: any) {
    const oldAccount = await QueryHelper.queryOne(`SELECT * FROM accounts WHERE id = $1 AND household_id = $2`, [accountId, householdId]);
    if (!oldAccount) {
      const error: any = new Error('Account not found');
      error.status = 404;
      error.code = 'ACCOUNT_NOT_FOUND';
      throw error;
    }

    const updateData: Record<string, any> = { ...data };
    if (data.account_number) {
      updateData.account_number_masked = `XXXX XXXX ${data.account_number.slice(-4)}`;
      delete updateData.account_number;
    }

    const updated = await QueryHelper.update('accounts', accountId, updateData, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'ACCOUNT', accountId, 'UPDATE', oldAccount, updated);
    return this.getAccountById(accountId, householdId);
  }

  static async toggleArchive(accountId: string, householdId: string, currentUserId: string) {
    const account = await QueryHelper.queryOne<{ is_active: boolean }>(
      `SELECT is_active FROM accounts WHERE id = $1 AND household_id = $2`,
      [accountId, householdId]
    );

    if (!account) {
      const error: any = new Error('Account not found');
      error.status = 404;
      error.code = 'ACCOUNT_NOT_FOUND';
      throw error;
    }

    const updated = await QueryHelper.update(
      'accounts',
      accountId,
      { is_active: !account.is_active },
      'household_id = $1',
      [householdId]
    );

    await logAudit(householdId, currentUserId, 'ACCOUNT', accountId, 'UPDATE', { is_active: account.is_active }, updated);
    return updated;
  }
}
