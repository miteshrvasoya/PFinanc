import { Request, Response, NextFunction } from 'express';
import { QueryHelper } from '../database/queryHelper.js';

export interface HouseholdMembership {
  household_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

declare global {
  namespace Express {
    interface Request {
      householdMembership?: HouseholdMembership;
    }
  }
}

/**
 * Middleware ensuring user is a member of the requested household
 */
export function requireHouseholdAccess(allowedRoles?: Array<'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const householdId = (req.headers['x-household-id'] || req.query.household_id || req.body.household_id || req.params.householdId) as string;

      if (!householdId) {
        res.status(400).json({ success: false, error: { code: 'HOUSEHOLD_ID_REQUIRED', message: 'Household context is required' } });
        return;
      }

      const member = await QueryHelper.queryOne<HouseholdMembership>(
        `SELECT household_id, role FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
        [householdId, user.id]
      );

      if (!member) {
        res.status(403).json({
          success: false,
          error: { code: 'HOUSEHOLD_ACCESS_DENIED', message: 'You do not have access to this household' },
        });
        return;
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: `Action requires one of roles: ${allowedRoles.join(', ')}` },
        });
        return;
      }

      req.householdMembership = member;
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'RBAC_ERROR', message: error.message } });
    }
  };
}

/**
 * Helper to verify account level permission
 */
export async function checkAccountAccess(
  userId: string,
  accountId: string,
  requiredPermission: 'READ' | 'WRITE' | 'ADMIN' = 'READ'
): Promise<boolean> {
  const account = await QueryHelper.queryOne(
    `SELECT a.id, a.household_id, a.owner_user_id, a.is_shared, hm.role as user_household_role
     FROM accounts a
     LEFT JOIN household_members hm ON hm.household_id = a.household_id AND hm.user_id = $1 AND hm.status = 'ACTIVE'
     WHERE a.id = $2`,
    [userId, accountId]
  );

  if (!account) return false;

  // 1. Account owner always has full access
  if (account.owner_user_id === userId) return true;

  // 2. Household Owner or Admin has full access
  if (account.user_household_role === 'OWNER' || account.user_household_role === 'ADMIN') return true;

  // 3. Shared accounts are readable and writable by any active household member
  if (account.is_shared && account.user_household_role) {
    if (requiredPermission === 'ADMIN') {
      return account.user_household_role === 'OWNER' || account.user_household_role === 'ADMIN';
    }
    return true;
  }

  // 4. Check explicit account_access grant
  const grant = await QueryHelper.queryOne(
    `SELECT permission FROM account_access WHERE account_id = $1 AND user_id = $2`,
    [accountId, userId]
  );

  if (!grant) return false;
  if (requiredPermission === 'READ') return true;
  if (requiredPermission === 'WRITE') return grant.permission === 'WRITE' || grant.permission === 'ADMIN';
  if (requiredPermission === 'ADMIN') return grant.permission === 'ADMIN';

  return false;
}
