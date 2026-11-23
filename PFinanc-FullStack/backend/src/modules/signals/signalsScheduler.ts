import cron, { ScheduledTask } from 'node-cron';
import { QueryHelper } from '../../database/queryHelper.js';
import { angelOneConfigured, describeAngelOneError } from '../angelone/angelOneClient.js';
import { intradayCheck } from './signalAlerts.js';
import { SignalsService } from './signals.service.js';

/**
 * Daily run at 16:00 IST on weekdays (NSE closes 15:30, so candles are final), plus a light intraday check every
 * 15 minutes in market hours. Needs a long-running backend process; on serverless hosting use the manual run
 * endpoint or `npm run signals:run` from an external scheduler. Disable with SIGNALS_ENABLED=false.
 */
export class SignalsScheduler {
  private static tasks: ScheduledTask[] = [];
  private static busy = false;

  static start() {
    if (this.tasks.length || process.env.SIGNALS_ENABLED === 'false' || !angelOneConfigured()) return;
    const tz = { timezone: 'Asia/Kolkata' };
    this.tasks.push(cron.schedule('0 16 * * 1-5', () => this.eachHousehold(async (id) => { await SignalsService.runDaily(id, 'SCHEDULED'); }), tz));
    this.tasks.push(cron.schedule('*/15 9-15 * * 1-5', () => this.eachHousehold(async (id) => { await intradayCheck(id); }), tz));
    console.log('[signals] Scheduler started (daily run 16:00 IST, intraday check every 15 min in market hours).');
  }

  static stop() { this.tasks.forEach((t) => t.stop()); this.tasks = []; }

  private static async eachHousehold(fn: (householdId: string) => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    try {
      const rows = await QueryHelper.query<{ household_id: string }>(`SELECT household_id FROM signal_settings WHERE enabled = TRUE`);
      for (const r of rows) {
        try { await fn(r.household_id); } catch (e) { console.warn('[signals] scheduled job failed:', describeAngelOneError(e).message); }
      }
    } finally { this.busy = false; }
  }
}
