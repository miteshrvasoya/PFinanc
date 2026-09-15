import { Router } from 'express';
import { AutomationController } from './automation.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';

export const automationRouter = Router();

automationRouter.use(authenticate);
automationRouter.use(requireHouseholdAccess());

automationRouter.post('/candidates/sync', AutomationController.syncCandidates);
automationRouter.get('/candidates', AutomationController.getCandidates);
automationRouter.post('/candidates/:id/approve', AutomationController.approveCandidate);
automationRouter.post('/candidates/:id/reject', AutomationController.rejectCandidate);
