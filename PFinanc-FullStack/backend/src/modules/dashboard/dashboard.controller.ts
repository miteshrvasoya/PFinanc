import { getHouseholdId } from '../../utils/request.js';
import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { isPrivilegedRole } from '../../middleware/rbac.js';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const view = (req.query.view === 'personal' ? 'personal' : 'household') as 'household' | 'personal';
      const data = await DashboardService.getDashboardData(
        householdId,
        req.user!.id,
        view,
        !isPrivilegedRole(req.householdMembership?.role)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
