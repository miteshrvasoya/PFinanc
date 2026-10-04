import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export class RentService {
  static async getAgreements(householdId: string) {
    return QueryHelper.query('SELECT * FROM rent_agreements WHERE household_id = $1 ORDER BY created_at DESC', [householdId]);
  }

  static async createAgreement(householdId: string, currentUserId: string, data: any) {
    const rent = await QueryHelper.insert('rent_agreements', {
      household_id: householdId,
      name: data.name,
      rent_type: data.rent_type,
      property_name: data.property_name,
      counterparty: data.counterparty,
      amount: data.amount,
      frequency: data.frequency || 'MONTHLY',
      start_date: data.start_date,
      end_date: data.end_date,
      status: 'ACTIVE'
    });

    await logAudit(householdId, currentUserId, 'RENT', rent.id, 'CREATE', null, rent);
    return rent;
  }

  static async updateAgreement(id: string, householdId: string, currentUserId: string, data: any) {
    const old = await QueryHelper.queryOne('SELECT * FROM rent_agreements WHERE id = $1 AND household_id = $2', [id, householdId]);
    if (!old) throw new Error('Rent agreement not found');

    const updated = await QueryHelper.update('rent_agreements', id, data, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'RENT', id, 'UPDATE', old, updated);
    return updated;
  }
}
