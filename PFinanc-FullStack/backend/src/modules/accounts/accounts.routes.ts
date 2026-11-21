import { Router } from 'express';
import { z } from 'zod';
import { AccountsController } from './accounts.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const accountFields = {
  name: z.string().min(2),
  account_type: z.enum(['BANK', 'CASH', 'WALLET', 'CREDIT_CARD', 'BROKERAGE', 'MUTUAL_FUND', 'FD', 'EPF', 'PPF', 'NPS', 'OTHER']),
  institution_name: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  currency: z.string().length(3),
  opening_balance: z.number(),
  opening_balance_date: z.string().optional(),
  owner_user_id: z.string().uuid().optional(),
  is_shared: z.boolean(),
  notes: z.string().optional().nullable(),
  include_in_net_worth: z.boolean(),
};

const createAccountSchema = z.object({
  ...accountFields,
  currency: accountFields.currency.default('INR'),
  opening_balance: accountFields.opening_balance.default(0),
  is_shared: accountFields.is_shared.default(false),
  include_in_net_worth: accountFields.include_in_net_worth.default(true),
});

// No defaults here: with zod 4, .partial() keeps .default() values, so deriving this from
// createAccountSchema reset opening_balance/currency/is_shared on every edit.
const updateAccountSchema = z.object(accountFields).partial();

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/', AccountsController.listAccounts);
router.post('/', validate({ body: createAccountSchema }), AccountsController.createAccount);
router.get('/:id', AccountsController.getAccount);
router.patch('/:id', validate({ body: updateAccountSchema }), AccountsController.updateAccount);
router.post('/:id/toggle-archive', AccountsController.toggleArchive);

export const accountRoutes = router;
