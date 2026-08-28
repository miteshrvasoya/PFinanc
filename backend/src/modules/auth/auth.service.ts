import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { QueryHelper } from '../../database/queryHelper.js';
import { config } from '../../config/env.js';

export class AuthService {
  /**
   * Check system status to detect fresh installations with zero users
   */
  static async getSystemStatus() {
    const userCountResult = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM users`
    );
    const userCount = parseInt(userCountResult?.count || '0', 10);
    return {
      isFirstInstall: userCount === 0,
      userCount,
    };
  }

  /**
   * Register a new user, create their default household, assign OWNER role, and setup onboarding
   */
  static async register(data: { email: string; password: string; name: string; household_name?: string | null }) {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanName = (data.name || '').trim();

    return QueryHelper.transaction(async (client) => {
      const existing = await QueryHelper.queryOne(
        `SELECT id FROM users WHERE email = $1`,
        [cleanEmail],
        client
      );
      if (existing) {
        const error: any = new Error('User with this email already exists');
        error.status = 400;
        error.code = 'EMAIL_ALREADY_EXISTS';
        throw error;
      }

      // Check if this is the very first user in the system
      const userCountResult = await QueryHelper.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM users`,
        [],
        client
      );
      const isFirstUser = parseInt(userCountResult?.count || '0', 10) === 0;

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await QueryHelper.insert(
        'users',
        {
          email: cleanEmail,
          password_hash: passwordHash,
          name: cleanName,
          status: 'ACTIVE',
        },
        client
      );

      // Create a household for new user
      const householdName = (data.household_name && data.household_name.trim()) || `${cleanName}'s Family`;
      const household = await QueryHelper.insert(
        'households',
        {
          name: householdName,
          default_currency: 'INR',
          created_by: user.id,
        },
        client
      );

      await QueryHelper.insert(
        'household_members',
        {
          household_id: household.id,
          user_id: user.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
        client
      );

      // Initialize onboarding progress for this user + household
      await QueryHelper.insert(
        'onboarding_progress',
        {
          household_id: household.id,
          user_id: user.id,
          current_step: 'welcome',
          status: 'IN_PROGRESS',
          completed_sections: JSON.stringify([]),
          metadata: JSON.stringify({ isFirstUser }),
        },
        client
      );

      const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
        expiresIn: (config.jwt.expiresIn || '7d') as any,
      });

      return {
        user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
        token,
        defaultHouseholdId: household.id,
        isFirstUser,
      };
    });
  }

  static async login(data: { email: string; password: string }) {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const user = await QueryHelper.queryOne(
      `SELECT id, email, password_hash, name, avatar_url, status FROM users WHERE email = $1`,
      [cleanEmail]
    );

    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.status = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      const error: any = new Error('Invalid email or password');
      error.status = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    await QueryHelper.update('users', user.id, { last_login_at: new Date().toISOString() });

    const households = await QueryHelper.query(
      `SELECT h.id, h.name, h.default_currency, hm.role
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1 AND hm.status = 'ACTIVE'
       ORDER BY hm.created_at ASC`,
      [user.id]
    );

    const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: (config.jwt.expiresIn || '7d') as any,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      token,
      households,
      defaultHouseholdId: households.length > 0 ? households[0].id : null,
    };
  }

  static async getMe(userId: string) {
    const user = await QueryHelper.queryOne(
      `SELECT id, email, name, avatar_url, status, created_at, last_login_at FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const households = await QueryHelper.query(
      `SELECT h.id, h.name, h.default_currency, hm.role, hm.status
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1 AND hm.status = 'ACTIVE'
       ORDER BY hm.created_at ASC`,
      [user.id]
    );

    return { user, households };
  }
}
