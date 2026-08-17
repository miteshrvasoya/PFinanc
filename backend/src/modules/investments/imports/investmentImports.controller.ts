import { Request, Response, NextFunction } from 'express';
import { InvestmentImportsService } from './investmentImports.service.js';
import { checkAccountAccess } from '../../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../../utils/request.js';

export class InvestmentImportsController {
  static async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const { investment_account_id, filename, csv_content } = req.body;

      if (!investment_account_id || !csv_content) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'investment_account_id and csv_content are required' },
        });
        return;
      }

      const hasAccess = await checkAccountAccess(req.user!.id, investment_account_id, 'WRITE');
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have write access to this investment account' },
        });
        return;
      }

      const preview = await InvestmentImportsService.preview(
        investment_account_id,
        householdId,
        req.user!.id,
        filename || 'statement.csv',
        csv_content
      );

      res.json({ success: true, data: preview });
    } catch (error) {
      next(error);
    }
  }

  static async commit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const { include_duplicates } = req.body;

      const result = await InvestmentImportsService.commit(
        id,
        householdId,
        req.user!.id,
        include_duplicates === true
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
