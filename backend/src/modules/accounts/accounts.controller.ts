import { Request, Response, NextFunction } from 'express';
import { AccountsService } from './accounts.service.js';
import { checkAccountAccess } from '../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class AccountsController {
  static async listAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const accounts = await AccountsService.listAccounts(householdId, req.user!.id);
      res.json({ success: true, data: accounts });
    } catch (error) {
      next(error);
    }
  }

  static async getAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);

      const hasAccess = await checkAccountAccess(req.user!.id, id, 'READ');
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have access to this account' } });
        return;
      }

      const account = await AccountsService.getAccountById(id, householdId);
      if (!account) {
        res.status(404).json({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' } });
        return;
      }

      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }

  static async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const account = await AccountsService.createAccount(householdId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }

  static async updateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);

      const hasAccess = await checkAccountAccess(req.user!.id, id, 'WRITE');
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have permission to modify this account' } });
        return;
      }

      const account = await AccountsService.updateAccount(id, householdId, req.user!.id, req.body);
      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }

  static async toggleArchive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);

      const hasAccess = await checkAccountAccess(req.user!.id, id, 'ADMIN');
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'Admin permission required to archive this account' } });
        return;
      }

      const account = await AccountsService.toggleArchive(id, householdId, req.user!.id);
      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  }
}
