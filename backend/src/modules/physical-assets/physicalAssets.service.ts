import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export interface PhysicalAsset {
  id: string;
  household_id: string;
  owner_user_id: string;
  owner_name: string;
  asset_name: string;
  asset_type: 'PHYSICAL_GOLD' | 'DIGITAL_GOLD' | 'SGB' | 'VEHICLE' | 'PROPERTY' | 'OTHER_ASSET';
  quantity: number;
  unit: string;
  purchase_cost: number;
  current_value: number;
  as_of_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class PhysicalAssetsService {
  static async listAssets(householdId: string, userId?: string): Promise<PhysicalAsset[]> {
    let sql = `
      SELECT 
        pa.id,
        pa.household_id,
        pa.owner_user_id,
        u.name as owner_name,
        pa.asset_name,
        pa.asset_type,
        CAST(pa.quantity AS FLOAT) as quantity,
        pa.unit,
        CAST(pa.purchase_cost AS FLOAT) as purchase_cost,
        CAST(pa.current_value AS FLOAT) as current_value,
        pa.as_of_date,
        pa.notes,
        pa.created_at,
        pa.updated_at
      FROM physical_assets pa
      JOIN users u ON u.id = pa.owner_user_id
      WHERE pa.household_id = $1
    `;
    const params: any[] = [householdId];

    if (userId) {
      sql += ` AND pa.owner_user_id = $2`;
      params.push(userId);
    }

    sql += ` ORDER BY pa.created_at DESC`;
    return QueryHelper.query<PhysicalAsset>(sql, params);
  }

  static async getAssetById(id: string, householdId: string): Promise<PhysicalAsset | null> {
    const sql = `
      SELECT 
        pa.id,
        pa.household_id,
        pa.owner_user_id,
        u.name as owner_name,
        pa.asset_name,
        pa.asset_type,
        CAST(pa.quantity AS FLOAT) as quantity,
        pa.unit,
        CAST(pa.purchase_cost AS FLOAT) as purchase_cost,
        CAST(pa.current_value AS FLOAT) as current_value,
        pa.as_of_date,
        pa.notes,
        pa.created_at,
        pa.updated_at
      FROM physical_assets pa
      JOIN users u ON u.id = pa.owner_user_id
      WHERE pa.id = $1 AND pa.household_id = $2
    `;
    return QueryHelper.queryOne<PhysicalAsset>(sql, [id, householdId]);
  }

  static async createAsset(householdId: string, currentUserId: string, data: any) {
    const asset = await QueryHelper.insert('physical_assets', {
      household_id: householdId,
      owner_user_id: data.owner_user_id || currentUserId,
      asset_name: data.asset_name,
      asset_type: data.asset_type || 'PHYSICAL_GOLD',
      quantity: data.quantity || 1.0,
      unit: data.unit || 'units',
      purchase_cost: data.purchase_cost || 0.00,
      current_value: data.current_value || data.purchase_cost || 0.00,
      as_of_date: data.as_of_date || new Date().toISOString().split('T')[0],
      notes: data.notes || null,
    });

    await logAudit(householdId, currentUserId, 'ASSET', asset.id, 'CREATE', null, asset);
    return this.getAssetById(asset.id, householdId);
  }

  static async updateAsset(id: string, householdId: string, currentUserId: string, data: any) {
    const oldAsset = await this.getAssetById(id, householdId);
    if (!oldAsset) {
      const error: any = new Error('Asset not found');
      error.status = 404;
      error.code = 'ASSET_NOT_FOUND';
      throw error;
    }

    const updated = await QueryHelper.update('physical_assets', id, {
      asset_name: data.asset_name,
      asset_type: data.asset_type,
      quantity: data.quantity,
      unit: data.unit,
      purchase_cost: data.purchase_cost,
      current_value: data.current_value,
      as_of_date: data.as_of_date,
      notes: data.notes,
    }, 'household_id = $1', [householdId]);

    await logAudit(householdId, currentUserId, 'ASSET', id, 'UPDATE', oldAsset, updated);
    return this.getAssetById(id, householdId);
  }

  static async deleteAsset(id: string, householdId: string, currentUserId: string) {
    const oldAsset = await this.getAssetById(id, householdId);
    if (!oldAsset) {
      const error: any = new Error('Asset not found');
      error.status = 404;
      error.code = 'ASSET_NOT_FOUND';
      throw error;
    }

    await QueryHelper.delete('physical_assets', id, 'household_id = $1', [householdId]);
    await logAudit(householdId, currentUserId, 'ASSET', id, 'DELETE', oldAsset, null);
    return true;
  }
}
