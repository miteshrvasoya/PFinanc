import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  static async getTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = (req.headers['x-household-id'] || req.query.household_id) as string;
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const data = await AnalyticsService.getMonthlyTrends(householdId, months);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = (req.headers['x-household-id'] || req.query.household_id) as string;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;
      const type = (req.query.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'EXPENSE' | 'INCOME';

      const data = await AnalyticsService.getCategoryAnalytics(householdId, startDate, endDate, type);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getFamily(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = (req.headers['x-household-id'] || req.query.household_id) as string;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      const data = await AnalyticsService.getFamilyBreakdown(householdId, startDate, endDate);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
