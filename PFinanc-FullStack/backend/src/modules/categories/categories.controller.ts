import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class CategoriesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const categories = await CategoriesService.listCategories(householdId);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const category = await CategoriesService.createCategory(householdId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const category = await CategoriesService.updateCategory(id, householdId, req.user!.id, req.body);
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }
}
