import { Request, Response, NextFunction } from 'express';
import { SplitsService } from './splits.service.js';
import { getHouseholdId } from '../../utils/request.js';

export class SplitsController {
  static async getSplits(req: Request, res: Response, next: NextFunction) {
    try {
      const splits = await SplitsService.getSplitsForTransaction(req.params.transactionId as string);
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
      const createdSplits = await SplitsService.splitTransaction(householdId, userId, req.params.transactionId as string, splits);
      res.json({ success: true, data: createdSplits });
    } catch (error) {
      next(error);
    }
  }
}
