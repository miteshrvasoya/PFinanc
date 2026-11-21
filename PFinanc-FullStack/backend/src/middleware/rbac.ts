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
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isPrivilegedRole(role?: string): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * VIEWERs are read-only (docs/permissions.md). Pass { allowViewerWrites: true } only for routes that
 * mutate the viewer's *own* state (e.g. their onboarding progress), never shared household data.
 */
export function requireHouseholdAccess(
  allowedRoles?: Array<'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'>,
  options: { allowViewerWrites?: boolean } = {}
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      // An explicit :householdId route param must win over the header, otherwise a caller could pass
      // RBAC with their own household in the header while the handler acts on the param's household.
      const pick = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined;
      let householdId = (pick(req.params?.householdId) || pick(req.headers['x-household-id']) || pick(req.query?.household_id) || pick(req.body?.household_id)) as string;

      if (!householdId) {
        const defaultMembership = await QueryHelper.queryOne<HouseholdMembership>(
          `SELECT household_id, role FROM household_members WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at ASC`,
          [user.id]
        );
        if (defaultMembership) {
          householdId = defaultMembership.household_id;
        }
      }

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

      if (member.role === 'VIEWER' && !options.allowViewerWrites && !READ_ONLY_METHODS.has(req.method)) {
        res.status(403).json({
          success: false,
          error: { code: 'READ_ONLY_ROLE', message: 'Viewers have read-only access to this household' },
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

/**
 * SQL predicate: account row `alias` is visible to the user bound at `userParam` (owner, shared, or explicit grant).
 * Use for non-privileged (MEMBER / VIEWER) reads; OWNER/ADMIN see every account in the household.
 */
export function accessibleAccountSql(alias: string, userParam: string): string {
  return `(${alias}.owner_user_id = ${userParam} OR ${alias}.is_shared = true OR EXISTS (
    SELECT 1 FROM account_access aa WHERE aa.account_id = ${alias}.id AND aa.user_id = ${userParam}))`;
}

/** Throws 404 unless the account exists inside the given household (prevents cross-household writes). */
export async function assertAccountInHousehold(accountId: string | null | undefined, householdId: string, client?: any): Promise<void> {
  const ok = accountId
    ? await QueryHelper.queryOne(`SELECT 1 FROM accounts WHERE id = $1 AND household_id = $2`, [accountId, householdId], client)
    : null;
  if (!ok) {
    const error: any = new Error('Account not found in this household');
    error.status = 404;
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }
}

/** Throws 400 unless the category is a system category or belongs to the household. */
export async function assertCategoryUsable(categoryId: string | null | undefined, householdId: string, client?: any): Promise<void> {
  if (!categoryId) return;
  const ok = await QueryHelper.queryOne(
    `SELECT 1 FROM categories WHERE id = $1 AND (is_system = true OR household_id = $2)`,
    [categoryId, householdId],
    client
  );
  if (!ok) {
    const error: any = new Error('Category not found');
    error.status = 400;
    error.code = 'INVALID_CATEGORY';
    throw error;
  }
}

/** Throws 400 unless the user is an active member of the household (for owner_user_id / user_id inputs). */
export async function assertHouseholdMember(userId: string | null | undefined, householdId: string, client?: any): Promise<void> {
  if (!userId) return;
  const ok = await QueryHelper.queryOne(
    `SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
    [householdId, userId],
    client
  );
  if (!ok) {
    const error: any = new Error('User is not an active member of this household');
    error.status = 400;
    error.code = 'INVALID_OWNER';
    throw error;
  }
}
