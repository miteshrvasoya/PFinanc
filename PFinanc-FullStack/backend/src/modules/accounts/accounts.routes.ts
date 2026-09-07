import { Router } from 'express';
import { z } from 'zod';
import { AccountsController } from './accounts.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const createAccountSchema = z.object({
  name: z.string().min(2),
  account_type: z.enum(['BANK', 'CASH', 'WALLET', 'CREDIT_CARD', 'BROKERAGE', 'MUTUAL_FUND', 'FD', 'EPF', 'PPF', 'NPS', 'OTHER']),
  institution_name: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  currency: z.string().length(3).default('INR'),
  opening_balance: z.number().default(0),
  opening_balance_date: z.string().optional(),
  owner_user_id: z.string().uuid().optional(),
  is_shared: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

const updateAccountSchema = createAccountSchema.partial();

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/', AccountsController.listAccounts);
router.post('/', validate({ body: createAccountSchema }), AccountsController.createAccount);
router.get('/:id', AccountsController.getAccount);
router.patch('/:id', validate({ body: updateAccountSchema }), AccountsController.updateAccount);
router.post('/:id/toggle-archive', AccountsController.toggleArchive);

export const accountRoutes = router;
