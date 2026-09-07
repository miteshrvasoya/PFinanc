import { Request, Response, NextFunction } from 'express';
import { InvestmentImportsService } from './investmentImports.service.js';
import { checkAccountAccess } from '../../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../../utils/request.js';

export class InvestmentImportsController {
  
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const { investment_account_id, investment_type, import_mode, filename, csv_content } = req.body;

      if (!investment_account_id || !investment_type || !import_mode || !csv_content) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Missing required fields' },
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

      const result = await InvestmentImportsService.createImport(
        householdId,
        req.user!.id,
        investment_account_id,
        investment_type,
        import_mode,
        filename || 'statement.csv',
        csv_content
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async parse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const { mapping } = req.body;

      if (!mapping) {
        res.status(400).json({ success: false, error: { message: 'Column mapping is required' }});
        return;
      }

      const result = await InvestmentImportsService.parseAndValidate(id, householdId, mapping);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);

      const result = await InvestmentImportsService.getPreview(id, householdId);
      res.json({ success: true, data: result });
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
