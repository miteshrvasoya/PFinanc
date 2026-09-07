import { Request, Response, NextFunction } from 'express';
import { ClassificationService } from './classification.service.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class ClassificationController {
  static async classify(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const { description, amount, date } = req.body;
      const result = await ClassificationService.classify(
        householdId,
        description,
        amount ? parseFloat(amount) : undefined,
        date
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async listRules(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await ClassificationService.listRules(householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async saveRule(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await ClassificationService.saveRule(
        householdId,
        req.user!.id,
        req.body
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRule(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const id = getParam(req, 'id');
      await ClassificationService.deleteRule(householdId, id);
      res.json({ success: true, message: 'Rule deleted' });
    } catch (error) {
      next(error);
    }
  }
}
