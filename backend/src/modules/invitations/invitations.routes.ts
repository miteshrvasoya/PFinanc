import { Router } from 'express';
import { z } from 'zod';
import { InvitationsController } from './invitations.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const createInvitationSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

const acceptInvitationSchema = z.object({
  name: z.string().optional(),
  password: z.string().min(6).optional(),
  existingUserId: z.string().uuid().optional(),
});

// Public invitation inspection and acceptance routes
router.get('/public/:token', InvitationsController.getByToken);
router.post('/public/:token/accept', validate({ body: acceptInvitationSchema }), InvitationsController.accept);

// Protected household routes
router.use(authenticate);

router.get('/', requireHouseholdAccess(), InvitationsController.list);
router.post('/', requireHouseholdAccess(['OWNER', 'ADMIN']), validate({ body: createInvitationSchema }), InvitationsController.create);
router.post('/:id/revoke', requireHouseholdAccess(['OWNER', 'ADMIN']), InvitationsController.revoke);

export const invitationsRoutes = router;
