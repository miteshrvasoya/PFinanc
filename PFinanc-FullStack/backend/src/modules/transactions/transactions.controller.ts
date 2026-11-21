import { Request, Response, NextFunction } from 'express';
import { TransactionsService } from './transactions.service.js';
import { checkAccountAccess, isPrivilegedRole } from '../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

const notFound = (res: Response) =>
  res.status(404).json({ success: false, error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' } });

const denied = (res: Response, message: string) =>
  res.status(403).json({ success: false, error: { code: 'ACCOUNT_ACCESS_DENIED', message } });

/**
 * Loads a household-scoped transaction and checks the caller's permission on its account.
 * Responds (404/403) and returns null when the caller may not proceed.
 */
async function loadAuthorized(req: Request, res: Response, permission: 'READ' | 'WRITE') {
  const id = getParam(req, 'id');
  const householdId = getHouseholdId(req);
  const tx: any = await TransactionsService.getTransactionById(id, householdId);
  if (!tx) {
    notFound(res);
    return null;
  }
  if (!(await checkAccountAccess(req.user!.id, tx.account_id, permission))) {
    // Hide existence of transactions on accounts the caller cannot read.
    if (permission === 'READ') notFound(res);
    else denied(res, 'You do not have write access to this account');
    return null;
  }
  return { id, householdId, tx };
}

export class TransactionsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await TransactionsService.listTransactions({
        householdId,
        accountId: req.query.account_id as string,
        userId: req.query.user_id as string,
        categoryId: req.query.category_id as string,
        transactionType: req.query.type as string,
        status: req.query.status as string,
        sourceType: req.query.source as string,
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        search: req.query.search as string,
        needsReview: req.query.needs_review === undefined ? undefined : req.query.needs_review === 'true',
        restrictToUserId: isPrivilegedRole(req.householdMembership?.role) ? undefined : req.user!.id,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await loadAuthorized(req, res, 'READ');
      if (!ctx) return;
      res.json({ success: true, data: ctx.tx });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);

      const hasAccess = await checkAccountAccess(req.user!.id, req.body.account_id, 'WRITE');
      if (!hasAccess) {
        denied(res, 'You do not have write access to this account');
        return;
      }

      const tx = await TransactionsService.createTransaction(householdId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = await loadAuthorized(req, res, 'WRITE');
      if (!ctx) return;
      const tx = await TransactionsService.updateTransaction(ctx.id, ctx.householdId, req.user!.id, req.body);
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  private static setStatusHandler(status: 'CONFIRMED' | 'REJECTED' | 'VOID') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ctx = await loadAuthorized(req, res, 'WRITE');
        if (!ctx) return;
        const tx = await TransactionsService.setStatus(ctx.id, ctx.householdId, req.user!.id, status);
        res.json({ success: true, data: tx });
      } catch (error) {
        next(error);
      }
    };
  }

  static confirm = TransactionsController.setStatusHandler('CONFIRMED');
  static reject = TransactionsController.setStatusHandler('REJECTED');
  static void = TransactionsController.setStatusHandler('VOID');
}
