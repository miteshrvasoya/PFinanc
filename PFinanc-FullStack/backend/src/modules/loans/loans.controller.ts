import { Request, Response, NextFunction } from 'express';
import { LoansService } from './loans.service.js';
import { getHouseholdId } from '../../utils/request.js';

export class LoansController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const type = req.query.type as string;
      const loans = await LoansService.getLoans(householdId, type);
      res.json({ success: true, data: loans });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const loan = await LoansService.getLoanById(req.params.id as string, householdId);
      if (!loan) {
        return res.status(404).json({ success: false, error: { message: 'Loan not found' } });
      }
      res.json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const loan = await LoansService.createLoan(householdId, userId, req.body);
      res.json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const loan = await LoansService.updateLoan(req.params.id as string, householdId, userId, req.body);
      res.json({ success: true, data: loan });
    } catch (error) {
      next(error);
    }
  }
}
