import { Request, Response, NextFunction } from 'express';
import { RetirementService } from './retirement.service.js';
import { getHouseholdId, getParam } from '../../../utils/request.js';

export class RetirementController {
  static async listAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.query.user_id as string;
      const accounts = await RetirementService.listAccounts(householdId, userId);
      res.json({ success: true, data: accounts });
    } catch (error) {
      next(error);
    }
  }

  static async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const acc = await RetirementService.createAccount(req.user!.id, {
        ...req.body,
        household_id: householdId,
      });
      res.status(201).json({ success: true, data: acc });
    } catch (error) {
      next(error);
    }
  }

  static async getContributions(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const contributions = await RetirementService.getContributions(id, householdId);
      res.json({ success: true, data: contributions });
    } catch (error) {
      next(error);
    }
  }

  static async addContribution(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const contrib = await RetirementService.addContribution(req.user!.id, householdId, req.body);
      res.status(201).json({ success: true, data: contrib });
    } catch (error) {
      next(error);
    }
  }
}
