import { Request, Response, NextFunction } from 'express';
import { PortfolioService } from './portfolio.service.js';
import { HoldingsService } from '../holdings/holdings.service.js';
import { getHouseholdId } from '../../../utils/request.js';

export class PortfolioController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.query.view === 'personal' ? req.user!.id : undefined;
      const data = await PortfolioService.getPortfolioSummary(householdId, userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getHoldings(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.query.view === 'personal' ? req.user!.id : undefined;
      const accountId = req.query.account_id as string;
      const securityId = req.query.security_id as string;

      const holdings = await HoldingsService.calculateHoldings({
        householdId,
        userId,
        accountId,
        securityId,
      });

      res.json({ success: true, data: holdings });
    } catch (error) {
      next(error);
    }
  }

  static async getSnapshots(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const range = (req.query.range as string) || '6M';
      const snapshots = await PortfolioService.getSnapshots(householdId, range);
      res.json({ success: true, data: snapshots });
    } catch (error) {
      next(error);
    }
  }
}
