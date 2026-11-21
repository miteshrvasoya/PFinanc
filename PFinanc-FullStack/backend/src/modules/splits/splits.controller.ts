import { Request, Response, NextFunction } from 'express';
import { SplitsService } from './splits.service.js';
import { getHouseholdId } from '../../utils/request.js';
import { checkAccountAccess } from '../../middleware/rbac.js';
import { TransactionsService } from '../transactions/transactions.service.js';

export class SplitsController {
  static async getSplits(req: Request, res: Response, next: NextFunction) {
    try {
      const splits = await SplitsService.getSplitsForTransaction(getHouseholdId(req), req.params.transactionId as string);
      res.json({ success: true, data: splits });
    } catch (error) {
      next(error);
    }
  }

  static async splitTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const { splits } = req.body;
      const parent: any = await TransactionsService.getTransactionById(req.params.transactionId as string, householdId);
      if (!parent) {
        res.status(404).json({ success: false, error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' } });
        return;
      }
      if (!(await checkAccountAccess(userId, parent.account_id, 'WRITE'))) {
        res.status(403).json({ success: false, error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have write access to this account' } });
        return;
      }
      const createdSplits = await SplitsService.splitTransaction(householdId, userId, req.params.transactionId as string, splits);
      res.json({ success: true, data: createdSplits });
    } catch (error) {
      next(error);
    }
  }
}
