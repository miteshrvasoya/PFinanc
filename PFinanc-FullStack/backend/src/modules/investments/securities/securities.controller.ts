import { Request, Response, NextFunction } from 'express';
import { SecuritiesService } from './securities.service.js';
import { getParam } from '../../../utils/request.js';

export class SecuritiesController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q || '') as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const results = await SecuritiesService.search(q, limit);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SecuritiesService.list({
        securityType: req.query.type as string,
        assetClass: req.query.asset_class as string,
        isActive: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const security = await SecuritiesService.getById(id);
      if (!security) {
        res.status(404).json({ success: false, error: { code: 'SECURITY_NOT_FOUND', message: 'Security not found' } });
        return;
      }
      res.json({ success: true, data: security });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const security = await SecuritiesService.findOrCreate(req.body, req.user?.id);
      res.status(201).json({ success: true, data: security });
    } catch (error) {
      next(error);
    }
  }
}
