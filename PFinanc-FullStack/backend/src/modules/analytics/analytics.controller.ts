import { getHouseholdId } from '../../utils/request.js';
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { FinancialInsightsService } from './financialInsights.service.js';
import { isPrivilegedRole } from '../../middleware/rbac.js';

const restrictFor = (req: Request) => (isPrivilegedRole(req.householdMembership?.role) ? undefined : req.user!.id);

export class AnalyticsController {
  static async getTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const parsed = parseInt(req.query.months as string, 10);
      const months = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 120) : 6;
      const data = await AnalyticsService.getMonthlyTrends(householdId, months, restrictFor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;
      const type = (req.query.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'EXPENSE' | 'INCOME';

      const data = await AnalyticsService.getCategoryAnalytics(householdId, startDate, endDate, type, restrictFor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getFamily(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      const data = await AnalyticsService.getFamilyBreakdown(householdId, startDate, endDate, restrictFor(req));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const ymd = /^\d{4}-\d{2}-\d{2}$/;
      const startDate = typeof req.query.start_date === 'string' && ymd.test(req.query.start_date) ? req.query.start_date : undefined;
      const endDate = typeof req.query.end_date === 'string' && ymd.test(req.query.end_date) ? req.query.end_date : undefined;
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({ success: false, error: { code: 'INVALID_RANGE', message: 'start_date must be on or before end_date' } });
        return;
      }
      const data = await FinancialInsightsService.getOverview({
        householdId: getHouseholdId(req),
        userId: req.user!.id,
        role: req.householdMembership?.role,
        scope: req.query.scope === 'personal' ? 'personal' : 'household',
        startDate,
        endDate,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
