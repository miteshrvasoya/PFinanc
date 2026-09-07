import { PoolClient } from 'pg';
import { QueryHelper } from '../database/queryHelper.js';

export async function logAudit(
  householdId: string | null,
  userId: string | null,
  entityType: string,
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CONFIRM' | 'REJECT' | 'VOID' | 'IMPORT' | 'TRANSFER',
  oldValues: Record<string, any> | null = null,
  newValues: Record<string, any> | null = null,
  client?: PoolClient
): Promise<void> {
  try {
    await QueryHelper.insert(
      'audit_logs',
      {
        household_id: householdId,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
      },
      client
    );
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}
