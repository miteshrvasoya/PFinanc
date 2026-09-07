import { Router } from 'express';
import { z } from 'zod';
import { OnboardingController } from './onboarding.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const updateStepSchema = z.object({
  step: z.string().min(1),
  completed_section: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/status', OnboardingController.getStatus);
router.post('/step', validate({ body: updateStepSchema }), OnboardingController.updateStep);
router.post('/complete', OnboardingController.complete);
router.post('/skip', OnboardingController.skip);
router.post('/reset', OnboardingController.reset);

export const onboardingRoutes = router;
