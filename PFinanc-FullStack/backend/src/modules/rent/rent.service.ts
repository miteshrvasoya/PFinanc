import { QueryHelper } from '../../database/queryHelper.js';
import { pickFields, notFoundError } from '../../utils/object.js';
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
    if (!old) throw notFoundError('Rent agreement not found', 'RENT_NOT_FOUND');

    const changes = pickFields(data, ['name', 'rent_type', 'property_name', 'counterparty', 'amount', 'frequency', 'start_date', 'end_date', 'status']);
    const updated = await QueryHelper.update('rent_agreements', id, changes, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'RENT', id, 'UPDATE', old, updated);
    return updated;
  }
}
