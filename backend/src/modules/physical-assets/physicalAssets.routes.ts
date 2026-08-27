import { Router } from 'express';
import { z } from 'zod';
import { PhysicalAssetsController } from './physicalAssets.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const assetSchema = z.object({
  asset_name: z.string().min(1),
  asset_type: z.enum(['PHYSICAL_GOLD', 'DIGITAL_GOLD', 'SGB', 'VEHICLE', 'PROPERTY', 'OTHER_ASSET']),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  purchase_cost: z.number().nonnegative(),
  current_value: z.number().nonnegative().optional(),
  as_of_date: z.string().optional(),
  owner_user_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/', PhysicalAssetsController.list);
router.get('/:id', PhysicalAssetsController.getById);
router.post('/', validate({ body: assetSchema }), PhysicalAssetsController.create);
router.patch('/:id', validate({ body: assetSchema.partial() }), PhysicalAssetsController.update);
router.delete('/:id', PhysicalAssetsController.delete);

export const physicalAssetsRoutes = router;
