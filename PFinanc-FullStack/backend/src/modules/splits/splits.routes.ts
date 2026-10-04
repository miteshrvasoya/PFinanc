import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { SplitsController } from './splits.controller.js';

export const splitsRouter = Router();

splitsRouter.use(authenticate, requireHouseholdAccess());

splitsRouter.get('/:transactionId', SplitsController.getSplits);
splitsRouter.post('/:transactionId', SplitsController.splitTransaction);
