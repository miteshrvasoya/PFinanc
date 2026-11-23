/**
 * Set the preset universe (for example Nifty 100 constituents) for a household from a text/CSV file of symbols.
 *   npm run signals:universe -- <householdId> <file>
 * The file may list one symbol per line or comma-separated; a header row such as "Symbol" is ignored.
 * PFinanc does not bundle index constituent lists (they change); download one from NSE and import it here.
 */
import fs from 'fs';
import { pool } from '../database/db.js';
import { SignalsService } from '../modules/signals/signals.service.js';

(async () => {
  const [householdId, file] = process.argv.slice(2);
  if (!householdId || !file) { console.error('Usage: npm run signals:universe -- <householdId> <file>'); process.exit(1); }
  const symbols = Array.from(new Set(
    fs.readFileSync(file, 'utf8').split(/[\r\n,;]+/).map((s) => s.trim().replace(/^"|"$/g, '').toUpperCase()).filter((s) => /^[A-Z0-9&_-]{1,30}$/.test(s) && !['SYMBOL', 'SYMBOLS', 'TICKER'].includes(s))
  ));
  if (symbols.length === 0) { console.error('No symbols found in the file.'); process.exit(1); }
  const owner = (await (await import('../database/queryHelper.js')).QueryHelper.queryOne<{ user_id: string }>(`SELECT user_id FROM household_members WHERE household_id = $1 AND role = 'OWNER' LIMIT 1`, [householdId]))?.user_id;
  if (!owner) { console.error('Household not found.'); process.exit(1); }
  await SignalsService.updateSettings(householdId, owner, { config: { universe: { presetSymbols: symbols.slice(0, 500) } } });
  console.log(`Preset universe set to ${Math.min(symbols.length, 500)} symbols.`);
  await pool.end();
})().catch(async (e) => { console.error(e.message); await pool.end(); process.exit(1); });
