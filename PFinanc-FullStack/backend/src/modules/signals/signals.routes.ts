import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { isPrivilegedRole, requireHouseholdAccess } from '../../middleware/rbac.js';
import { getHouseholdId } from '../../utils/request.js';
import { AngelOneError, describeAngelOneError } from '../angelone/angelOneClient.js';
import { backtestById, backtestHistory, latestBacktest, runBacktestFor } from './backtest.service.js';
import { SignalsService } from './signals.service.js';
import { WatchlistService } from './watchlist.service.js';
import { DISCLAIMER } from './types.js';

/**
 * Advisory stock signals. READ-ONLY with respect to the broker: nothing here can place, modify or cancel an
 * order (the Angel One client has no order endpoints at all). Every response carries the disclaimer.
 */
export const signalsRouter = Router();
export const watchlistRouter = Router();
for (const r of [signalsRouter, watchlistRouter]) r.use(authenticate, requireHouseholdAccess());

function fail(res: Response, err: any) {
  if (err instanceof AngelOneError) {
    const d = describeAngelOneError(err);
    return res.status(err.code === 'RATE_LIMIT' ? 429 : err.code === 'NOT_CONFIGURED' ? 400 : 502).json({ success: false, error: { code: d.code, message: d.message }, disclaimer: DISCLAIMER });
  }
  return res.status(err?.status || 500).json({ success: false, error: { code: err?.code || 'SIGNALS_ERROR', message: err?.message || 'Something went wrong' }, disclaimer: DISCLAIMER });
}
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response) => {
  try {
    const data = await fn(req);
    res.json({ success: true, data: data && typeof data === 'object' && !Array.isArray(data) ? { disclaimer: DISCLAIMER, ...data } : data, disclaimer: DISCLAIMER });
  } catch (err) { fail(res, err); }
};
const needPrivileged = (req: Request) => {
  if (!isPrivilegedRole(req.householdMembership?.role)) {
    const e: any = new Error('Only a household owner or admin can do this.');
    e.status = 403; e.code = 'OWNER_OR_ADMIN_ONLY';
    throw e;
  }
};

signalsRouter.get('/status', wrap((req) => SignalsService.status(getHouseholdId(req))));
signalsRouter.get('/top-buys', wrap((req) => SignalsService.topBuys(getHouseholdId(req), parseInt(String(req.query.limit)) || 10)));
signalsRouter.get('/holdings', wrap((req) => SignalsService.holdingsSignals(getHouseholdId(req), req.user!.id)));
signalsRouter.get('/settings', wrap(async (req) => {
  const s = await SignalsService.getSettings(getHouseholdId(req));
  return { enabled: s.enabled, config: s.config, defaults: s.defaults };
}));
signalsRouter.put('/settings', wrap(async (req) => {
  needPrivileged(req);
  const s = await SignalsService.updateSettings(getHouseholdId(req), req.user!.id, { enabled: req.body?.enabled, config: req.body?.config });
  return { enabled: s.enabled, config: s.config, defaults: s.defaults };
}));
signalsRouter.post('/run', wrap(async (req) => {
  needPrivileged(req);
  return { ...SignalsService.startRun(getHouseholdId(req), 'MANUAL'), message: 'The run takes a few minutes because Angel One limits candle requests. Poll /signals/status.' };
}));
signalsRouter.post('/backtest', wrap(async (req) => {
  needPrivileged(req);
  const { symbols, from, to, config } = req.body || {};
  return runBacktestFor(getHouseholdId(req), req.user!.id, { symbols: Array.isArray(symbols) ? symbols.map(String) : undefined, from, to, config });
}));
signalsRouter.get('/backtest/latest', wrap((req) => latestBacktest(getHouseholdId(req))));
signalsRouter.get('/backtest/history', wrap((req) => backtestHistory(getHouseholdId(req), parseInt(String(req.query.limit)) || 50)));
signalsRouter.get('/backtest/:id', wrap((req) => backtestById(getHouseholdId(req), String(req.params.id))));
signalsRouter.get('/all', wrap((req) => SignalsService.allSignals(getHouseholdId(req), req.query.label ? String(req.query.label).toUpperCase() : undefined)));
signalsRouter.get('/runs', wrap((req) => SignalsService.runs(getHouseholdId(req), parseInt(String(req.query.limit)) || 30)));
signalsRouter.get('/:symbol/history', wrap((req) => SignalsService.symbolHistory(getHouseholdId(req), String(req.params.symbol), parseInt(String(req.query.days)) || 120)));
// Keep the parametrised route last so it does not swallow the fixed paths above.
signalsRouter.get('/:symbol', wrap((req) => SignalsService.symbolDetail(getHouseholdId(req), req.user!.id, String(req.params.symbol))));

watchlistRouter.get('/', wrap((req) => WatchlistService.list(getHouseholdId(req))));
watchlistRouter.post('/', wrap(async (req) => ({ item: await WatchlistService.add(getHouseholdId(req), req.user!.id, req.body || {}) })));
watchlistRouter.delete('/:idOrSymbol', wrap(async (req) => { await WatchlistService.remove(getHouseholdId(req), String(req.params.idOrSymbol)); return { removed: true }; }));
