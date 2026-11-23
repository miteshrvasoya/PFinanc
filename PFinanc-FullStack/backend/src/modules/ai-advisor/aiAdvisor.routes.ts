import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { AIAdvisorController } from './aiAdvisor.controller.js';

export const aiAdvisorRouter = Router();

// All routes require auth + household membership
aiAdvisorRouter.use(authenticate, requireHouseholdAccess());

// Config
aiAdvisorRouter.get('/config', AIAdvisorController.getConfig);
aiAdvisorRouter.put('/config', AIAdvisorController.updateConfig);

// Analysis runs
aiAdvisorRouter.post('/run', AIAdvisorController.triggerRun);
aiAdvisorRouter.get('/runs', AIAdvisorController.getRuns);

// Reports
aiAdvisorRouter.get('/reports/latest', AIAdvisorController.getLatestReport);
aiAdvisorRouter.get('/reports', AIAdvisorController.getReports);
aiAdvisorRouter.get('/reports/:id', AIAdvisorController.getReport);

// Notifications
aiAdvisorRouter.get('/notifications', AIAdvisorController.getNotifications);
aiAdvisorRouter.post('/notifications/read-all', AIAdvisorController.markAllRead);

// Chat sessions
aiAdvisorRouter.get('/chat/sessions', AIAdvisorController.listChatSessions);
aiAdvisorRouter.post('/chat/sessions', AIAdvisorController.createChatSession);
aiAdvisorRouter.post('/chat/message', AIAdvisorController.sendChatMessageAuto);
aiAdvisorRouter.get('/chat/sessions/:id', AIAdvisorController.getChatSession);
aiAdvisorRouter.patch('/chat/sessions/:id', AIAdvisorController.renameChatSession);
aiAdvisorRouter.post('/chat/sessions/:id/regenerate', AIAdvisorController.regenerateChatMessage);
aiAdvisorRouter.delete('/chat/sessions/:id', AIAdvisorController.deleteChatSession);
aiAdvisorRouter.post('/chat/sessions/:id/messages', AIAdvisorController.sendChatMessage);

// Meta
aiAdvisorRouter.get('/models', AIAdvisorController.getModels);
