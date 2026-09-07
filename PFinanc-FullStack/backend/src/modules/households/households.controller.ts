import { Request, Response, NextFunction } from 'express';
import { HouseholdsService } from './households.service.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class HouseholdsController {
  static async getHousehold(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getParam(req, 'householdId') || getHouseholdId(req);
      const result = await HouseholdsService.getHousehold(householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateHousehold(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getParam(req, 'householdId') || getHouseholdId(req);
      const result = await HouseholdsService.updateHousehold(householdId, req.user!.id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getParam(req, 'householdId') || getHouseholdId(req);
      const result = await HouseholdsService.addMember(householdId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getParam(req, 'householdId') || getHouseholdId(req);
      const memberId = getParam(req, 'memberId');
      const result = await HouseholdsService.updateMemberRole(householdId, req.user!.id, memberId, req.body.role);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
