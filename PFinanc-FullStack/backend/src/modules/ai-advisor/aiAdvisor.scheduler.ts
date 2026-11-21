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
                 AND started_at > NOW() - INTERVAL '20 minutes'`,
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
   * True when the cron expression (UTC, 5 fields) fires at any minute in the window (now - 15 min, now].
   * The previous implementation compared only literal minute/hour numbers, so step/list/range syntax
   * never fired and day-of-month / month / day-of-week were ignored (weekly schedules ran daily).
   */
  private static isDue(cronExpression: string, now: Date): boolean {
    const fields = cronExpression.trim().split(/\s+/);
    if (fields.length !== 5) return false;
    const start = Math.floor(now.getTime() / 60000) * 60000;
    for (let i = 0; i < 15; i++) {
      if (this.cronMatches(fields, new Date(start - i * 60000))) return true;
    }
    return false;
  }

  private static fieldMatches(field: string, value: number, min: number, max: number): boolean {
    return field.split(',').some((part) => {
      const [rangePart, stepPart] = part.split('/');
      const step = stepPart ? parseInt(stepPart, 10) : 1;
      if (!Number.isFinite(step) || step < 1) return false;
      let lo = min;
      let hi = max;
      if (rangePart !== '*') {
        const [a, b] = rangePart.split('-').map((x) => parseInt(x, 10));
        if (!Number.isFinite(a)) return false;
        lo = a;
        hi = b !== undefined && Number.isFinite(b) ? b : stepPart ? max : a;
      }
      return value >= lo && value <= hi && (value - lo) % step === 0;
    });
  }

  private static cronMatches([minute, hour, dom, month, dow]: string[], d: Date): boolean {
    const dowValue = d.getUTCDay();
    const domMatch = this.fieldMatches(dom, d.getUTCDate(), 1, 31);
    // cron allows 7 for Sunday
    const dowMatch = this.fieldMatches(dow, dowValue, 0, 7) || (dowValue === 0 && this.fieldMatches(dow, 7, 0, 7));
    // Standard cron: if both day fields are restricted, either may match.
    const dayMatch = dom !== '*' && dow !== '*' ? domMatch || dowMatch : domMatch && dowMatch;
    return (
      this.fieldMatches(minute, d.getUTCMinutes(), 0, 59) &&
      this.fieldMatches(hour, d.getUTCHours(), 0, 23) &&
      this.fieldMatches(month, d.getUTCMonth() + 1, 1, 12) &&
      dayMatch
    );
  }
}
