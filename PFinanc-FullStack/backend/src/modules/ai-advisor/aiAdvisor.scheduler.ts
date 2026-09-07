import cron, { ScheduledTask } from 'node-cron';
import { QueryHelper } from '../../database/queryHelper.js';
import { AIAdvisorService } from './aiAdvisor.service.js';

/**
 * AIAdvisorScheduler — manages the daily cron job for running AI analysis
 * for all enabled user configs. Runs at the configured cron expression per user.
 *
 * Since different users may have different schedules, we use a single
 * master cron (every 15 minutes) that checks which users are due to run.
 */
export class AIAdvisorScheduler {
  private static masterTask: ScheduledTask | null = null;
  private static running = false;

  /**
   * Start the master scheduler. Called once from app.ts on startup.
   */
  static start() {
    if (this.masterTask) {
      console.log('[AIAdvisorScheduler] Scheduler already running.');
      return;
    }

    // Check every 15 minutes which users are due for analysis
    this.masterTask = cron.schedule('*/15 * * * *', async () => {
      await this.tick();
    });

    console.log('[AIAdvisorScheduler] ✅ Daily AI Advisor scheduler started (checks every 15 min).');
  }

  static stop() {
    if (this.masterTask) {
      this.masterTask.stop();
      this.masterTask = null;
      console.log('[AIAdvisorScheduler] Scheduler stopped.');
    }
  }

  /**
   * Trigger analysis immediately for a specific user (manual run).
   */
  static async triggerNow(userId: string, householdId: string): Promise<{ runId: string; reportId?: string; status: string }> {
    console.log(`[AIAdvisorScheduler] Manual trigger for user ${userId}`);
    return AIAdvisorService.runAnalysis(userId, householdId, 'MANUAL');
  }

  /**
   * The master tick — finds all configs whose cron is currently due.
   */
  private static async tick() {
    if (this.running) return; // prevent overlap
    this.running = true;

    try {
      const configs = await QueryHelper.query<{
        user_id: string;
        household_id: string;
        schedule_cron: string;
      }>(
        `SELECT user_id, household_id, schedule_cron
         FROM ai_advisor_config
         WHERE is_enabled = true`
      );

      const now = new Date();

      for (const cfg of configs) {
        try {
          if (!cron.validate(cfg.schedule_cron)) continue;

          if (this.isDue(cfg.schedule_cron, now)) {
            // Check we haven't already run within the last hour for this user
            const recentRun = await QueryHelper.queryOne<{ id: string }>(
              `SELECT id FROM ai_advisor_runs
               WHERE user_id = $1 AND household_id = $2
                 AND triggered_by = 'SCHEDULED'
                 AND started_at > NOW() - INTERVAL '1 hour'`,
              [cfg.user_id, cfg.household_id]
            );

            if (!recentRun) {
              console.log(`[AIAdvisorScheduler] Running scheduled analysis for user ${cfg.user_id}`);
              // Fire and forget — don't await to avoid blocking other users
              AIAdvisorService
                .runAnalysis(cfg.user_id, cfg.household_id, 'SCHEDULED')
                .catch(err => console.error(`[AIAdvisorScheduler] Analysis failed for user ${cfg.user_id}:`, err));
            }
          }
        } catch (err) {
          console.error(`[AIAdvisorScheduler] Error processing config for user ${cfg.user_id}:`, err);
        }
      }
    } catch (err) {
      console.error('[AIAdvisorScheduler] Tick error:', err);
    } finally {
      this.running = false;
    }
  }

  /**
   * Checks if a cron expression is due within the current 15-minute window.
   * We compare the cron's expected "next" fire time to within 15 minutes of now.
   */
  private static isDue(cronExpression: string, now: Date): boolean {
    try {
      // node-cron fires at the first tick that matches — check if current minute matches
      const [minute, hour] = cronExpression.trim().split(' ');
      const currentMinute = now.getUTCMinutes();
      const currentHour = now.getUTCHours();

      const minuteMatch = minute === '*' || parseInt(minute) === currentMinute;
      const hourMatch = hour === '*' || parseInt(hour) === currentHour;

      return minuteMatch && hourMatch;
    } catch {
      return false;
    }
  }
}
