import { Router } from 'express';
import { z } from 'zod';
import { TransactionsController } from './transactions.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const createTransactionSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  related_transaction_id: z.string().uuid().optional().nullable(),
  transaction_type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'FEE', 'OTHER']),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  transaction_date: z.string().optional(),
  description: z.string().min(1),
  merchant_name: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('CONFIRMED'),
  source_type: z.enum(['MANUAL', 'CSV_IMPORT', 'SYSTEM']).default('MANUAL'),
  source_reference: z.string().optional().nullable(),
  external_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateTransactionSchema = z.object({
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1).optional(),
  merchant_name: z.string().optional().nullable(),
  transaction_date: z.string().optional(),
  notes: z.string().optional().nullable(),
});

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/', TransactionsController.list);
router.post('/', validate({ body: createTransactionSchema }), TransactionsController.create);
router.get('/:id', TransactionsController.getById);
router.patch('/:id', validate({ body: updateTransactionSchema }), TransactionsController.update);
router.post('/:id/confirm', TransactionsController.confirm);
router.post('/:id/reject', TransactionsController.reject);
router.post('/:id/void', TransactionsController.void);

export const transactionRoutes = router;
