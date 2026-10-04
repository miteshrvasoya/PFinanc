import { Request, Response, NextFunction } from 'express';
import { BudgetsService } from './budgets.service.js';
import { getHouseholdId } from '../../utils/request.js';

export class BudgetsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const budgets = await BudgetsService.getBudgets(householdId);
      res.json({ success: true, data: budgets });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const budget = await BudgetsService.createBudget(householdId, userId, req.body);
      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const budget = await BudgetsService.updateBudget(req.params.id, householdId, userId, req.body);
      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      await BudgetsService.deleteBudget(req.params.id, householdId, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
