import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/trends', AnalyticsController.getTrends);
router.get('/categories', AnalyticsController.getCategories);
router.get('/family', AnalyticsController.getFamily);

export const analyticsRoutes = router;
