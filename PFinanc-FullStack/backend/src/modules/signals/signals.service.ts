import { pool } from '../../database/db.js';
import { QueryHelper } from '../../database/queryHelper.js';
import { AngelOneError, angelOneConfigured, describeAngelOneError } from '../angelone/angelOneClient.js';
import { istDate } from '../angelone/angelOneProvider.js';
import { baseSymbol } from '../angelone/instruments.js';
import { HoldingsService, SecurityHolding } from '../investments/holdings/holdings.service.js';
import { BENCHMARK, loadCandles, resolveTarget, syncCandles, Target } from './candles.service.js';
import { DEFAULT_SIGNAL_CONFIG, mergeConfig, SignalConfig, validateConfig } from './config.js';
import { evaluateSymbol, SymbolEvaluation } from './evaluate.js';
import { IndicatorSet } from './indicators.js';
import { adviseHolding } from './holdingsAdvice.js';
import { positionSize } from './tradeLevels.js';
import { alertsAfterRun } from './signalAlerts.js';
import { Candle, DISCLAIMER, LABEL_TEXT, SignalLabel } from './types.js';

export function httpError(status: number, code: string, message: string) {
  const e: any = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export interface UniverseEntry { symbol: string; exchange: 'NSE' | 'BSE'; sources: Array<'HOLDING' | 'WATCHLIST' | 'PRESET'>; held: boolean }
export interface RunIssue { symbol: string; type: 'SYMBOL_NOT_FOUND' | 'DATA_UNRELIABLE' | 'FETCH_FAILED'; message: string }

const running = new Map<string, Promise<unknown>>();
const tradable = (h: SecurityHolding) => h.current_quantity > 0 && (h.security_type === 'STOCK' || h.security_type === 'ETF');

const num = (v: any) => (v === null || v === undefined ? null : Number(v));

export class SignalsService {
  // ── Settings ───────────────────────────────────────────────────────────────

  static async getSettings(householdId: string) {
    let row = await QueryHelper.queryOne<{ enabled: boolean; config: any }>(`SELECT enabled, config FROM signal_settings WHERE household_id = $1`, [householdId]);
    if (!row) row = await QueryHelper.queryOne(`INSERT INTO signal_settings (household_id) VALUES ($1) ON CONFLICT (household_id) DO UPDATE SET household_id = EXCLUDED.household_id RETURNING enabled, config`, [householdId]);
    const config = mergeConfig(DEFAULT_SIGNAL_CONFIG, row!.config);
    return { enabled: row!.enabled, config, overrides: row!.config as Record<string, any>, defaults: DEFAULT_SIGNAL_CONFIG };
  }

  static async updateSettings(householdId: string, userId: string, body: { enabled?: boolean; config?: Record<string, any> }) {
    const current = await this.getSettings(householdId);
    let overrides = current.overrides;
    if (body.config) {
      try {
        // Validate against the defaults: the merged result must be valid and every key known.
        const merged = mergeConfig(current.config, body.config);
        validateConfig(merged);
        overrides = JSON.parse(JSON.stringify(diff(DEFAULT_SIGNAL_CONFIG, merged)));
      } catch (e: any) {
        throw httpError(400, 'INVALID_SETTINGS', e.message);
      }
    }
    await QueryHelper.query(
      `INSERT INTO signal_settings (household_id, enabled, config, updated_by, updated_at) VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (household_id) DO UPDATE SET enabled = EXCLUDED.enabled, config = EXCLUDED.config, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [householdId, body.enabled ?? current.enabled, JSON.stringify(overrides), userId]
    );
    return this.getSettings(householdId);
  }

  // ── Universe ───────────────────────────────────────────────────────────────

  static async buildUniverse(householdId: string, cfg: SignalConfig): Promise<UniverseEntry[]> {
    const map = new Map<string, UniverseEntry>();
    const add = (symbol: string, exchange: string, source: UniverseEntry['sources'][number], held = false) => {
      const key = baseSymbol(symbol);
      const e = map.get(key) ?? { symbol: key, exchange: exchange === 'BSE' ? 'BSE' : 'NSE', sources: [], held: false };
      if (!e.sources.includes(source)) e.sources.push(source);
      e.held = e.held || held;
      map.set(key, e);
    };
    if (cfg.universe.includeHoldings) {
      for (const h of (await HoldingsService.calculateHoldings({ householdId })).filter(tradable)) add(h.symbol, h.exchange, 'HOLDING', true);
    }
    if (cfg.universe.includeWatchlist) {
      for (const w of await QueryHelper.query<{ symbol: string; exchange: string }>(`SELECT symbol, exchange FROM watchlist WHERE household_id = $1`, [householdId])) add(w.symbol, w.exchange, 'WATCHLIST');
    }
    for (const s of cfg.universe.presetSymbols) add(s, 'NSE', 'PRESET');
    return Array.from(map.values());
  }

  // ── The daily run ──────────────────────────────────────────────────────────

  /** Start a run in the background (manual trigger). Returns immediately; poll `status`. */
  static startRun(householdId: string, trigger = 'MANUAL') {
    if (running.has(householdId)) return { started: false, running: true };
    const p = this.runDaily(householdId, trigger).catch((e: unknown) => console.error('[signals] run failed:', describeAngelOneError(e).message)).finally(() => running.delete(householdId));
    running.set(householdId, p);
    return { started: true, running: true };
  }

  static isRunning(householdId: string) { return running.has(householdId); }

  /**
   * Update candles, score every symbol in the universe and persist the results. Idempotent: the run is keyed by
   * (household, trading day), candles are upserted, and a re-run replaces that day's signals. One bad symbol never
   * fails the run: it is recorded as an issue and the rest continue. Only a broker login problem aborts it, so we do
   * not hammer the login endpoint once per symbol.
   */
  static async runDaily(householdId: string, trigger = 'SCHEDULED', now: Date = new Date()) {
    if (!angelOneConfigured()) throw httpError(400, 'NOT_CONFIGURED', describeAngelOneError(new AngelOneError('NOT_CONFIGURED', '')).message);
    const settings = await this.getSettings(householdId);
    const cfg = settings.config;
    const universe = await this.buildUniverse(householdId, cfg);
    const issues: RunIssue[] = [];

    // Resolve instruments.
    const targets: Array<{ entry: UniverseEntry; target: Target }> = [];
    for (const entry of universe) {
      const t = await resolveTarget(entry.symbol, entry.exchange);
      if (t) targets.push({ entry, target: t });
      else issues.push({ symbol: entry.symbol, type: 'SYMBOL_NOT_FOUND', message: 'Not found in the Angel One NSE/BSE cash instrument list' });
    }

    // Candles: benchmark first, then each symbol. Failures are per symbol; a login failure aborts.
    const isLoginProblem = (e: unknown) => e instanceof AngelOneError && ['NOT_CONFIGURED', 'AB1000', 'AB1006'].includes(e.code);
    try {
      await syncCandles(BENCHMARK, cfg, { now });
    } catch (e) {
      if (isLoginProblem(e)) throw e;
      issues.push({ symbol: BENCHMARK.symbol, type: 'FETCH_FAILED', message: describeAngelOneError(e).message });
    }
    const failed = new Set<string>();
    for (const { entry, target } of targets) {
      try {
        await syncCandles(target, cfg, { now });
      } catch (e) {
        if (isLoginProblem(e)) throw e;
        failed.add(entry.symbol);
        issues.push({ symbol: entry.symbol, type: 'FETCH_FAILED', message: describeAngelOneError(e).message });
      }
    }

    // Evaluate.
    const bench = await loadCandles(BENCHMARK);
    const lastDates: string[] = [];
    const evaluated: Array<{ entry: UniverseEntry; target: Target; ev: SymbolEvaluation }> = [];
    let skipped = 0;
    for (const { entry, target } of targets) {
      const candles = await loadCandles(target);
      if (candles.length === 0) { skipped++; if (!failed.has(entry.symbol)) issues.push({ symbol: entry.symbol, type: 'FETCH_FAILED', message: 'No candles available' }); continue; }
      lastDates.push(candles[candles.length - 1].date);
      const res = evaluateSymbol(candles, bench, cfg, entry.held, bench.length ? bench[bench.length - 1].date : undefined);
      if (!res.ok) { skipped++; issues.push({ symbol: entry.symbol, type: 'DATA_UNRELIABLE', message: res.reason }); continue; }
      evaluated.push({ entry, target, ev: res.evaluation });
    }
    const asOf = bench.length ? bench[bench.length - 1].date : lastDates.sort().pop() ?? istDate(now);

    // Persist atomically; the previous run (for alert transitions) is read first.
    const prev = await QueryHelper.queryOne<{ id: string }>(
      `SELECT id FROM signal_runs WHERE household_id = $1 AND as_of_date < $2 AND status IN ('COMPLETED','PARTIAL') ORDER BY as_of_date DESC LIMIT 1`, [householdId, asOf]
    );
    const status = evaluated.length === 0 && universe.length > 0 ? 'FAILED' : issues.length > 0 ? 'PARTIAL' : 'COMPLETED';
    const client = await pool.connect();
    let runId = '';
    try {
      await client.query('BEGIN');
      const run = await QueryHelper.queryOne<{ id: string }>(
        `INSERT INTO signal_runs (household_id, as_of_date, status, trigger, universe_size, scored, skipped, errors, config, started_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
         ON CONFLICT (household_id, as_of_date) DO UPDATE SET status = EXCLUDED.status, trigger = EXCLUDED.trigger, universe_size = EXCLUDED.universe_size,
           scored = EXCLUDED.scored, skipped = EXCLUDED.skipped, errors = EXCLUDED.errors, config = EXCLUDED.config, started_at = NOW(), completed_at = NOW()
         RETURNING id`,
        [householdId, asOf, status, trigger, universe.length, evaluated.length, skipped, JSON.stringify(issues), JSON.stringify(cfg)], client
      );
      runId = run!.id;
      await client.query(`DELETE FROM signals WHERE run_id = $1`, [runId]);
      for (const { entry, target, ev } of evaluated) {
        const l = ev.levels;
        await client.query(
          `INSERT INTO signals (run_id, household_id, symbol, exchange, token, as_of_date, score, label, confidence, reasons, warnings, components,
             entry_low, entry_high, stop, target1, target2, risk_reward, trade_valid, trade_note, extended, indicators, avg_traded_value, liquid, data_reliable, data_notes, sources)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,TRUE,$25,$26)`,
          [runId, householdId, entry.symbol, target.exchange, target.token, ev.asOf, ev.score.score, ev.label, ev.score.confidence, JSON.stringify(ev.score.reasons), JSON.stringify(ev.score.warnings), JSON.stringify(ev.score.components),
           l?.entryLow ?? null, l?.entryHigh ?? null, l?.stop ?? null, l?.target1 ?? null, l?.target2 ?? null, l?.riskReward ?? null, l?.valid ?? false, l?.invalidReason ?? null, l?.extended ?? false,
           JSON.stringify(ev.snapshot), ev.snapshot.avgTradedValue20, ev.liquid, JSON.stringify(ev.quality.notes), JSON.stringify(entry.sources)]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }

    if (cfg.alerts.enabled) await alertsAfterRun(householdId, runId, prev?.id ?? null, asOf).catch((e) => console.warn('[signals] alerts failed:', (e as Error).message));
    return { runId, asOf, status, universe: universe.length, scored: evaluated.length, skipped, issues };
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  static async latestRun(householdId: string) {
    return QueryHelper.queryOne<any>(
      `SELECT id, to_char(as_of_date,'YYYY-MM-DD') AS as_of_date, status, trigger, universe_size, scored, skipped, errors, completed_at
       FROM signal_runs WHERE household_id = $1 AND status IN ('COMPLETED','PARTIAL') ORDER BY as_of_date DESC LIMIT 1`, [householdId]
    );
  }

  static async status(householdId: string) {
    const run = await this.latestRun(householdId);
    const last = await QueryHelper.queryOne<any>(`SELECT status, trigger, to_char(as_of_date,'YYYY-MM-DD') AS as_of_date, completed_at FROM signal_runs WHERE household_id = $1 ORDER BY started_at DESC LIMIT 1`, [householdId]);
    return {
      running: this.isRunning(householdId),
      angelOneConfigured: angelOneConfigured(),
      lastRun: run ? { asOfDate: run.as_of_date, status: run.status, updatedAt: run.completed_at, universe: run.universe_size, scored: run.scored, skipped: run.skipped, issues: run.errors } : null,
      lastAttempt: last ? { status: last.status, trigger: last.trigger, asOfDate: last.as_of_date, at: last.completed_at } : null,
      disclaimer: DISCLAIMER,
    };
  }

  private static shape(r: any, cfg: SignalConfig, existingValue = 0) {
    const levels = r.entry_high !== null ? {
      entryLow: num(r.entry_low), entryHigh: num(r.entry_high), stop: num(r.stop), target1: num(r.target1), target2: num(r.target2),
      riskReward: num(r.risk_reward), valid: r.trade_valid, extended: r.extended, note: r.trade_note,
    } : null;
    const size = levels && levels.valid ? positionSize({ entryHigh: levels.entryHigh!, stop: levels.stop! }, cfg, existingValue) : null;
    return {
      symbol: r.symbol, exchange: r.exchange, label: r.label, labelText: LABEL_TEXT[r.label as SignalLabel], score: num(r.score), confidence: num(r.confidence),
      reasons: r.reasons, warnings: r.warnings, levels, suggestedSize: size, liquid: r.liquid, sources: r.sources, asOfDate: r.as_of_date_text,
      price: num(r.indicators?.close), rsi: num(r.indicators?.rsi),
    };
  }

  static async topBuys(householdId: string, limit = 10) {
    const { config } = await this.getSettings(householdId);
    const run = await this.latestRun(householdId);
    if (!run) return { asOfDate: null, updatedAt: null, items: [], excluded: { illiquid: 0, lowRiskReward: 0 }, dataIssues: [], disclaimer: DISCLAIMER, note: 'No signals yet. Run the daily job (or tap Update now) to generate them.' };
    const rows = await QueryHelper.query<any>(
      `SELECT s.*, to_char(s.as_of_date,'YYYY-MM-DD') AS as_of_date_text FROM signals s WHERE s.run_id = $1 AND s.label IN ('STRONG_BUY','BUY') ORDER BY s.score DESC, s.confidence DESC`, [run.id]
    );
    const items = rows.filter((r) => r.liquid && r.trade_valid);
    return {
      asOfDate: run.as_of_date, updatedAt: run.completed_at,
      items: items.slice(0, Math.min(Math.max(limit, 1), 50)).map((r) => this.shape(r, config)),
      excluded: { illiquid: rows.filter((r) => !r.liquid).length, lowRiskReward: rows.filter((r) => r.liquid && !r.trade_valid).length },
      dataIssues: run.errors, disclaimer: DISCLAIMER,
    };
  }


  /** Every signal from the latest run (all labels), for the screener view. Optional label filter. */
  static async allSignals(householdId: string, label?: string) {
    const { config } = await this.getSettings(householdId);
    const run = await this.latestRun(householdId);
    if (!run) return { asOfDate: null, updatedAt: null, items: [], counts: {}, disclaimer: DISCLAIMER };
    const rows = await QueryHelper.query<any>(
      `SELECT s.*, to_char(s.as_of_date,'YYYY-MM-DD') AS as_of_date_text FROM signals s WHERE s.run_id = $1 ORDER BY s.score DESC`, [run.id]
    );
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.label] = (counts[r.label] || 0) + 1;
    const shown = label ? rows.filter((r) => r.label === label) : rows;
    return { asOfDate: run.as_of_date, updatedAt: run.completed_at, items: shown.map((r) => this.shape(r, config)), counts, dataIssues: run.errors, disclaimer: DISCLAIMER };
  }

  /** History of daily runs (when they ran, what they covered, and the issues recorded). */
  static async runs(householdId: string, limit = 30) {
    const rows = await QueryHelper.query<any>(
      `SELECT id, to_char(as_of_date,'YYYY-MM-DD') AS as_of_date, status, trigger, universe_size, scored, skipped, errors, started_at, completed_at
       FROM signal_runs WHERE household_id = $1 ORDER BY as_of_date DESC LIMIT $2`, [householdId, Math.min(Math.max(limit, 1), 200)]
    );
    return { items: rows.map((r) => ({ id: r.id, asOfDate: r.as_of_date, status: r.status, trigger: r.trigger, universe: r.universe_size, scored: r.scored, skipped: r.skipped, issues: r.errors, startedAt: r.started_at, completedAt: r.completed_at })), disclaimer: DISCLAIMER };
  }

  /** How one symbol's signal has changed day by day across stored runs. */
  static async symbolHistory(householdId: string, symbol: string, days = 120) {
    const sym = baseSymbol(symbol);
    const rows = await QueryHelper.query<any>(
      `SELECT to_char(as_of_date,'YYYY-MM-DD') AS d, label, score, confidence, entry_low, entry_high, stop, target1, target2, trade_valid, reasons
       FROM signals WHERE household_id = $1 AND symbol = $2 ORDER BY as_of_date DESC LIMIT $3`, [householdId, sym, Math.min(Math.max(days, 1), 500)]
    );
    return { symbol: sym, items: rows.reverse().map((r) => ({ date: r.d, label: r.label, labelText: LABEL_TEXT[r.label as SignalLabel], score: num(r.score), confidence: num(r.confidence), entryLow: num(r.entry_low), entryHigh: num(r.entry_high), stop: num(r.stop), target1: num(r.target1), target2: num(r.target2), tradeValid: r.trade_valid, reasons: r.reasons })), disclaimer: DISCLAIMER };
  }

  /** Signals for what you hold, evaluated fresh from stored candles, with trailing stop, P&L and the 12-month prompt. */
  static async holdingsSignals(householdId: string, userId: string) {
    const { config: cfg } = await this.getSettings(householdId);
    const run = await this.latestRun(householdId);
    const holdings = await HoldingsService.calculateHoldings({ householdId, userId });
    const bench = await loadCandles(BENCHMARK);
    const items: any[] = [];
    const notCovered: Array<{ symbol: string; note: string }> = [];

    for (const h of holdings.filter((x) => x.current_quantity > 0)) {
      if (!tradable(h)) { notCovered.push({ symbol: h.symbol, note: 'Technical signals cover stocks and ETFs, not mutual funds or other assets' }); continue; }
      const base = { symbol: h.symbol, name: h.name, quantity: h.current_quantity, averageCost: h.average_cost, currentPrice: h.current_price, accountName: h.account_name };
      const target = await resolveTarget(h.symbol, h.exchange === 'BSE' ? 'BSE' : 'NSE');
      const candles = target ? await loadCandles(target) : [];
      if (!target || candles.length === 0) { items.push({ ...base, signal: null, note: target ? 'No candle history yet. Run the signals job to load it.' : 'Symbol not found in the Angel One instrument list' }); continue; }
      const res = evaluateSymbol(candles, bench, cfg, true, bench.length ? bench[bench.length - 1].date : undefined);
      if (!res.ok) { items.push({ ...base, signal: null, dataUnreliable: true, note: res.reason, dataNotes: res.quality.notes }); continue; }
      const ev = res.evaluation;
      const lots = (h.lots || []).map((l) => ({ date: l.date, quantity: l.quantity }));
      const advice = adviseHolding(ev.snapshot, ev.score, candles, { quantity: h.current_quantity, averageCost: h.average_cost, lots }, cfg, ev.asOf);
      items.push({
        ...base, asOfDate: ev.asOf,
        signal: { label: advice.label, labelText: LABEL_TEXT[advice.label], technicalLabel: ev.score.label, score: ev.score.score, confidence: ev.score.confidence, reasons: [...advice.reasons, ...ev.score.reasons], warnings: ev.score.warnings },
        trailingStop: advice.trailingStop, trailingStopHit: advice.trailingStopHit, highestClose: advice.highestClose,
        unrealizedPnl: advice.unrealizedPnl, unrealizedPnlPct: advice.unrealizedPnlPct, longTermNotes: advice.longTermNotes,
        levels: ev.levels && ev.levels.valid ? ev.levels : null, dataNotes: ev.quality.notes,
      });
    }
    const rank: Record<string, number> = { SELL: 0, REDUCE: 1, HOLD: 2 };
    items.sort((a, b) => (rank[a.signal?.label] ?? 3) - (rank[b.signal?.label] ?? 3));
    return { asOfDate: run?.as_of_date ?? null, updatedAt: run?.completed_at ?? null, items, notCovered, disclaimer: DISCLAIMER };
  }

  /** One symbol in depth: the signal, reasons, levels, and indicator series for the charts. */
  static async symbolDetail(householdId: string, userId: string, symbol: string, bars = 250) {
    const { config: cfg } = await this.getSettings(householdId);
    const sym = baseSymbol(symbol);
    const holdings = (await HoldingsService.calculateHoldings({ householdId, userId })).filter(tradable);
    const holding = holdings.find((h) => baseSymbol(h.symbol) === sym);
    const target = await resolveTarget(sym, holding?.exchange === 'BSE' ? 'BSE' : 'NSE');
    if (!target) throw httpError(404, 'SYMBOL_NOT_FOUND', `"${symbol}" was not found in the Angel One NSE/BSE cash instrument list.`);

    let candles = await loadCandles(target);
    if (candles.length === 0 && angelOneConfigured()) {
      try { await syncCandles(target, cfg); candles = await loadCandles(target); } catch (e) { throw httpError(502, 'FETCH_FAILED', describeAngelOneError(e).message); }
    }
    if (candles.length === 0) throw httpError(404, 'NO_DATA', 'No candle history for this symbol yet.');
    if (!(await QueryHelper.queryOne(`SELECT 1 FROM candle_sync_state WHERE exchange = $1 AND token = $2`, [BENCHMARK.exchange, BENCHMARK.token])) && angelOneConfigured()) {
      await syncCandles(BENCHMARK, cfg).catch(() => undefined);
    }
    const bench = await loadCandles(BENCHMARK);
    const res = evaluateSymbol(candles, bench, cfg, !!holding, bench.length ? bench[bench.length - 1].date : undefined);

    const stored = await QueryHelper.queryOne<any>(
      `SELECT s.sources, to_char(s.as_of_date,'YYYY-MM-DD') AS as_of_date FROM signals s JOIN signal_runs r ON r.id = s.run_id WHERE s.household_id = $1 AND s.symbol = $2 ORDER BY s.as_of_date DESC LIMIT 1`, [householdId, sym]
    );
    const base = { symbol: sym, tradingSymbol: target.symbol, exchange: target.exchange, held: !!holding, sources: stored?.sources ?? [], disclaimer: DISCLAIMER };
    if (!res.ok) return { ...base, signal: null, dataUnreliable: true, note: res.reason, dataNotes: res.quality.notes, series: seriesFor(candles, null, bars) };

    const ev = res.evaluation;
    const existingValue = holding ? holding.current_value : 0;
    const advice = holding
      ? adviseHolding(ev.snapshot, ev.score, candles, { quantity: holding.current_quantity, averageCost: holding.average_cost, lots: (holding.lots || []).map((l) => ({ date: l.date, quantity: l.quantity })) }, cfg, ev.asOf)
      : null;
    return {
      ...base, asOfDate: ev.asOf,
      signal: { label: advice?.label ?? ev.label, labelText: LABEL_TEXT[advice?.label ?? ev.label], technicalLabel: ev.score.label, score: ev.score.score, confidence: ev.score.confidence, reasons: [...(advice?.reasons ?? []), ...ev.score.reasons], warnings: ev.score.warnings, components: ev.score.components },
      levels: ev.levels, suggestedSize: ev.levels?.valid ? positionSize(ev.levels, cfg, existingValue) : null,
      indicators: ev.snapshot, liquid: ev.liquid, dataNotes: ev.quality.notes,
      holding: holding && advice ? { quantity: holding.current_quantity, averageCost: holding.average_cost, ...advice } : null,
      series: seriesFor(candles, ev.indicators, bars),
    };
  }
}

/** Series for the charts: the last `bars` candles with the overlays and oscillators the UI draws. */
function seriesFor(candles: Candle[], ind: IndicatorSet | null, bars: number) {
  const from = Math.max(0, candles.length - bars);
  const r = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);
  return candles.slice(from).map((c, k) => {
    const i = from + k;
    return {
      date: c.date, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
      sma20: r(ind?.sma20[i]), sma50: r(ind?.sma50[i]), sma200: r(ind?.sma200[i]),
      bbUpper: r(ind?.bb.upper[i]), bbMiddle: r(ind?.bb.middle[i]), bbLower: r(ind?.bb.lower[i]),
      rsi: r(ind?.rsi[i]), macd: r(ind?.macd.macd[i]), macdSignal: r(ind?.macd.signal[i]), macdHist: r(ind?.macd.hist[i]),
    };
  });
}

/** Keys of `merged` that differ from `base`, so only real overrides are stored. */
function diff(base: any, merged: any): any {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return JSON.stringify(base) === JSON.stringify(merged) ? undefined : merged;
  const out: any = {};
  for (const k of Object.keys(base)) {
    const d = diff(base[k], merged[k]);
    if (d !== undefined && !(typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0)) out[k] = d;
  }
  return out;
}
