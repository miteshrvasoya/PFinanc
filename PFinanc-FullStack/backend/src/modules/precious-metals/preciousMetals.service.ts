import { QueryHelper } from '../../database/queryHelper.js';
import { assertHouseholdMember } from '../../middleware/rbac.js';
import { logAudit } from '../../utils/audit.js';
import { toLocalDateString } from '../../utils/date.js';
import {
  FORMS, ITEM_TYPES, METALS, Metal, PURITY_PRESETS, metalValue, netWeight, purityLabel, sumCost, valuate,
} from './valuation.js';

export function httpError(status: number, code: string, message: string) {
  return Object.assign(new Error(message), { status, code });
}

const RATE_STALE_DAYS = 7;
const num = (v: any) => (v === null || v === undefined ? null : Number(v));
const r2 = (n: number) => Math.round(n * 100) / 100;

const ITEM_SELECT = `
  SELECT i.id, i.household_id, i.owner_user_id, u.name AS owner_name, i.name, i.metal, i.form, i.item_type, i.purity_label,
    CAST(i.fineness AS FLOAT) AS fineness, i.pieces,
    CAST(i.gross_weight_g AS FLOAT) AS gross_weight_g, CAST(i.stone_weight_g AS FLOAT) AS stone_weight_g, CAST(i.net_weight_g AS FLOAT) AS net_weight_g,
    i.acquired_via, to_char(i.purchase_date, 'YYYY-MM-DD') AS purchase_date, CAST(i.purchase_rate_per_g AS FLOAT) AS purchase_rate_per_g,
    CAST(i.metal_cost AS FLOAT) AS metal_cost, i.making_charge_type, CAST(i.making_charge_value AS FLOAT) AS making_charge_value,
    CAST(i.making_charges AS FLOAT) AS making_charges, CAST(i.wastage_percent AS FLOAT) AS wastage_percent,
    CAST(i.stone_charges AS FLOAT) AS stone_charges, CAST(i.gst_amount AS FLOAT) AS gst_amount, CAST(i.other_charges AS FLOAT) AS other_charges,
    CAST(i.total_cost AS FLOAT) AS total_cost, i.seller_name, i.invoice_number, i.hallmarked, i.huid,
    i.storage_location, i.storage_details, i.insured, i.insurance_details, i.notes, i.status,
    to_char(i.sale_date, 'YYYY-MM-DD') AS sale_date, CAST(i.sale_amount AS FLOAT) AS sale_amount, i.sale_notes, i.created_at, i.updated_at
  FROM precious_metal_items i JOIN users u ON u.id = i.owner_user_id`;

export type RateMap = Partial<Record<Metal, { rate_per_gram: number; rate_date: string }>>;

export class PreciousMetalsService {
  // ── Rates ──────────────────────────────────────────────────────────────────

  static async latestRates(householdId: string): Promise<RateMap> {
    const rows = await QueryHelper.query<{ metal: Metal; rate_per_gram: number; rate_date: string }>(
      `SELECT DISTINCT ON (metal) metal, CAST(rate_per_gram AS FLOAT) AS rate_per_gram, to_char(rate_date, 'YYYY-MM-DD') AS rate_date
       FROM precious_metal_rates WHERE household_id = $1 ORDER BY metal, rate_date DESC`, [householdId]
    );
    return Object.fromEntries(rows.map((r) => [r.metal, { rate_per_gram: r.rate_per_gram, rate_date: r.rate_date }]));
  }

  static async rates(householdId: string, days = 90) {
    const latest = await this.latestRates(householdId);
    const history = await QueryHelper.query<any>(
      `SELECT metal, CAST(rate_per_gram AS FLOAT) AS rate_per_gram, to_char(rate_date, 'YYYY-MM-DD') AS rate_date, note
       FROM precious_metal_rates WHERE household_id = $1 AND rate_date >= CURRENT_DATE - $2::int ORDER BY rate_date DESC, metal`, [householdId, Math.min(Math.max(days, 1), 1000)]
    );
    const today = toLocalDateString();
    const stale = (d: string) => (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`)) / 86_400_000 > RATE_STALE_DAYS;
    return {
      latest: Object.fromEntries(METALS.map((m) => [m, latest[m] ? { ...latest[m], stale: stale(latest[m]!.rate_date) } : null])),
      history,
      note: 'Rates are per gram of 999 purity. They are entered by you; no live price feed is connected.',
    };
  }

  static async setRates(householdId: string, userId: string, entries: Array<{ metal: Metal; rate_per_gram: number; note?: string }>, date?: string) {
    const rateDate = date || toLocalDateString();
    if (Date.parse(`${rateDate}T00:00:00Z`) > Date.now() + 86_400_000) throw httpError(400, 'FUTURE_DATE', 'A rate cannot be dated in the future.');
    for (const e of entries) {
      await QueryHelper.query(
        `INSERT INTO precious_metal_rates (household_id, metal, rate_per_gram, rate_date, note, created_by) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (household_id, metal, rate_date) DO UPDATE SET rate_per_gram = EXCLUDED.rate_per_gram, note = EXCLUDED.note, created_by = EXCLUDED.created_by`,
        [householdId, e.metal, e.rate_per_gram, rateDate, e.note ?? null, userId]
      );
    }
    await logAudit(householdId, userId, 'METAL_RATE', householdId, 'UPDATE', null, { date: rateDate, entries });
    return this.rates(householdId);
  }

  // ── Items ──────────────────────────────────────────────────────────────────

  private static shape(row: any, rates: RateMap) {
    const rate = rates[row.metal as Metal]?.rate_per_gram ?? null;
    const v = valuate({ netWeightG: row.net_weight_g, fineness: row.fineness, totalCost: row.total_cost, metalCost: row.metal_cost, status: row.status, saleAmount: row.sale_amount }, rate);
    return {
      ...row,
      valuation: {
        pure_weight_g: v.pureWeightG, rate_per_gram: v.ratePerGram, rate_date: rates[row.metal as Metal]?.rate_date ?? null, current_value: v.currentValue,
        unrealized_pnl: v.unrealizedPnl, unrealized_pnl_pct: v.unrealizedPnlPct, metal_pnl: v.metalPnl, premium_paid: v.premiumPaid,
        realized_pnl: v.realizedPnl, realized_pnl_pct: v.realizedPnlPct, rate_missing: row.status === 'HELD' && rate === null,
      },
    };
  }

  static async list(householdId: string, f: { status?: string; metal?: string; form?: string; owner?: string } = {}) {
    const where = ['i.household_id = $1']; const params: any[] = [householdId];
    const add = (sql: string, v: any) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
    if (f.status) add('i.status = ?', f.status);
    if (f.metal) add('i.metal = ?', f.metal);
    if (f.form) add('i.form = ?', f.form);
    if (f.owner) add('i.owner_user_id = ?', f.owner);
    const [rows, rates] = await Promise.all([
      QueryHelper.query<any>(`${ITEM_SELECT} WHERE ${where.join(' AND ')} ORDER BY i.status ASC, i.purchase_date DESC NULLS LAST, i.created_at DESC`, params),
      this.latestRates(householdId),
    ]);
    return rows.map((r) => this.shape(r, rates));
  }

  static async get(householdId: string, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw httpError(404, 'NOT_FOUND', 'Item not found.');
    const row = await QueryHelper.queryOne<any>(`${ITEM_SELECT} WHERE i.id = $1 AND i.household_id = $2`, [id, householdId]);
    if (!row) throw httpError(404, 'NOT_FOUND', 'Item not found.');
    return this.shape(row, await this.latestRates(householdId));
  }

  /** Validate and derive the stored columns (net weight, purity label, metal cost, total cost) from what the client sent. */
  private static normalize(input: any, existing?: any) {
    const d = { ...(existing ?? {}), ...input };
    const metal = d.metal as Metal;
    if (!METALS.includes(metal)) throw httpError(400, 'INVALID_METAL', 'Metal must be GOLD, SILVER, PLATINUM or PALLADIUM.');
    if (!FORMS.includes(d.form)) throw httpError(400, 'INVALID_FORM', 'Form must be RAW or JEWELLERY.');
    if (!ITEM_TYPES[d.form as 'RAW' | 'JEWELLERY'].includes(d.item_type ?? 'OTHER')) throw httpError(400, 'INVALID_ITEM_TYPE', `"${d.item_type}" is not a valid ${d.form.toLowerCase()} type.`);
    if (d.form === 'RAW' && Number(d.stone_weight_g || 0) > 0) throw httpError(400, 'INVALID_STONE', 'Raw metal has no stone weight. Use jewellery for pieces with stones.');
    const gross = Number(d.gross_weight_g), stone = Number(d.stone_weight_g || 0);
    if (!(gross > 0)) throw httpError(400, 'INVALID_WEIGHT', 'Weight must be above zero.');
    if (stone >= gross) throw httpError(400, 'INVALID_STONE', 'Stone weight must be less than the gross weight.');
    const net = netWeight(gross, stone);
    const fineness = Number(d.fineness);
    if (!(fineness >= 100 && fineness <= 1000)) throw httpError(400, 'INVALID_PURITY', 'Purity (fineness) must be between 100 and 1000.');

    let metalCost = num(d.metal_cost);
    if (metalCost === null && num(d.purchase_rate_per_g) !== null) metalCost = metalValue(net, fineness, Number(d.purchase_rate_per_g));
    const parts = { metalCost, makingCharges: Number(d.making_charges || 0), stoneCharges: Number(d.stone_charges || 0), gstAmount: Number(d.gst_amount || 0), otherCharges: Number(d.other_charges || 0) };
    const componentsGiven = metalCost !== null || parts.makingCharges + parts.stoneCharges + parts.gstAmount + parts.otherCharges > 0;
    const COST_KEYS = ['total_cost', 'metal_cost', 'purchase_rate_per_g', 'making_charges', 'stone_charges', 'gst_amount', 'other_charges'];
    const costTouched = !existing || COST_KEYS.some((k) => input[k] !== undefined);
    // Untouched cost fields keep the saved total; otherwise an explicit total wins, else the parts are summed.
    let total = !costTouched ? Number(existing.total_cost) : num(input.total_cost) !== null ? Number(input.total_cost) : componentsGiven ? sumCost(parts) : 0;
    if (d.purchase_date && Date.parse(`${d.purchase_date}T00:00:00Z`) > Date.now() + 86_400_000) throw httpError(400, 'FUTURE_DATE', 'Purchase date cannot be in the future.');
    if (d.huid && !/^[A-Z0-9]{6}$/i.test(d.huid)) throw httpError(400, 'INVALID_HUID', 'A BIS HUID is 6 letters and digits.');

    return {
      name: String(d.name).trim(), metal, form: d.form, item_type: d.item_type ?? 'OTHER', purity_label: d.purity_label || purityLabel(metal, fineness), fineness,
      pieces: Number(d.pieces || 1), gross_weight_g: gross, stone_weight_g: stone, net_weight_g: net,
      acquired_via: d.acquired_via ?? 'PURCHASE', purchase_date: d.purchase_date ?? null, purchase_rate_per_g: num(d.purchase_rate_per_g), metal_cost: metalCost,
      making_charge_type: d.making_charge_type ?? null, making_charge_value: num(d.making_charge_value), making_charges: parts.makingCharges,
      wastage_percent: num(d.wastage_percent), stone_charges: parts.stoneCharges, gst_amount: parts.gstAmount, other_charges: parts.otherCharges, total_cost: r2(total),
      seller_name: d.seller_name || null, invoice_number: d.invoice_number || null, hallmarked: !!d.hallmarked, huid: d.huid ? String(d.huid).toUpperCase() : null,
      storage_location: d.storage_location ?? 'HOME', storage_details: d.storage_details || null, insured: !!d.insured, insurance_details: d.insurance_details || null,
      notes: d.notes || null,
    };
  }

  static async create(householdId: string, userId: string, input: any) {
    const ownerId = input.owner_user_id || userId;
    await assertHouseholdMember(ownerId, householdId);
    const data = this.normalize(input);
    const row = await QueryHelper.insert('precious_metal_items', { ...data, household_id: householdId, owner_user_id: ownerId, created_by: userId });
    await logAudit(householdId, userId, 'METAL_ITEM', row.id, 'CREATE', null, data);
    return this.get(householdId, row.id);
  }

  static async update(householdId: string, userId: string, id: string, input: any) {
    const existing = await this.get(householdId, id);
    if (existing.status === 'SOLD') throw httpError(400, 'ITEM_SOLD', 'This item is marked sold. Reopen it to edit.');
    if (input.owner_user_id) await assertHouseholdMember(input.owner_user_id, householdId);
    const data = this.normalize(input, existing);
    await QueryHelper.update('precious_metal_items', id, { ...data, ...(input.owner_user_id ? { owner_user_id: input.owner_user_id } : {}) }, 'household_id = $1', [householdId]);
    await logAudit(householdId, userId, 'METAL_ITEM', id, 'UPDATE', existing, data);
    return this.get(householdId, id);
  }

  static async sell(householdId: string, userId: string, id: string, body: { sale_date: string; sale_amount: number; sale_notes?: string }) {
    const item = await this.get(householdId, id);
    if (item.status === 'SOLD') throw httpError(400, 'ALREADY_SOLD', 'This item is already marked sold.');
    if (Date.parse(`${body.sale_date}T00:00:00Z`) > Date.now() + 86_400_000) throw httpError(400, 'FUTURE_DATE', 'Sale date cannot be in the future.');
    if (item.purchase_date && body.sale_date < item.purchase_date) throw httpError(400, 'INVALID_DATE', 'Sale date cannot be before the purchase date.');
    await QueryHelper.update('precious_metal_items', id, { status: 'SOLD', sale_date: body.sale_date, sale_amount: body.sale_amount, sale_notes: body.sale_notes ?? null }, 'household_id = $1', [householdId]);
    await logAudit(householdId, userId, 'METAL_ITEM', id, 'UPDATE', { status: 'HELD' }, { status: 'SOLD', ...body });
    return this.get(householdId, id);
  }

  static async reopen(householdId: string, userId: string, id: string) {
    const item = await this.get(householdId, id);
    if (item.status !== 'SOLD') throw httpError(400, 'NOT_SOLD', 'This item is not marked sold.');
    await QueryHelper.update('precious_metal_items', id, { status: 'HELD', sale_date: null, sale_amount: null, sale_notes: null }, 'household_id = $1', [householdId]);
    await logAudit(householdId, userId, 'METAL_ITEM', id, 'UPDATE', { status: 'SOLD' }, { status: 'HELD' });
    return this.get(householdId, id);
  }

  static async remove(householdId: string, userId: string, id: string) {
    const item = await this.get(householdId, id);
    await QueryHelper.query(`DELETE FROM precious_metal_items WHERE id = $1 AND household_id = $2`, [id, householdId]);
    await logAudit(householdId, userId, 'METAL_ITEM', id, 'DELETE', item, null);
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  static async summary(householdId: string, ownerId?: string) {
    const [items, ratesInfo] = await Promise.all([this.list(householdId, { owner: ownerId }), this.rates(householdId, 30)]);
    const held = items.filter((i) => i.status === 'HELD');
    const sold = items.filter((i) => i.status === 'SOLD');
    const blank = () => ({ count: 0, net_weight_g: 0, pure_weight_g: 0, total_cost: 0, current_value: 0, pnl: 0, unvalued_count: 0, unvalued_cost: 0 });
    const byMetal: Record<string, ReturnType<typeof blank>> = {};
    const byForm: Record<string, ReturnType<typeof blank>> = {};
    const total = blank();
    for (const i of held) {
      for (const bucket of [(byMetal[i.metal] ||= blank()), (byForm[i.form] ||= blank()), total]) {
        bucket.count += 1; bucket.net_weight_g += i.net_weight_g; bucket.pure_weight_g += i.valuation.pure_weight_g; bucket.total_cost += i.total_cost;
        if (i.valuation.current_value === null) { bucket.unvalued_count += 1; bucket.unvalued_cost += i.total_cost; }
        else { bucket.current_value += i.valuation.current_value; bucket.pnl += i.valuation.unrealized_pnl ?? 0; }
      }
    }
    const fix = (b: ReturnType<typeof blank>) => ({ ...b, net_weight_g: Math.round(b.net_weight_g * 1000) / 1000, pure_weight_g: Math.round(b.pure_weight_g * 1000) / 1000, total_cost: r2(b.total_cost), current_value: r2(b.current_value), pnl: r2(b.pnl), unvalued_cost: r2(b.unvalued_cost) });
    const realized = sold.reduce((s, i) => s + (i.valuation.realized_pnl ?? 0), 0);
    const warnings: string[] = [];
    const missing = METALS.filter((m) => held.some((i) => i.metal === m) && !ratesInfo.latest[m]);
    if (missing.length) warnings.push(`No rate entered for ${missing.join(', ')}. Those items are not valued.`);
    const stale = METALS.filter((m) => ratesInfo.latest[m]?.stale && held.some((i) => i.metal === m));
    if (stale.length) warnings.push(`The ${stale.join(', ')} rate is more than ${RATE_STALE_DAYS} days old. Update it for an accurate value.`);
    return {
      total: { ...fix(total), pnl_pct: total.total_cost > 0 && total.unvalued_count === 0 ? r2((total.pnl / total.total_cost) * 100) : null },
      by_metal: Object.fromEntries(Object.entries(byMetal).map(([k, v]) => [k, fix(v)])),
      by_form: Object.fromEntries(Object.entries(byForm).map(([k, v]) => [k, fix(v)])),
      realized: { count: sold.length, pnl: r2(realized), proceeds: r2(sold.reduce((s, i) => s + (i.sale_amount ?? 0), 0)) },
      rates: ratesInfo.latest, warnings,
      insured_value: r2(held.filter((i) => i.insured).reduce((s, i) => s + (i.valuation.current_value ?? 0), 0)),
      at_home_value: r2(held.filter((i) => i.storage_location === 'HOME').reduce((s, i) => s + (i.valuation.current_value ?? 0), 0)),
    };
  }

  /** Totals for the main portfolio summary. Items with no rate yet count at cost so net worth never drops them silently. */
  static async portfolioTotals(householdId: string, ownerId?: string) {
    const s = await this.summary(householdId, ownerId);
    const by_metal: Record<string, number> = {};
    for (const [metal, b] of Object.entries(s.by_metal)) by_metal[metal] = r2(b.current_value + b.unvalued_cost);
    return { invested: s.total.total_cost, value: r2(s.total.current_value + s.total.unvalued_cost), count: s.total.count, by_metal, unvalued_count: s.total.unvalued_count };
  }

  static meta() {
    return { metals: METALS, forms: FORMS, item_types: ITEM_TYPES, purity_presets: PURITY_PRESETS,
      storage_locations: ['HOME', 'BANK_LOCKER', 'JEWELLER', 'FAMILY', 'OTHER'], acquired_via: ['PURCHASE', 'GIFT', 'INHERITANCE', 'OTHER'], making_charge_types: ['PER_GRAM', 'PERCENT', 'FLAT'] };
  }
}
