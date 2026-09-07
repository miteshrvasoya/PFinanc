import { Router } from 'express';
import { z } from 'zod';
import { CategoriesController } from './categories.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(2),
  type: z.enum(['EXPENSE', 'INCOME', 'BOTH']),
  parent_category_id: z.string().uuid().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(['EXPENSE', 'INCOME', 'BOTH']).optional(),
  parent_category_id: z.string().uuid().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/', CategoriesController.list);
router.post('/', validate({ body: createCategorySchema }), CategoriesController.create);
router.patch('/:id', validate({ body: updateCategorySchema }), CategoriesController.update);

export const categoryRoutes = router;
