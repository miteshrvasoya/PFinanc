/**
 * Run the daily signals job from the command line (for a system cron or a one-off run).
 *   npm run signals:run                 # every household with signals enabled
 *   npm run signals:run -- <householdId>
 */
import { pool } from '../database/db.js';
import { QueryHelper } from '../database/queryHelper.js';
import { SignalsService } from '../modules/signals/signals.service.js';
import { DISCLAIMER } from '../modules/signals/types.js';

(async () => {
  const only = process.argv[2];
  const ids = only ? [only] : (await QueryHelper.query<{ household_id: string }>(`SELECT household_id FROM signal_settings WHERE enabled = TRUE`)).map((r) => r.household_id);
  if (ids.length === 0) console.log('No household has signals enabled. Open the Signals screen once, or pass a household id.');
  let failed = false;
  for (const id of ids) {
    try {
      const r = await SignalsService.runDaily(id, 'CLI');
      console.log(`household ${id}: ${r.status}, as of ${r.asOf}, ${r.scored}/${r.universe} scored, ${r.skipped} skipped`);
      for (const i of r.issues) console.log(`  - ${i.symbol}: ${i.type}: ${i.message}`);
    } catch (e: any) {
      failed = true;
      console.error(`household ${id}: FAILED: ${e.message}`);
    }
  }
  console.log(`\n${DISCLAIMER}`);
  await pool.end();
  process.exit(failed ? 1 : 0);
})();
