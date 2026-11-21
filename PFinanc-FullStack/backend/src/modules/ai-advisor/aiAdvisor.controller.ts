import { getHouseholdId } from '../../utils/request.js';
import { Request, Response } from 'express';
import { AIAdvisorService } from './aiAdvisor.service.js';
import { AIAdvisorScheduler } from './aiAdvisor.scheduler.js';
import { AVAILABLE_MODELS, AIProviderType } from './providers/aiProviderFactory.js';

export class AIAdvisorController {
  // GET /api/ai-advisor/config
  static async getConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = getHouseholdId(req);

      let cfg = await AIAdvisorService.getConfig(userId, householdId);
      if (!cfg) {
        cfg = await AIAdvisorService.upsertConfig(userId, householdId, {});
      }
      // Never send the stored API key back to the browser.
      return res.json({ success: true, data: AIAdvisorService.maskConfig(cfg) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_CONFIG_ERROR', message: err.message } });
    }
  }

  // PUT /api/ai-advisor/config
  static async updateConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = getHouseholdId(req);
      const {
        aiProvider, modelName, apiKeyOverride,
        scheduleCron, isEnabled,
        monthlySipBudgetInr, monthlyStockBudgetInr,
      } = req.body;

      const cfg = await AIAdvisorService.upsertConfig(userId, householdId, {
        aiProvider,
        modelName,
        // Masked/omitted key = keep the stored one; empty string = clear it.
        apiKeyOverride:
          apiKeyOverride === undefined || (typeof apiKeyOverride === 'string' && apiKeyOverride.startsWith(AIAdvisorService.KEY_MASK))
            ? undefined
            : apiKeyOverride || null,
        scheduleCron,
        isEnabled,
        monthlySipBudgetInr: monthlySipBudgetInr ? parseFloat(monthlySipBudgetInr) : undefined,
        monthlyStockBudgetInr: monthlyStockBudgetInr ? parseFloat(monthlyStockBudgetInr) : undefined,
      });

      return res.json({ success: true, data: AIAdvisorService.maskConfig(cfg) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_CONFIG_UPDATE_ERROR', message: err.message } });
    }
  }

  // POST /api/ai-advisor/run
  static async triggerRun(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = getHouseholdId(req);

      // Check for an already-running analysis; runs stuck for >30 min (e.g. server restart) are failed.
      const { QueryHelper } = await import('../../database/queryHelper.js');
      await QueryHelper.query(
        `UPDATE ai_advisor_runs SET status = 'FAILED', completed_at = NOW(), error_message = 'Timed out'
         WHERE user_id = $1 AND status = 'RUNNING' AND started_at < NOW() - INTERVAL '30 minutes'`,
        [userId]
      );
      const running = await QueryHelper.queryOne(
        `SELECT id FROM ai_advisor_runs WHERE user_id = $1 AND household_id = $2 AND status = 'RUNNING'`,
        [userId, householdId]
      );
      if (running) {
        return res.status(409).json({
          success: false,
          error: { code: 'ANALYSIS_ALREADY_RUNNING', message: 'An analysis is already in progress.' },
        });
      }

      // Create the run record once, return its id, and let the analysis continue in the background.
      const runId = await AIAdvisorService.createRun(userId, householdId, 'MANUAL');
      AIAdvisorService.runAnalysis(userId, householdId, 'MANUAL', runId)
        .catch(err => console.error('[AIAdvisorController] Async run error:', err));

      return res.json({ success: true, data: { runId, status: 'RUNNING' } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_RUN_ERROR', message: err.message } });
    }
  }

  // GET /api/ai-advisor/reports
  static async getReports(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = getHouseholdId(req);
      const limit = parseInt(req.query.limit as string) || 20;

      const reports = await AIAdvisorService.getReports(userId, householdId, limit);
      return res.json({ success: true, data: reports });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_REPORTS_ERROR', message: err.message } });
    }
  }

  // GET /api/ai-advisor/reports/latest
  static async getLatestReport(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = getHouseholdId(req);

      const report = await AIAdvisorService.getLatestReport(userId, householdId);
      if (!report) {
        return res.json({ success: true, data: null });
      }
      return res.json({ success: true, data: report });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_REPORT_ERROR', message: err.message } });
    }
  }

  // GET /api/ai-advisor/reports/:id
  static async getReport(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const report = await AIAdvisorService.getReportById(id as string, userId);
      if (!report) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
      }

      // Mark as read
      await AIAdvisorService.markReportRead(id as string, userId);

      return res.json({ success: true, data: report });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_REPORT_ERROR', message: err.message } });
    }
  }

  // GET /api/ai-advisor/runs
  static async getRuns(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = getHouseholdId(req);
      const limit = parseInt(req.query.limit as string) || 20;

      const runs = await AIAdvisorService.getRuns(userId, householdId, limit);
      return res.json({ success: true, data: runs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_RUNS_ERROR', message: err.message } });
    }
  }

  // GET /api/ai-advisor/notifications
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const notifications = await AIAdvisorService.getUnreadNotifications(userId);
      return res.json({ success: true, data: notifications });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_NOTIF_ERROR', message: err.message } });
    }
  }

  // POST /api/ai-advisor/notifications/read-all
  static async markAllRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await AIAdvisorService.markAllNotificationsRead(userId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_NOTIF_ERROR', message: err.message } });
    }
  }

  // GET /api/ai-advisor/models
  static async getModels(req: Request, res: Response) {
    return res.json({ success: true, data: AVAILABLE_MODELS });
  }
}
