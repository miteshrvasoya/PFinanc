import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export class HouseholdsService {
  static async getHousehold(householdId: string) {
    const household = await QueryHelper.queryOne(
      `SELECT id, name, default_currency, created_by, created_at, updated_at FROM households WHERE id = $1`,
      [householdId]
    );

    if (!household) {
      const error: any = new Error('Household not found');
      error.status = 404;
      error.code = 'HOUSEHOLD_NOT_FOUND';
      throw error;
    }

    const members = await QueryHelper.query(
      `SELECT hm.id, hm.user_id, hm.role, hm.status, hm.joined_at, u.name, u.email, u.avatar_url
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id
       WHERE hm.household_id = $1
       ORDER BY hm.created_at ASC`,
      [householdId]
    );

    return { ...household, members };
  }

  static async updateHousehold(householdId: string, userId: string, data: { name?: string; default_currency?: string }) {
    const oldHousehold = await QueryHelper.queryOne(`SELECT * FROM households WHERE id = $1`, [householdId]);
    const updated = await QueryHelper.update('households', householdId, data);
    await logAudit(householdId, userId, 'HOUSEHOLD', householdId, 'UPDATE', oldHousehold, updated);
    return updated;
  }

  static async addMember(householdId: string, currentUserId: string, data: { email: string; role: 'ADMIN' | 'MEMBER' | 'VIEWER' }) {
    const targetUser = await QueryHelper.queryOne(`SELECT id, name, email FROM users WHERE email = $1`, [data.email.toLowerCase()]);
    if (!targetUser) {
      const error: any = new Error('User with this email not found. User must register first.');
      error.status = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const existingMember = await QueryHelper.queryOne(
      `SELECT id FROM household_members WHERE household_id = $1 AND user_id = $2`,
      [householdId, targetUser.id]
    );

    if (existingMember) {
      const error: any = new Error('User is already a member of this household');
      error.status = 400;
      error.code = 'MEMBER_ALREADY_EXISTS';
      throw error;
    }

    const member = await QueryHelper.insert('household_members', {
      household_id: householdId,
      user_id: targetUser.id,
      role: data.role,
      status: 'ACTIVE',
    });

    await logAudit(householdId, currentUserId, 'HOUSEHOLD_MEMBER', member.id, 'CREATE', null, member);
    return { ...member, user: targetUser };
  }

  static async updateMemberRole(householdId: string, currentUserId: string, memberId: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER') {
    const oldMember = await QueryHelper.queryOne(
      `SELECT * FROM household_members WHERE id = $1 AND household_id = $2`,
      [memberId, householdId]
    );

    if (!oldMember) {
      const error: any = new Error('Household member not found');
      error.status = 404;
      error.code = 'MEMBER_NOT_FOUND';
      throw error;
    }

    if (oldMember.role === 'OWNER') {
      const error: any = new Error('Cannot change role of household owner');
      error.status = 400;
      error.code = 'CANNOT_MODIFY_OWNER';
      throw error;
    }

    const updated = await QueryHelper.update('household_members', memberId, { role });
    await logAudit(householdId, currentUserId, 'HOUSEHOLD_MEMBER', memberId, 'UPDATE', oldMember, updated);
    return updated;
  }
}
