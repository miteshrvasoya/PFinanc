import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireHouseholdAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { getHouseholdId, getParam } from '../../utils/request.js';
import { PreciousMetalsService } from './preciousMetals.service.js';
import { METALS } from './valuation.js';

const router = Router();
router.use(authenticate, requireHouseholdAccess());

const money = z.number().nonnegative().max(1e11);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2025-03-15');
const itemShape = {
  name: z.string().trim().min(1).max(255),
  metal: z.enum(METALS),
  form: z.enum(['RAW', 'JEWELLERY']),
  item_type: z.string().max(30).optional(),
  purity_label: z.string().max(30).optional(),
  fineness: z.number().min(100).max(1000),
  pieces: z.number().int().min(1).max(100000).optional(),
  gross_weight_g: z.number().positive().max(1e7),
  stone_weight_g: z.number().nonnegative().max(1e7).optional(),
  acquired_via: z.enum(['PURCHASE', 'GIFT', 'INHERITANCE', 'OTHER']).optional(),
  purchase_date: date.nullable().optional(),
  purchase_rate_per_g: money.nullable().optional(),
  metal_cost: money.nullable().optional(),
  making_charge_type: z.enum(['PER_GRAM', 'PERCENT', 'FLAT']).nullable().optional(),
  making_charge_value: money.nullable().optional(),
  making_charges: money.optional(),
  wastage_percent: z.number().min(0).max(100).nullable().optional(),
  stone_charges: money.optional(),
  gst_amount: money.optional(),
  other_charges: money.optional(),
  total_cost: money.nullable().optional(),
  seller_name: z.string().max(255).nullable().optional(),
  invoice_number: z.string().max(100).nullable().optional(),
  hallmarked: z.boolean().optional(),
  huid: z.string().max(20).nullable().optional(),
  storage_location: z.enum(['HOME', 'BANK_LOCKER', 'JEWELLER', 'FAMILY', 'OTHER']).optional(),
  storage_details: z.string().max(255).nullable().optional(),
  insured: z.boolean().optional(),
  insurance_details: z.string().max(255).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  owner_user_id: z.string().uuid().optional(),
};
const createSchema = z.object(itemShape);
const updateSchema = z.object(itemShape).partial();
const sellSchema = z.object({ sale_date: date, sale_amount: money, sale_notes: z.string().max(255).optional() });
const ratesSchema = z.object({
  date: date.optional(),
  rates: z.array(z.object({ metal: z.enum(METALS), rate_per_gram: z.number().positive().max(1e8), note: z.string().max(255).optional() })).min(1).max(4),
});

const wrap = (fn: (req: Request) => Promise<any>, status = 200) => async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

router.get('/meta', wrap(async () => PreciousMetalsService.meta()));
router.get('/summary', wrap(async (req) => PreciousMetalsService.summary(getHouseholdId(req), req.query.owner ? String(req.query.owner) : undefined)));
router.get('/rates', wrap(async (req) => PreciousMetalsService.rates(getHouseholdId(req), parseInt(String(req.query.days)) || 90)));
router.post('/rates', validate({ body: ratesSchema }), wrap(async (req) => PreciousMetalsService.setRates(getHouseholdId(req), req.user!.id, req.body.rates, req.body.date)));

router.get('/items', wrap(async (req) => PreciousMetalsService.list(getHouseholdId(req), {
  status: req.query.status ? String(req.query.status).toUpperCase() : undefined, metal: req.query.metal ? String(req.query.metal).toUpperCase() : undefined,
  form: req.query.form ? String(req.query.form).toUpperCase() : undefined, owner: req.query.owner ? String(req.query.owner) : undefined,
})));
router.post('/items', validate({ body: createSchema }), wrap(async (req) => PreciousMetalsService.create(getHouseholdId(req), req.user!.id, req.body), 201));
router.get('/items/:id', wrap(async (req) => PreciousMetalsService.get(getHouseholdId(req), getParam(req, 'id'))));
router.patch('/items/:id', validate({ body: updateSchema }), wrap(async (req) => PreciousMetalsService.update(getHouseholdId(req), req.user!.id, getParam(req, 'id'), req.body)));
router.post('/items/:id/sell', validate({ body: sellSchema }), wrap(async (req) => PreciousMetalsService.sell(getHouseholdId(req), req.user!.id, getParam(req, 'id'), req.body)));
router.post('/items/:id/reopen', wrap(async (req) => PreciousMetalsService.reopen(getHouseholdId(req), req.user!.id, getParam(req, 'id'))));
router.delete('/items/:id', wrap(async (req) => { await PreciousMetalsService.remove(getHouseholdId(req), req.user!.id, getParam(req, 'id')); return { deleted: true }; }));

export const preciousMetalsRoutes = router;
