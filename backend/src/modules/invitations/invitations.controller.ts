import { Request, Response, NextFunction } from 'express';
import { InvitationsService } from './invitations.service.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class InvitationsController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await InvitationsService.createInvitation(
        householdId,
        req.user!.id,
        req.body
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const result = await InvitationsService.listInvitations(householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = getParam(req, 'token');
      const result = await InvitationsService.getInvitationByToken(token);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const token = getParam(req, 'token');
      const result = await InvitationsService.acceptInvitation(token, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const id = getParam(req, 'id');
      await InvitationsService.revokeInvitation(householdId, id, req.user!.id);
      res.json({ success: true, message: 'Invitation revoked' });
    } catch (error) {
      next(error);
    }
  }
}
