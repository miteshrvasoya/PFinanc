import { Request, Response, NextFunction } from 'express';
import { TransfersService } from './transfers.service.js';
import { checkAccountAccess } from '../../middleware/rbac.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class TransfersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const transfers = await TransfersService.listTransfers(householdId);
      res.json({ success: true, data: transfers });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const transfer = await TransfersService.getTransferById(id, householdId);
      if (!transfer) {
        res.status(404).json({ success: false, error: { code: 'TRANSFER_NOT_FOUND', message: 'Transfer not found' } });
        return;
      }
      res.json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);

      const hasSourceAccess = await checkAccountAccess(req.user!.id, req.body.source_account_id, 'WRITE');
      if (!hasSourceAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'ACCOUNT_ACCESS_DENIED', message: 'You do not have permission to transfer funds from the source account' },
        });
        return;
      }

      const transfer = await TransfersService.createTransfer(req.user!.id, {
        householdId,
        sourceAccountId: req.body.source_account_id,
        destinationAccountId: req.body.destination_account_id,
        amount: req.body.amount,
        currency: req.body.currency,
        transferDate: req.body.transfer_date,
        description: req.body.description,
        reference: req.body.reference,
        status: req.body.status,
      });

      res.status(201).json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }

  static async void(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const householdId = getHouseholdId(req);
      const transfer = await TransfersService.voidTransfer(id, householdId, req.user!.id);
      res.json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }
}
