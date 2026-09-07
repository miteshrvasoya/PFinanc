import { Request, Response, NextFunction } from 'express';
import { PhysicalAssetsService } from './physicalAssets.service.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class PhysicalAssetsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const { user_id } = req.query;
      const result = await PhysicalAssetsService.listAssets(
        householdId,
        user_id ? String(user_id) : undefined
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const id = getParam(req, 'id');
      const result = await PhysicalAssetsService.getAssetById(id, householdId);
      if (!result) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await PhysicalAssetsService.createAsset(
        householdId,
        req.user!.id,
        req.body
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const id = getParam(req, 'id');
      const result = await PhysicalAssetsService.updateAsset(
        id,
        householdId,
        req.user!.id,
        req.body
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const id = getParam(req, 'id');
      await PhysicalAssetsService.deleteAsset(id, householdId, req.user!.id);
      res.json({ success: true, message: 'Asset deleted' });
    } catch (error) {
      next(error);
    }
  }
}
