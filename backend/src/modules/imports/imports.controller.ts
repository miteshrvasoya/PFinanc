import { Request, Response, NextFunction } from 'express';
import { ImportsService } from './imports.service.js';
import { checkAccountAccess } from '../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class ImportsController {
  static async uploadAndPreview(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const accountId = req.body.account_id;

      if (!req.file) {
        res.status(400).json({ success: false, error: { code: 'FILE_REQUIRED', message: 'CSV file is required' } });
        return;
      }

      if (!accountId) {
        res.status(400).json({ success: false, error: { code: 'ACCOUNT_ID_REQUIRED', message: 'Target Account ID is required' } });
        return;
      }

      const hasAccess = await checkAccountAccess(req.user!.id, accountId, 'WRITE');
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have write access to this account' } });
        return;
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const filename = req.file.originalname;

      let customMapping;
      if (req.body.column_mapping) {
        customMapping = typeof req.body.column_mapping === 'string' ? JSON.parse(req.body.column_mapping) : req.body.column_mapping;
      }

      const result = await ImportsService.uploadAndPreview(householdId, accountId, req.user!.id, filename, csvContent, customMapping);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async commit(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = getParam(req, 'batchId');
      const householdId = getHouseholdId(req);
      const includeDuplicates = Boolean(req.body.include_duplicates);

      const result = await ImportsService.commitBatch(batchId, householdId, req.user!.id, includeDuplicates);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
