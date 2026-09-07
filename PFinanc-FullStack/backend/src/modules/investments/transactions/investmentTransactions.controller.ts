import { Request, Response, NextFunction } from 'express';
import { InvestmentTransactionsService } from './investmentTransactions.service.js';
import { checkAccountAccess } from '../../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../../utils/request.js';

export class InvestmentTransactionsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await InvestmentTransactionsService.list({
        householdId,
        accountId: req.query.account_id as string,
        securityId: req.query.security_id as string,
        transactionType: req.query.type as string,
        status: req.query.status as string,
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
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
      const tx = await InvestmentTransactionsService.getById(id, householdId);
      if (!tx) {
        res.status(404).json({ success: false, error: { code: 'TRANSACTION_NOT_FOUND', message: 'Investment transaction not found' } });
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

      const hasAccess = await checkAccountAccess(req.user!.id, req.body.investment_account_id, 'WRITE');
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have write access to this investment account' },
        });
        return;
      }

      if (req.body.funding_account_id) {
        const hasFundingAccess = await checkAccountAccess(req.user!.id, req.body.funding_account_id, 'WRITE');
        if (!hasFundingAccess) {
          res.status(403).json({
            success: false,
            error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have write access to the selected funding bank account' },
          });
          return;
        }
      }

      const tx = await InvestmentTransactionsService.create(req.user!.id, {
        ...req.body,
        household_id: householdId,
      });

      res.status(201).json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }

  static async void(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const tx = await InvestmentTransactionsService.voidTransaction(id, householdId, req.user!.id);
      res.json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }
}
