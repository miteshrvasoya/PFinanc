import { Request, Response } from 'express';
import { AIAdvisorService } from './aiAdvisor.service.js';
import { AIAdvisorScheduler } from './aiAdvisor.scheduler.js';
import { AVAILABLE_MODELS, AIProviderType } from './providers/aiProviderFactory.js';

export class AIAdvisorController {
  // GET /api/ai-advisor/config
  static async getConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = (req as any).householdId;

      let cfg = await AIAdvisorService.getConfig(userId, householdId);
      if (!cfg) {
        cfg = await AIAdvisorService.upsertConfig(userId, householdId, {});
      }
      return res.json({ success: true, data: cfg });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_CONFIG_ERROR', message: err.message } });
    }
  }

  // PUT /api/ai-advisor/config
  static async updateConfig(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = (req as any).householdId;
      const {
        aiProvider, modelName, apiKeyOverride,
        scheduleCron, isEnabled,
        monthlySipBudgetInr, monthlyStockBudgetInr,
      } = req.body;

      const cfg = await AIAdvisorService.upsertConfig(userId, householdId, {
        aiProvider,
        modelName,
        apiKeyOverride: apiKeyOverride || null,
        scheduleCron,
        isEnabled,
        monthlySipBudgetInr: monthlySipBudgetInr ? parseFloat(monthlySipBudgetInr) : undefined,
        monthlyStockBudgetInr: monthlyStockBudgetInr ? parseFloat(monthlyStockBudgetInr) : undefined,
      });

      return res.json({ success: true, data: cfg });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { code: 'AI_CONFIG_UPDATE_ERROR', message: err.message } });
    }
  }

  // POST /api/ai-advisor/run
  static async triggerRun(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const householdId = (req as any).householdId;

      // Check for an already-running analysis
      const { QueryHelper } = await import('../../database/queryHelper.js');
      const running = await QueryHelper.queryOne(
        `SELECT id FROM ai_advisor_runs WHERE user_id = $1 AND status = 'RUNNING'`,
        [userId]
      );
      if (running) {
        return res.status(409).json({
          success: false,
          error: { code: 'ANALYSIS_ALREADY_RUNNING', message: 'An analysis is already in progress.' },
        });
      }

      // Fire and return immediately with runId — analysis runs async
      const runId = await new Promise<string>(async (resolve) => {
        const { QueryHelper } = await import('../../database/queryHelper.js');
        const cfg = await AIAdvisorService.getConfig(userId, householdId)
                 || await AIAdvisorService.upsertConfig(userId, householdId, {});

        const run = await QueryHelper.queryOne<{ id: string }>(
          `INSERT INTO ai_advisor_runs (user_id, household_id, triggered_by, status, ai_provider, model_name)
           VALUES ($1, $2, 'MANUAL', 'RUNNING', $3, $4) RETURNING id`,
          [userId, householdId, cfg.aiProvider, cfg.modelName]
        );
        resolve(run!.id);
      });

      // Kick off async — don't await
      AIAdvisorScheduler.triggerNow(userId, householdId)
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
      const householdId = (req as any).householdId;
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
      const householdId = (req as any).householdId;

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
      const householdId = (req as any).householdId;
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
