import { Request, Response, NextFunction } from 'express';
import { TransactionsService } from './transactions.service.js';
import { checkAccountAccess } from '../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

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
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const tx = await TransactionsService.getTransactionById(id, householdId);
      if (!tx) {
        res.status(404).json({ success: false, error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' } });
        return;
      }
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);

      const hasAccess = await checkAccountAccess(req.user!.id, req.body.account_id, 'WRITE');
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have write access to this account' } });
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
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const tx = await TransactionsService.updateTransaction(id, householdId, req.user!.id, req.body);
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const tx = await TransactionsService.setStatus(id, householdId, req.user!.id, 'CONFIRMED');
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const tx = await TransactionsService.setStatus(id, householdId, req.user!.id, 'REJECTED');
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static async void(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const tx = await TransactionsService.setStatus(id, householdId, req.user!.id, 'VOID');
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }
}
