import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = (req.headers['x-household-id'] || req.query.household_id) as string;
      const view = (req.query.view === 'personal' ? 'personal' : 'household') as 'household' | 'personal';
      const data = await DashboardService.getDashboardData(householdId, req.user!.id, view);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
