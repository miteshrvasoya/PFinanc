import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { QueryHelper } from '../../database/queryHelper.js';
import { config } from '../../config/env.js';
import { logAudit } from '../../utils/audit.js';

export class InvitationsService {
  static async createInvitation(
    householdId: string,
    inviterUserId: string,
    data: { email: string; name?: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER' }
  ) {
    const email = data.email.toLowerCase().trim();
    const role = data.role || 'MEMBER';
    const name = data.name?.trim() || null;

    // Check if user is already a member
    const existingMember = await QueryHelper.queryOne(
      `SELECT hm.id FROM household_members hm
       JOIN users u ON u.id = hm.user_id
       WHERE hm.household_id = $1 AND u.email = $2 AND hm.status = 'ACTIVE'`,
      [householdId, email]
    );

    if (existingMember) {
      const error: any = new Error('User is already an active member of this household');
      error.status = 400;
      error.code = 'ALREADY_MEMBER';
      throw error;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const invitation = await QueryHelper.insert('household_invitations', {
      household_id: householdId,
      inviter_user_id: inviterUserId,
      email,
      name,
      role,
      token,
      status: 'PENDING',
      expires_at: expiresAt,
    });

    await logAudit(householdId, inviterUserId, 'HOUSEHOLD', householdId, 'CREATE', null, invitation);
    return invitation;
  }

  static async listInvitations(householdId: string) {
    return QueryHelper.query(
      `SELECT hi.*, u.name as inviter_name
       FROM household_invitations hi
       JOIN users u ON u.id = hi.inviter_user_id
       WHERE hi.household_id = $1
       ORDER BY hi.created_at DESC`,
      [householdId]
    );
  }

  static async getInvitationByToken(token: string) {
    const inv = await QueryHelper.queryOne<any>(
      `SELECT hi.*, h.name as household_name, u.name as inviter_name
       FROM household_invitations hi
       JOIN households h ON h.id = hi.household_id
       JOIN users u ON u.id = hi.inviter_user_id
       WHERE hi.token = $1 AND hi.status = 'PENDING' AND hi.expires_at > NOW()`,
      [token]
    );

    if (!inv) {
      const error: any = new Error('Invitation is invalid or has expired');
      error.status = 404;
      error.code = 'INVALID_INVITATION';
      throw error;
    }

    return inv;
  }

  static async acceptInvitation(token: string, data: { name?: string; password?: string; existingUserId?: string }) {
    const inv = await this.getInvitationByToken(token);

    let userId = data.existingUserId;

    if (!userId) {
      if (!data.password) {
        const error: any = new Error('Password is required to set up your account');
        error.status = 400;
        throw error;
      }

      // Check if user exists by email
      let user = await QueryHelper.queryOne<any>(`SELECT * FROM users WHERE email = $1`, [inv.email]);
      if (!user) {
        const passwordHash = await bcrypt.hash(data.password, 10);
        user = await QueryHelper.insert('users', {
          email: inv.email,
          password_hash: passwordHash,
          name: data.name || inv.name || inv.email.split('@')[0],
          status: 'ACTIVE',
        });
      }
      userId = user.id;
    }

    // Add user to household
    await QueryHelper.insert('household_members', {
      household_id: inv.household_id,
      user_id: userId,
      role: inv.role,
      status: 'ACTIVE',
    });

    // Initialize personal onboarding progress for invited member
    const existingOnboarding = await QueryHelper.queryOne(
      `SELECT id FROM onboarding_progress WHERE user_id = $1 AND household_id = $2`,
      [userId, inv.household_id]
    );
    if (!existingOnboarding) {
      await QueryHelper.insert('onboarding_progress', {
        household_id: inv.household_id,
        user_id: userId,
        current_step: 'welcome',
        status: 'IN_PROGRESS',
        completed_sections: JSON.stringify([]),
        metadata: JSON.stringify({ invited: true }),
      });
    }

    // Mark invitation as ACCEPTED
    await QueryHelper.update('household_invitations', inv.id, {
      status: 'ACCEPTED',
    });

    const user = await QueryHelper.queryOne<any>(`SELECT id, email, name, avatar_url FROM users WHERE id = $1`, [userId]);
    const jwtToken = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: (config.jwt.expiresIn || '7d') as any,
    });

    return {
      user,
      token: jwtToken,
      householdId: inv.household_id,
      householdName: inv.household_name,
    };
  }

  static async revokeInvitation(householdId: string, invitationId: string, currentUserId: string) {
    const updated = await QueryHelper.update('household_invitations', invitationId, {
      status: 'REVOKED',
    }, 'household_id = $1', [householdId]);

    await logAudit(householdId, currentUserId, 'HOUSEHOLD', householdId, 'UPDATE', null, updated);
    return true;
  }
}
