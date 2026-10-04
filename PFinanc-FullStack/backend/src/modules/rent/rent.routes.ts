import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { RentController } from './rent.controller.js';

export const rentRouter = Router();

rentRouter.use(authenticate, requireHouseholdAccess());

rentRouter.get('/', RentController.list);
rentRouter.post('/', RentController.create);
rentRouter.patch('/:id', RentController.update);
