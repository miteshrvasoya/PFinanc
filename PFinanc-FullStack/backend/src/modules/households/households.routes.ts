import { Router } from 'express';
import { z } from 'zod';
import { HouseholdsController } from './households.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const updateHouseholdSchema = z.object({
  name: z.string().min(2).optional(),
  default_currency: z.string().length(3).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

router.use(authenticate);

router.get('/:householdId', requireHouseholdAccess(), HouseholdsController.getHousehold);
router.patch('/:householdId', requireHouseholdAccess(['OWNER', 'ADMIN']), validate({ body: updateHouseholdSchema }), HouseholdsController.updateHousehold);
router.post('/:householdId/members', requireHouseholdAccess(['OWNER', 'ADMIN']), validate({ body: addMemberSchema }), HouseholdsController.addMember);
router.patch('/:householdId/members/:memberId', requireHouseholdAccess(['OWNER']), validate({ body: updateRoleSchema }), HouseholdsController.updateMemberRole);

export const householdRoutes = router;
