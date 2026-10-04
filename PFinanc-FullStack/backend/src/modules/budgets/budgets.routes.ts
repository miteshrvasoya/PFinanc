import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { BudgetsController } from './budgets.controller.js';

export const budgetsRouter = Router();

budgetsRouter.use(authenticate, requireHouseholdAccess());

budgetsRouter.get('/', BudgetsController.list);
budgetsRouter.post('/', BudgetsController.create);
budgetsRouter.patch('/:id', BudgetsController.update);
budgetsRouter.delete('/:id', BudgetsController.delete);
