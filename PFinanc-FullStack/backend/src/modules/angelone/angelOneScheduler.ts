import cron, { ScheduledTask } from 'node-cron';
import { config } from '../../config/env.js';
import { AngelOneService } from './angelOne.service.js';
import { angelOneConfigured, describeAngelOneError } from './angelOneClient.js';
import { ensureInstrumentMaster, refreshInstrumentMaster } from './instruments.js';

/**
 * Keeps prices fresh during Indian market hours (Mon-Fri, IST) and refreshes the instrument master each morning.
 * Does nothing unless Angel One credentials are configured. Holdings are never synced automatically because that
 * changes stored data; use the Sync button.
 */
export class AngelOneScheduler {
  private static tasks: ScheduledTask[] = [];
  private static running = false;

  static start() {
    if (this.tasks.length || !angelOneConfigured()) {
      if (!angelOneConfigured()) console.log('[AngelOne] Not configured; price scheduler disabled.');
      return;
    }
    const tz = { timezone: 'Asia/Kolkata' };
    this.tasks.push(cron.schedule('30 8 * * 1-5', () => this.refreshMaster(), tz));

    if (config.angelOne.autoRefreshPrices) {
      const m = config.angelOne.priceRefreshMinutes;
      const everyMinutes = m >= 60 ? '0 9-15 * * 1-5' : `*/${m} 9-15 * * 1-5`;
      this.tasks.push(cron.schedule(everyMinutes, () => this.refreshPrices(), tz));
      this.tasks.push(cron.schedule('40 15 * * 1-5', () => this.refreshPrices(), tz)); // one last update after the close
    }
    console.log(`[AngelOne] Scheduler started (prices ${config.angelOne.autoRefreshPrices ? `every ${config.angelOne.priceRefreshMinutes} min in market hours` : 'manual only'}).`);
  }

  static stop() {
    this.tasks.forEach((t) => t.stop());
    this.tasks = [];
  }

  private static async refreshMaster() {
    try { await refreshInstrumentMaster(); } catch (err) { console.warn('[AngelOne] master refresh failed:', (err as Error).message); }
  }

  private static async refreshPrices() {
    if (this.running) return;
    this.running = true;
    try {
      const household = await AngelOneService.allowedHouseholdId();
      if (!household) return;
      await ensureInstrumentMaster();
      await AngelOneService.syncPrices(household);
    } catch (err) {
      console.warn('[AngelOne] scheduled price refresh failed:', describeAngelOneError(err).message);
    } finally {
      this.running = false;
    }
  }
}
