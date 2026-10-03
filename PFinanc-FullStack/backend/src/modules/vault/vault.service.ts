import { QueryHelper } from '../../database/queryHelper.js';

export interface VaultItem {
  id: string;
  owner_id: string;
  household_id?: string;
  category: string;
  is_shared: boolean;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  created_at: string;
  updated_at: string;
}

export class VaultService {
  static async getItems(userId: string): Promise<VaultItem[]> {
    return await QueryHelper.query<VaultItem>(
      `SELECT * FROM vault_items WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
  }

  static async createItem(
    userId: string,
    data: {
      category?: string;
      household_id?: string;
      is_shared?: boolean;
      encrypted_data: string;
      iv: string;
      auth_tag: string;
    }
  ): Promise<VaultItem> {
    const item = await QueryHelper.queryOne<VaultItem>(
      `INSERT INTO vault_items (owner_id, category, household_id, is_shared, encrypted_data, iv, auth_tag)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        data.category || 'Other',
        data.household_id || null,
        data.is_shared || false,
        data.encrypted_data,
        data.iv,
        data.auth_tag
      ]
    );
    if (!item) throw new Error('Failed to create vault item');
    return item;
  }

  static async updateItem(
    userId: string,
    itemId: string,
    data: Partial<VaultItem>
  ): Promise<VaultItem | null> {
    
    // First, verify ownership
    const existing = await QueryHelper.queryOne<{ id: string }>(
      `SELECT id FROM vault_items WHERE id = $1 AND owner_id = $2`,
      [itemId, userId]
    );
    
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.is_shared !== undefined) {
      updates.push(`is_shared = $${paramIndex++}`);
      values.push(data.is_shared);
    }
    if (data.encrypted_data !== undefined) {
      updates.push(`encrypted_data = $${paramIndex++}`);
      values.push(data.encrypted_data);
    }
    if (data.iv !== undefined) {
      updates.push(`iv = $${paramIndex++}`);
      values.push(data.iv);
    }
    if (data.auth_tag !== undefined) {
      updates.push(`auth_tag = $${paramIndex++}`);
      values.push(data.auth_tag);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) { // Only updated_at
      return await QueryHelper.queryOne<VaultItem>(`SELECT * FROM vault_items WHERE id = $1`, [itemId]);
    }

    values.push(itemId);
    values.push(userId);
    
    return await QueryHelper.queryOne<VaultItem>(
      `UPDATE vault_items 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );
  }

  static async deleteItem(userId: string, itemId: string): Promise<boolean> {
    const result = await QueryHelper.queryOne<{ id: string }>(
      `DELETE FROM vault_items WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [itemId, userId]
    );
    return !!result;
  }
}
