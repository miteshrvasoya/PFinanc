import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export interface CreateTransferInput {
  householdId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency?: string;
  transferDate?: string;
  description?: string;
  reference?: string;
  status?: 'DRAFT' | 'CONFIRMED';
}

export class TransfersService {
  static async createTransfer(userId: string, input: CreateTransferInput) {
    if (input.sourceAccountId === input.destinationAccountId) {
      const error: any = new Error('Source and destination accounts must be different');
      error.status = 400;
      error.code = 'SAME_ACCOUNT_TRANSFER';
      throw error;
    }

    const sourceAcc = await QueryHelper.queryOne(
      `SELECT a.id, a.name, a.owner_user_id, u.name as owner_name FROM accounts a JOIN users u ON u.id = a.owner_user_id WHERE a.id = $1 AND a.household_id = $2`,
      [input.sourceAccountId, input.householdId]
    );

    const destAcc = await QueryHelper.queryOne(
      `SELECT a.id, a.name, a.owner_user_id, u.name as owner_name FROM accounts a JOIN users u ON u.id = a.owner_user_id WHERE a.id = $1 AND a.household_id = $2`,
      [input.destinationAccountId, input.householdId]
    );

    if (!sourceAcc || !destAcc) {
      const error: any = new Error('Source or Destination account does not exist in this household');
      error.status = 404;
      error.code = 'ACCOUNT_NOT_FOUND';
      throw error;
    }

    const status = input.status || 'CONFIRMED';
    const transferDate = input.transferDate || new Date().toISOString().split('T')[0];
    const currency = input.currency || 'INR';

    return QueryHelper.transaction(async (client) => {
      // 1. Create Transfer record
      const transfer = await QueryHelper.insert('transfers', {
        household_id: input.householdId,
        source_account_id: input.sourceAccountId,
        destination_account_id: input.destinationAccountId,
        amount: input.amount,
        currency,
        transfer_date: transferDate,
        status,
        description: input.description || `Transfer: ${sourceAcc.name} -> ${destAcc.name}`,
        reference: input.reference || null,
        created_by: userId,
      }, client);

      // 2. Create Source Account Debit Leg
      await QueryHelper.insert('transactions', {
        household_id: input.householdId,
        account_id: input.sourceAccountId,
        user_id: sourceAcc.owner_user_id,
        transfer_id: transfer.id,
        transaction_type: 'TRANSFER',
        amount: input.amount,
        currency,
        transaction_date: transferDate,
        description: `Transfer to ${destAcc.owner_name} (${destAcc.name})${input.description ? ` - ${input.description}` : ''}`,
        merchant_name: destAcc.name,
        status,
        source_type: 'MANUAL',
        source_reference: input.reference || null,
      }, client);

      // 3. Create Destination Account Credit Leg
      await QueryHelper.insert('transactions', {
        household_id: input.householdId,
        account_id: input.destinationAccountId,
        user_id: destAcc.owner_user_id,
        transfer_id: transfer.id,
        transaction_type: 'TRANSFER',
        amount: input.amount,
        currency,
        transaction_date: transferDate,
        description: `Transfer from ${sourceAcc.owner_name} (${sourceAcc.name})${input.description ? ` - ${input.description}` : ''}`,
        merchant_name: sourceAcc.name,
        status,
        source_type: 'MANUAL',
        source_reference: input.reference || null,
      }, client);

      await logAudit(input.householdId, userId, 'TRANSFER', transfer.id, 'TRANSFER', null, transfer, client);

      return this.getTransferById(transfer.id, input.householdId, client);
    });
  }

  static async listTransfers(householdId: string) {
    const sql = `
      SELECT 
        tr.id,
        tr.household_id,
        tr.source_account_id,
        sa.name AS source_account_name,
        su.name AS source_owner_name,
        tr.destination_account_id,
        da.name AS destination_account_name,
        du.name AS destination_owner_name,
        CAST(tr.amount AS FLOAT) AS amount,
        tr.currency,
        tr.transfer_date,
        tr.status,
        tr.description,
        tr.reference,
        tr.created_by,
        u.name AS created_by_name,
        tr.created_at
      FROM transfers tr
      JOIN accounts sa ON sa.id = tr.source_account_id
      JOIN users su ON su.id = sa.owner_user_id
      JOIN accounts da ON da.id = tr.destination_account_id
      JOIN users du ON du.id = da.owner_user_id
      LEFT JOIN users u ON u.id = tr.created_by
      WHERE tr.household_id = $1
      ORDER BY tr.transfer_date DESC, tr.created_at DESC
    `;

    return QueryHelper.query(sql, [householdId]);
  }

  static async getTransferById(id: string, householdId: string, client?: any) {
    const sql = `
      SELECT 
        tr.id,
        tr.household_id,
        tr.source_account_id,
        sa.name AS source_account_name,
        su.name AS source_owner_name,
        tr.destination_account_id,
        da.name AS destination_account_name,
        du.name AS destination_owner_name,
        CAST(tr.amount AS FLOAT) AS amount,
        tr.currency,
        tr.transfer_date,
        tr.status,
        tr.description,
        tr.reference,
        tr.created_by,
        u.name AS created_by_name,
        tr.created_at
      FROM transfers tr
      JOIN accounts sa ON sa.id = tr.source_account_id
      JOIN users su ON su.id = sa.owner_user_id
      JOIN accounts da ON da.id = tr.destination_account_id
      JOIN users du ON du.id = da.owner_user_id
      LEFT JOIN users u ON u.id = tr.created_by
      WHERE tr.id = $1 AND tr.household_id = $2
    `;

    return QueryHelper.queryOne(sql, [id, householdId], client);
  }

  static async voidTransfer(id: string, householdId: string, userId: string) {
    const transfer = await QueryHelper.queryOne(`SELECT * FROM transfers WHERE id = $1 AND household_id = $2`, [id, householdId]);
    if (!transfer) {
      const error: any = new Error('Transfer not found');
      error.status = 404;
      error.code = 'TRANSFER_NOT_FOUND';
      throw error;
    }

    await QueryHelper.transaction(async (client) => {
      await QueryHelper.update('transfers', id, { status: 'VOID' }, '', [], client);
      await QueryHelper.query(`UPDATE transactions SET status = 'VOID' WHERE transfer_id = $1`, [id], client);
      await logAudit(householdId, userId, 'TRANSFER', id, 'VOID', transfer, { ...transfer, status: 'VOID' }, client);
    });

    return this.getTransferById(id, householdId);
  }
}
