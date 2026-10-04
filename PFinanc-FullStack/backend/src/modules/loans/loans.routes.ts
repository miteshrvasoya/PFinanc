import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { LoansController } from './loans.controller.js';

export const loansRouter = Router();

loansRouter.use(authenticate, requireHouseholdAccess());

loansRouter.get('/', LoansController.list);
loansRouter.post('/', LoansController.create);
loansRouter.get('/:id', LoansController.getById);
loansRouter.patch('/:id', LoansController.update);
