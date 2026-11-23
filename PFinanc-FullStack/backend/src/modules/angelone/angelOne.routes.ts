import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { getHouseholdId } from '../../utils/request.js';
import { AngelOneService } from './angelOne.service.js';
import { AngelOneError, describeAngelOneError } from './angelOneClient.js';

/** /api/integrations/angelone: Angel One SmartAPI (stocks and ETFs; mutual funds are not offered by SmartAPI). */
export const angelOneRouter = Router();
angelOneRouter.use(authenticate, requireHouseholdAccess());

function fail(res: Response, err: any) {
  if (err instanceof AngelOneError) {
    const d = describeAngelOneError(err);
    const status = err.code === 'RATE_LIMIT' ? 429 : err.code === 'NOT_CONFIGURED' ? 400 : 502;
    return res.status(status).json({ success: false, error: { code: d.code, message: d.message } });
  }
  return res.status(err?.status || 500).json({ success: false, error: { code: err?.code || 'ANGELONE_ERROR', message: err?.message || 'Something went wrong' } });
}

const wrap = (fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (err) { fail(res, err); }
};

angelOneRouter.get('/status', wrap((req) => AngelOneService.getStatus(getHouseholdId(req), req.user!.id)));
angelOneRouter.post('/test', wrap((req) => AngelOneService.testConnection(getHouseholdId(req), req.user!.id)));
angelOneRouter.get('/holdings', wrap((req) => AngelOneService.previewHoldings(getHouseholdId(req), req.user!.id)));
angelOneRouter.post('/holdings/sync', wrap((req) => AngelOneService.syncHoldings(getHouseholdId(req), req.user!.id)));
angelOneRouter.post('/prices/sync', wrap((req) => AngelOneService.syncPrices(getHouseholdId(req), req.user!.id)));
angelOneRouter.get('/quotes', wrap((req) =>
  AngelOneService.getQuotes(getHouseholdId(req), req.user!.id, String(req.query.symbols || '').split(','), req.query.exchange === 'BSE' ? 'BSE' : 'NSE')
));
