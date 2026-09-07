import { QueryHelper } from '../../../database/queryHelper.js';
import { logAudit } from '../../../utils/audit.js';

export class FixedDepositsService {
  /**
   * Helper to compute compound interest maturity and current values
   */
  static calculateCompoundValuation(
    principal: number,
    interestRatePercent: number,
    frequency: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUALLY' | 'AT_MATURITY',
    startDateStr: string,
    maturityDateStr: string
  ) {
    const r = interestRatePercent / 100;
    let n = 4; // default quarterly compounding in India
    if (frequency === 'MONTHLY') n = 12;
    if (frequency === 'HALF_YEARLY') n = 2;
    if (frequency === 'ANNUALLY') n = 1;
    if (frequency === 'AT_MATURITY') n = 1;

    const startDate = new Date(startDateStr);
    const maturityDate = new Date(maturityDateStr);
    const today = new Date();

    const totalDays = Math.max(1, (maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalYears = totalDays / 365.25;

    const maturityAmount = Math.round(principal * Math.pow(1 + r / n, n * totalYears) * 100) / 100;

    let elapsedDays = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    elapsedDays = Math.max(0, Math.min(totalDays, elapsedDays));
    const elapsedYears = elapsedDays / 365.25;

    const currentValue = Math.round(principal * Math.pow(1 + r / n, n * elapsedYears) * 100) / 100;

    return { maturityAmount, currentValue };
  }

  static async list(householdId: string, userId?: string) {
    const conditions = ['fd.household_id = $1'];
    const params: any[] = [householdId];

    if (userId) {
      params.push(userId);
      conditions.push(`fd.owner_user_id = $${params.length}`);
    }

    const sql = `
      SELECT 
        fd.id,
        fd.household_id,
        fd.account_id,
        fd.owner_user_id,
        u.name AS owner_name,
        fd.institution_name,
        fd.fd_number_masked,
        CAST(fd.principal_amount AS FLOAT) AS principal_amount,
        CAST(fd.interest_rate AS FLOAT) AS interest_rate,
        fd.compounding_frequency,
        fd.start_date,
        fd.maturity_date,
        CAST(fd.maturity_amount AS FLOAT) AS maturity_amount,
        CAST(fd.current_value AS FLOAT) AS current_value,
        fd.status,
        fd.notes,
        fd.created_at,
        fd.updated_at
      FROM fixed_deposits fd
      JOIN users u ON u.id = fd.owner_user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY fd.status ASC, fd.maturity_date ASC
    `;

    const fds = await QueryHelper.query(sql, params);

    // Refresh current accrued valuation on the fly
    return fds.map((fd) => {
      if (fd.status === 'ACTIVE') {
        const { currentValue } = this.calculateCompoundValuation(
          fd.principal_amount,
          fd.interest_rate,
          fd.compounding_frequency as any,
          fd.start_date,
          fd.maturity_date
        );
        return { ...fd, current_value: Math.max(fd.principal_amount, currentValue) };
      }
      return fd;
    });
  }

  static async create(userId: string, data: any) {
    const principal = parseFloat(data.principal_amount);
    const rate = parseFloat(data.interest_rate);
    const freq = data.compounding_frequency || 'QUARTERLY';

    const { maturityAmount, currentValue } = this.calculateCompoundValuation(
      principal,
      rate,
      freq,
      data.start_date,
      data.maturity_date
    );

    const fdNumberMasked = data.fd_number
      ? `FD-XXXX-${data.fd_number.slice(-4)}`
      : data.fd_number_masked || 'FD-ACTIVE';

    const fd = await QueryHelper.insert('fixed_deposits', {
      household_id: data.household_id,
      account_id: data.account_id || null,
      owner_user_id: data.owner_user_id || userId,
      institution_name: data.institution_name,
      fd_number_masked: fdNumberMasked,
      principal_amount: principal,
      interest_rate: rate,
      compounding_frequency: freq,
      start_date: data.start_date,
      maturity_date: data.maturity_date,
      maturity_amount: data.maturity_amount || maturityAmount,
      current_value: data.current_value || currentValue,
      status: data.status || 'ACTIVE',
      notes: data.notes || null,
    });

    await logAudit(data.household_id, userId, 'FIXED_DEPOSIT', fd.id, 'CREATE', null, fd);
    return fd;
  }

  static async update(id: string, householdId: string, userId: string, data: any) {
    const old = await QueryHelper.queryOne(`SELECT * FROM fixed_deposits WHERE id = $1 AND household_id = $2`, [id, householdId]);
    if (!old) {
      const error: any = new Error('Fixed deposit not found');
      error.status = 404;
      error.code = 'FD_NOT_FOUND';
      throw error;
    }

    const updated = await QueryHelper.update('fixed_deposits', id, data, 'household_id = $1', [householdId]);
    await logAudit(householdId, userId, 'FIXED_DEPOSIT', id, 'UPDATE', old, updated);
    return updated;
  }
}
