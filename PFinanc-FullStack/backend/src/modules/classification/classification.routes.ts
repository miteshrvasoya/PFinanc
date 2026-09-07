import { Router } from 'express';
import { z } from 'zod';
import { ClassificationController } from './classification.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const classifySchema = z.object({
  description: z.string().min(1),
  amount: z.number().optional(),
  date: z.string().optional(),
});

const saveRuleSchema = z.object({
  pattern: z.string().min(1),
  match_type: z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH', 'REGEX']).optional(),
  category_id: z.string().uuid(),
  transaction_type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'OTHER']).optional(),
});

router.use(authenticate);
router.use(requireHouseholdAccess());

router.post('/classify', validate({ body: classifySchema }), ClassificationController.classify);
router.get('/rules', ClassificationController.listRules);
router.post('/rules', validate({ body: saveRuleSchema }), ClassificationController.saveRule);
router.delete('/rules/:id', ClassificationController.deleteRule);

export const classificationRoutes = router;
