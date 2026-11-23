import { QueryHelper } from '../../database/queryHelper.js';
import { AIAdvisorService } from '../ai-advisor/aiAdvisor.service.js';
import { AngelOneClient, angelOneConfigured } from '../angelone/angelOneClient.js';
import { HoldingsService } from '../investments/holdings/holdings.service.js';
import { baseSymbol } from '../angelone/instruments.js';
import { loadCandles } from './candles.service.js';
import { DISCLAIMER } from './types.js';

/**
 * Alerts reuse the in-app notification list. De-duplication is by STATE, not by time: the unique key
 * (household, symbol, kind, key) means the same condition for the same symbol alerts once, and a new alert only
 * appears when the state changes (a new level, a new trading day's transition, ...).
 */

export type AlertKind = 'STRONG_BUY' | 'SELL' | 'STOP_HIT' | 'TARGET_HIT' | 'ENTRY_ZONE';
const TYPE: Record<AlertKind, string> = {
  STRONG_BUY: 'SIGNAL_STRONG_BUY', SELL: 'SIGNAL_SELL', STOP_HIT: 'SIGNAL_STOP_HIT', TARGET_HIT: 'SIGNAL_TARGET_HIT', ENTRY_ZONE: 'SIGNAL_ENTRY_ZONE',
};

/** Returns true when a NEW alert was recorded and sent, false when it had already been sent. */
export async function alertOnce(householdId: string, symbol: string, kind: AlertKind, key: string, title: string, body: string): Promise<boolean> {
  const inserted = await QueryHelper.queryOne<{ id: string }>(
    `INSERT INTO signal_alerts (household_id, symbol, kind, dedupe_key) VALUES ($1,$2,$3,$4) ON CONFLICT (household_id, symbol, kind, dedupe_key) DO NOTHING RETURNING id`,
    [householdId, symbol, kind, key]
  );
  if (!inserted) return false;
  const people = await QueryHelper.query<{ user_id: string }>(`SELECT user_id FROM household_members WHERE household_id = $1 AND role IN ('OWNER','ADMIN')`, [householdId]);
  for (const p of people) {
    await AIAdvisorService.createNotification(p.user_id, householdId, null, TYPE[kind], title, `${body}\n\n${DISCLAIMER}`);
  }
  return true;
}

/** Transitions between two runs: a stock newly rated STRONG BUY, or a holding newly rated SELL. */
export async function alertsAfterRun(householdId: string, runId: string, prevRunId: string | null, asOf: string) {
  const current = await QueryHelper.query<any>(`SELECT symbol, label, score, confidence, liquid, trade_valid, sources, entry_low, entry_high, stop, target1 FROM signals WHERE run_id = $1`, [runId]);
  const prev = new Map((prevRunId ? await QueryHelper.query<any>(`SELECT symbol, label FROM signals WHERE run_id = $1`, [prevRunId]) : []).map((r) => [r.symbol, r.label]));
  let sent = 0;
  for (const s of current) {
    const was = prev.get(s.symbol);
    if (s.label === 'STRONG_BUY' && was !== 'STRONG_BUY' && s.liquid && s.trade_valid) {
      sent += (await alertOnce(householdId, s.symbol, 'STRONG_BUY', asOf, `STRONG BUY: ${s.symbol}`,
        `${s.symbol} now scores ${s.score} (confidence ${Math.round(s.confidence * 100)}%). Suggested entry ${s.entry_low}-${s.entry_high}, stop ${s.stop}, first target ${s.target1}.`)) ? 1 : 0;
    }
    if (s.label === 'SELL' && was !== 'SELL' && (s.sources as string[]).includes('HOLDING')) {
      sent += (await alertOnce(householdId, s.symbol, 'SELL', asOf, `SELL signal on a holding: ${s.symbol}`,
        `The technical picture for ${s.symbol}, which you hold, turned bearish (score ${s.score}).`)) ? 1 : 0;
    }
  }
  return sent;
}

/**
 * Lightweight intraday pass: fetch live prices (LTP) for the latest run's symbols and raise alerts when a holding
 * hits its stop or target, or a buy candidate trades inside its entry zone. Nothing is recomputed.
 */
export async function intradayCheck(householdId: string): Promise<{ checked: number; alerts: number }> {
  if (!angelOneConfigured()) return { checked: 0, alerts: 0 };
  const run = await QueryHelper.queryOne<{ id: string; as_of: string; config: any }>(
    `SELECT id, to_char(as_of_date,'YYYY-MM-DD') AS as_of, config FROM signal_runs WHERE household_id = $1 AND status IN ('COMPLETED','PARTIAL') ORDER BY as_of_date DESC LIMIT 1`, [householdId]
  );
  if (!run) return { checked: 0, alerts: 0 };
  const { SignalsService } = await import('./signals.service.js'); // lazy: signals.service imports this module
  const cfg = (await SignalsService.getSettings(householdId)).config;
  const rows = await QueryHelper.query<any>(`SELECT symbol, exchange, token, label, entry_low, entry_high, stop, target1, target2, trade_valid, liquid, sources, indicators FROM signals WHERE run_id = $1`, [run.id]);

  const holdings = (await HoldingsService.calculateHoldings({ householdId })).filter((h) => h.current_quantity > 0);
  const held = new Map(holdings.map((h) => [baseSymbol(h.symbol), h]));
  const watch = rows.filter((r) => held.has(r.symbol) || ((r.label === 'STRONG_BUY' || r.label === 'BUY') && r.trade_valid && r.liquid));
  if (watch.length === 0) return { checked: 0, alerts: 0 };

  // Live prices, 50 symbols per request (documented limit).
  const price = new Map<string, number>();
  for (let i = 0; i < watch.length; i += 50) {
    const chunk = watch.slice(i, i + 50);
    const exchangeTokens: Record<string, string[]> = {};
    for (const r of chunk) (exchangeTokens[r.exchange] ||= []).push(r.token);
    const { fetched } = await AngelOneClient.getQuotes('LTP', exchangeTokens);
    for (const q of fetched) if (q.ltp > 0) price.set(`${q.exchange}:${q.symbolToken}`, q.ltp);
  }

  let alerts = 0;
  for (const r of watch) {
    const ltp = price.get(`${r.exchange}:${r.token}`);
    if (!ltp) continue;
    const h = held.get(r.symbol);
    if (h) {
      const avg = h.average_cost.toFixed(2);
      if (r.stop !== null && ltp <= Number(r.stop)) alerts += (await alertOnce(householdId, r.symbol, 'STOP_HIT', `stop:${r.stop}`, `Stop hit: ${r.symbol}`, `${r.symbol} traded at ${ltp}, at or below the stop ${r.stop}. Your average buy price is ${avg}.`)) ? 1 : 0;
      if (r.target1 !== null && ltp >= Number(r.target1)) alerts += (await alertOnce(householdId, r.symbol, 'TARGET_HIT', `t1:${r.target1}`, `Target 1 reached: ${r.symbol}`, `${r.symbol} traded at ${ltp}, at or above target 1 (${r.target1}). Your average buy price is ${avg}.`)) ? 1 : 0;
      if (r.target2 !== null && ltp >= Number(r.target2)) alerts += (await alertOnce(householdId, r.symbol, 'TARGET_HIT', `t2:${r.target2}`, `Target 2 reached: ${r.symbol}`, `${r.symbol} traded at ${ltp}, at or above target 2 (${r.target2}). Your average buy price is ${avg}.`)) ? 1 : 0;
      // Trailing stop: highest close of the last 60 bars minus a multiple of ATR.
      const atrV = Number(r.indicators?.atr);
      if (atrV > 0) {
        const candles = await loadCandles({ exchange: r.exchange, token: r.token }, 60);
        const hi = candles.length ? Math.max(...candles.map((c) => c.close)) : 0;
        const trail = hi - cfg.holdings.trailingAtrMultiple * atrV;
        if (hi > 0 && ltp < trail) alerts += (await alertOnce(householdId, r.symbol, 'STOP_HIT', `trail:${Math.round(trail)}`, `Trailing stop hit: ${r.symbol}`, `${r.symbol} traded at ${ltp}, below its trailing stop ${trail.toFixed(2)}. Your average buy price is ${avg}.`)) ? 1 : 0;
      }
    } else if (r.entry_low !== null && ltp <= Number(r.entry_high) && ltp >= Number(r.stop)) {
      alerts += (await alertOnce(householdId, r.symbol, 'ENTRY_ZONE', run.as_of, `In the entry zone: ${r.symbol}`, `${r.symbol} is trading at ${ltp}, inside its suggested entry zone ${r.entry_low}-${r.entry_high} (stop ${r.stop}).`)) ? 1 : 0;
    }
  }
  return { checked: price.size, alerts };
}
