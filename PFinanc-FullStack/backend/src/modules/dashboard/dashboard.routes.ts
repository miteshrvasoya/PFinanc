import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.use(requireHouseholdAccess());

router.get('/', DashboardController.getSummary);

export const dashboardRoutes = router;
