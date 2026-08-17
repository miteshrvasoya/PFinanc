import { Router } from 'express';
import { z } from 'zod';
import { TransfersController } from './transfers.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const createTransferSchema = z.object({
  source_account_id: z.string().uuid(),
  destination_account_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  transfer_date: z.string().optional(),
  description: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('CONFIRMED'),
});

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/', TransfersController.list);
router.post('/', validate({ body: createTransferSchema }), TransfersController.create);
router.get('/:id', TransfersController.getById);
router.post('/:id/void', TransfersController.void);

export const transferRoutes = router;
