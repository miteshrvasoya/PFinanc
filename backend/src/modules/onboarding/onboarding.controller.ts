import { Request, Response, NextFunction } from 'express';
import { OnboardingService } from './onboarding.service.js';
import { getHouseholdId } from '../../utils/request.js';

export class OnboardingController {
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await OnboardingService.getStatus(req.user!.id, householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateStep(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const { step, completed_section, metadata } = req.body;
      const result = await OnboardingService.updateStep(
        req.user!.id,
        householdId,
        step,
        completed_section,
        metadata
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await OnboardingService.completeOnboarding(req.user!.id, householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async skip(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await OnboardingService.skipOnboarding(req.user!.id, householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async reset(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await OnboardingService.resetOnboarding(req.user!.id, householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
