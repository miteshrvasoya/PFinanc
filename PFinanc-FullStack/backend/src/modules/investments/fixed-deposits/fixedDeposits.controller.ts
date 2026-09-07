import { Request, Response, NextFunction } from 'express';
import { FixedDepositsService } from './fixedDeposits.service.js';
import { getHouseholdId, getParam } from '../../../utils/request.js';

export class FixedDepositsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.query.user_id as string;
      const fds = await FixedDepositsService.list(householdId, userId);
      res.json({ success: true, data: fds });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const fd = await FixedDepositsService.create(req.user!.id, {
        ...req.body,
        household_id: householdId,
      });
      res.status(201).json({ success: true, data: fd });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const fd = await FixedDepositsService.update(id, householdId, req.user!.id, req.body);
      res.json({ success: true, data: fd });
    } catch (error) {
      next(error);
    }
  }
}
