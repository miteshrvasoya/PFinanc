import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { makingChargeAmount, metalValue, netWeight, pureWeight, purityLabel, sumCost, valuate } from '../src/modules/precious-metals/valuation.js';

describe('valuation maths', () => {
  it('derives net and pure weight', () => {
    expect(netWeight(10.5, 0.5)).toBe(10);
    expect(netWeight(5, 9)).toBe(0);
    expect(pureWeight(10, 916)).toBe(9.16);
    expect(pureWeight(100, 925)).toBe(92.5);
  });
  it('values by fineness against the 999 reference rate', () => {
    expect(metalValue(10, 999, 7000)).toBe(70000);
    expect(metalValue(10, 916, 7000)).toBe(64184.18);   // 10 x 916/999 x 7000
    expect(metalValue(10, 1000, 7000)).toBe(70000);     // never above the reference rate
    expect(metalValue(100, 925, 90)).toBe(8333.33);
  });
  it('labels purity', () => {
    expect(purityLabel('GOLD', 916)).toBe('22K');
    expect(purityLabel('SILVER', 925)).toBe('925 Sterling');
    expect(purityLabel('GOLD', 900)).toBe('900 fineness');
  });
  it('computes making charges for each method', () => {
    expect(makingChargeAmount('PER_GRAM', 450, 10, 70000)).toBe(4500);
    expect(makingChargeAmount('PERCENT', 12, 10, 70000)).toBe(8400);
    expect(makingChargeAmount('FLAT', 3000, 10, 70000)).toBe(3000);
    expect(sumCost({ metalCost: 70000, makingCharges: 8400, gstAmount: 2352, stoneCharges: 0 })).toBe(80752);
  });
  it('splits P&L into total and metal-only, and handles missing rates and sales', () => {
    const base = { netWeightG: 10, fineness: 999, totalCost: 80000, metalCost: 70000, status: 'HELD' as const, saleAmount: null };
    const v = valuate(base, 7500);
    expect(v.currentValue).toBe(75000);
    expect(v.unrealizedPnl).toBe(-5000);          // making charges and GST are not recovered
    expect(v.metalPnl).toBe(5000);                // the metal itself gained
    expect(v.premiumPaid).toBe(5000);
    expect(valuate(base, null).currentValue).toBeNull();
    const sold = valuate({ ...base, status: 'SOLD', saleAmount: 78000 }, 7500);
    expect(sold.realizedPnl).toBe(-2000);
    expect(sold.currentValue).toBeNull();
  });
});

let jwt = '', householdId = '', userId = '', strangerJwt = '', strangerHousehold = '';
const auth = (t = jwt, h = householdId) => ({ Authorization: `Bearer ${t}`, 'x-household-id': h });
const api = (m: 'get' | 'post' | 'patch' | 'delete', url: string, body?: any, t = jwt, h = householdId) => {
  const r = (request(app) as any)[m](`/api/precious-metals${url}`).set(auth(t, h));
  return body ? r.send(body) : r;
};

const ring = { name: 'Wedding ring', metal: 'GOLD', form: 'JEWELLERY', item_type: 'RING', fineness: 916, gross_weight_g: 10.5, stone_weight_g: 0.5, purchase_date: '2024-02-10', purchase_rate_per_g: 6000, making_charges: 4000, gst_amount: 1800, hallmarked: true, huid: 'AB12CD', storage_location: 'BANK_LOCKER', insured: true };
const bar = { name: '50g bar', metal: 'GOLD', form: 'RAW', item_type: 'BAR', fineness: 999, gross_weight_g: 50, purchase_date: '2023-05-01', purchase_rate_per_g: 5500, gst_amount: 8250 };
const coins = { name: 'Silver coins', metal: 'SILVER', form: 'RAW', item_type: 'COIN', fineness: 999, gross_weight_g: 200, pieces: 20, total_cost: 14000 };

beforeAll(async () => {
  await runMigrations();
  await runSeed();
  const reg = await request(app).post('/api/auth/register').send({ email: `pm_${Date.now()}@test.local`, password: 'Password@123', name: 'Metals Tester' });
  jwt = reg.body.data.token; householdId = reg.body.data.defaultHouseholdId; userId = reg.body.data.user.id;
  const s = await request(app).post('/api/auth/register').send({ email: `pm2_${Date.now()}@test.local`, password: 'Password@123', name: 'Stranger' });
  strangerJwt = s.body.data.token; strangerHousehold = s.body.data.defaultHouseholdId;
});

describe('items', () => {
  let ringId = '', barId = '', coinId = '';

  it('creates jewellery with derived net weight, metal cost, total cost and purity label', async () => {
    const res = await api('post', '/items', ring);
    expect(res.status).toBe(201);
    const d = res.body.data; ringId = d.id;
    expect(d.net_weight_g).toBe(10);
    expect(d.purity_label).toBe('22K');
    expect(d.metal_cost).toBe(55015.02);                    // 10 x 916/999 x 6000
    expect(d.total_cost).toBe(60815.02);                    // metal + making + GST
    expect(d.valuation.pure_weight_g).toBe(9.16);
    expect(d.valuation.current_value).toBeNull();            // no rate yet
    expect(d.valuation.rate_missing).toBe(true);
    expect(d.huid).toBe('AB12CD');
    expect(d.owner_name).toBe('Metals Tester');
  });

  it('creates raw gold and silver, with an explicit total taking precedence', async () => {
    const b = await api('post', '/items', bar);
    barId = b.body.data.id;
    expect(b.body.data.total_cost).toBe(283250);            // 50 x 5500 + GST 8250
    const c = await api('post', '/items', coins);
    coinId = c.body.data.id;
    expect(c.body.data.total_cost).toBe(14000);
    expect(c.body.data.pieces).toBe(20);
  });

  it('rejects invalid input', async () => {
    const bad = async (over: any, code?: string) => {
      const r = await api('post', '/items', { ...ring, ...over });
      expect(r.status).toBe(400);
      if (code) expect(r.body.error.code).toBe(code);
    };
    await bad({ gross_weight_g: 0 });
    await bad({ stone_weight_g: 10.5 }, 'INVALID_STONE');
    await bad({ form: 'RAW', item_type: 'BAR' }, 'INVALID_STONE');          // raw metal cannot have stones
    await bad({ item_type: 'BAR' }, 'INVALID_ITEM_TYPE');                    // a bar is not jewellery
    await bad({ fineness: 50 });
    await bad({ metal: 'COPPER' });
    await bad({ huid: 'BAD' }, 'INVALID_HUID');
    await bad({ purchase_date: '2999-01-01' }, 'FUTURE_DATE');
    await bad({ owner_user_id: '00000000-0000-0000-0000-000000000000' }, 'INVALID_OWNER');
  });

  it('values holdings once rates are entered', async () => {
    const set = await api('post', '/rates', { rates: [{ metal: 'GOLD', rate_per_gram: 7000 }, { metal: 'SILVER', rate_per_gram: 90 }] });
    expect(set.status).toBe(200);
    expect(set.body.data.latest.GOLD.rate_per_gram).toBe(7000);
    expect(set.body.data.latest.PLATINUM).toBeNull();
    const r = (await api('get', `/items/${ringId}`)).body.data;
    expect(r.valuation.current_value).toBe(64184.18);        // 10 x 916/999 x 7000
    expect(r.valuation.unrealized_pnl).toBe(3369.16);
    expect(r.valuation.metal_pnl).toBe(9169.16);             // metal gained even though making + GST are sunk
    expect(r.valuation.rate_missing).toBe(false);
    const b = (await api('get', `/items/${barId}`)).body.data;
    expect(b.valuation.current_value).toBe(350000);
  });

  it('summarises by metal and form, flags missing rates and counts storage', async () => {
    const s = (await api('get', '/summary')).body.data;
    expect(s.total.count).toBe(3);
    expect(s.by_metal.GOLD.count).toBe(2);
    expect(s.by_metal.GOLD.net_weight_g).toBe(60);
    expect(s.by_metal.SILVER.current_value).toBe(18000);
    expect(s.by_form.JEWELLERY.count).toBe(1);
    expect(s.by_form.RAW.count).toBe(2);
    expect(s.insured_value).toBe(64184.18);
    expect(s.at_home_value).toBe(368000);                    // bar + coins are at home
    expect(s.total.current_value).toBe(432184.18);
    expect(s.warnings).toEqual([]);
  });

  it('updates an item and keeps the saved cost when cost fields are untouched', async () => {
    const r = await api('patch', `/items/${coinId}`, { gross_weight_g: 250, notes: 'Added five coins' });
    expect(r.status).toBe(200);
    expect(r.body.data.net_weight_g).toBe(250);
    expect(r.body.data.total_cost).toBe(14000);
    const r2 = await api('patch', `/items/${ringId}`, { making_charges: 5000 });
    expect(r2.body.data.total_cost).toBe(61815.02);          // parts re-summed
  });

  it('includes metals in the portfolio summary', async () => {
    const p = (await request(app).get('/api/investments/portfolio').set(auth())).body.data;
    expect(p.breakdown.preciousMetals.count).toBe(3);
    expect(p.breakdown.preciousMetals.value).toBeGreaterThan(400000);
    expect(p.breakdown.physicalAssets.goldValue).toBe(p.breakdown.preciousMetals.value);
    expect(p.assetAllocation.find((a: any) => a.type === 'GOLD')).toBeTruthy();
  });

  it('marks an item sold with realized P&L, blocks edits, and reopens it', async () => {
    const sale = await api('post', `/items/${coinId}/sell`, { sale_date: '2025-06-01', sale_amount: 20000 });
    expect(sale.status).toBe(200);
    expect(sale.body.data.status).toBe('SOLD');
    expect(sale.body.data.valuation.realized_pnl).toBe(6000);
    expect(sale.body.data.valuation.current_value).toBeNull();
    expect((await api('patch', `/items/${coinId}`, { notes: 'x' })).body.error.code).toBe('ITEM_SOLD');
    expect((await api('post', `/items/${coinId}/sell`, { sale_date: '2025-06-02', sale_amount: 1 })).body.error.code).toBe('ALREADY_SOLD');
    expect((await api('post', `/items/${barId}/sell`, { sale_date: '2020-01-01', sale_amount: 1 })).body.error.code).toBe('INVALID_DATE');
    const s = (await api('get', '/summary')).body.data;
    expect(s.total.count).toBe(2);
    expect(s.realized).toMatchObject({ count: 1, pnl: 6000, proceeds: 20000 });
    const held = (await api('get', '/items?status=HELD')).body.data;
    expect(held.map((i: any) => i.id)).not.toContain(coinId);
    const re = await api('post', `/items/${coinId}/reopen`);
    expect(re.body.data.status).toBe('HELD');
    expect(re.body.data.sale_amount).toBeNull();
  });

  it('filters the list', async () => {
    expect((await api('get', '/items?metal=SILVER')).body.data).toHaveLength(1);
    expect((await api('get', '/items?form=JEWELLERY')).body.data).toHaveLength(1);
    expect((await api('get', `/items?owner=${userId}`)).body.data).toHaveLength(3);
  });

  it('keeps households apart', async () => {
    expect((await api('get', `/items/${ringId}`, undefined, strangerJwt, strangerHousehold)).status).toBe(404);
    expect((await api('patch', `/items/${ringId}`, { notes: 'x' }, strangerJwt, strangerHousehold)).status).toBe(404);
    expect((await api('delete', `/items/${ringId}`, undefined, strangerJwt, strangerHousehold)).status).toBe(404);
    expect((await api('get', '/items', undefined, strangerJwt, householdId)).status).toBe(403);
    expect((await api('get', '/items', undefined, strangerJwt, strangerHousehold)).body.data).toEqual([]);
    expect((await request(app).get('/api/precious-metals/items')).status).toBe(401);
  });

  it('deletes an item and 404s on a bad id', async () => {
    expect((await api('delete', `/items/${coinId}`)).status).toBe(200);
    expect((await api('get', `/items/${coinId}`)).status).toBe(404);
    expect((await api('get', '/items/not-an-id')).status).toBe(404);
  });
});

describe('rates', () => {
  it('upserts a day, keeps history, and flags stale rates in the summary', async () => {
    await api('post', '/rates', { rates: [{ metal: 'GOLD', rate_per_gram: 7100 }] });
    const r = (await api('get', '/rates')).body.data;
    expect(r.latest.GOLD.rate_per_gram).toBe(7100);       // same-day entry replaced
    await api('post', '/rates', { date: '2000-01-01', rates: [{ metal: 'GOLD', rate_per_gram: 1 }] });
    expect((await api('get', '/rates?days=100000')).body.data.history.length).toBeGreaterThanOrEqual(2);
    expect((await api('get', '/rates')).body.data.latest.GOLD.rate_per_gram).toBe(7100);   // newest date wins
    await pool.query(`UPDATE precious_metal_rates SET rate_date = CURRENT_DATE - 20 WHERE household_id=$1 AND metal='GOLD' AND rate_per_gram = 7100`, [householdId]);
    const s = (await api('get', '/summary')).body.data;
    expect(s.warnings.join(' ')).toMatch(/GOLD rate is more than 7 days old/);
  });
  it('rejects bad rates', async () => {
    expect((await api('post', '/rates', { rates: [{ metal: 'GOLD', rate_per_gram: 0 }] })).status).toBe(400);
    expect((await api('post', '/rates', { rates: [] })).status).toBe(400);
    expect((await api('post', '/rates', { date: '2999-01-01', rates: [{ metal: 'GOLD', rate_per_gram: 5 }] })).body.error.code).toBe('FUTURE_DATE');
  });
  it('serves metadata for the forms', async () => {
    const m = (await api('get', '/meta')).body.data;
    expect(m.purity_presets.GOLD.map((p: any) => p.label)).toEqual(expect.arrayContaining(['24K', '22K', '18K']));
    expect(m.item_types.JEWELLERY).toContain('NECKLACE');
  });
});

afterAll(async () => { await pool.end(); });
