import { Request, Response, NextFunction } from 'express';
import { RentService } from './rent.service.js';
import { getHouseholdId } from '../../utils/request.js';

export class RentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const agreements = await RentService.getAgreements(householdId);
      res.json({ success: true, data: agreements });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const rent = await RentService.createAgreement(householdId, userId, req.body);
      res.json({ success: true, data: rent });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const rent = await RentService.updateAgreement(req.params.id as string, householdId, userId, req.body);
      res.json({ success: true, data: rent });
    } catch (error) {
      next(error);
    }
  }
}
