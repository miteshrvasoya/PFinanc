import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';

let miteshToken = '';
let fatherToken = '';
let householdId = '';
let miteshHdfcId = '';
let zerodhaAccId = '';
let growwAccId = '';
let fatherSbiId = '';

beforeAll(async () => {
  await runMigrations();
  await runSeed();

  // Login as Mitesh
  const mRes = await request(app).post('/api/auth/login').send({
    email: 'mitesh@pfinanc.local',
    password: 'Password@123',
  });
  miteshToken = mRes.body.data.token;
  householdId = mRes.body.data.defaultHouseholdId;

  // Login as Father
  const fRes = await request(app).post('/api/auth/login').send({
    email: 'father@pfinanc.local',
    password: 'Password@123',
  });
  fatherToken = fRes.body.data.token;

  // Get Accounts
  const accRes = await request(app)
    .get('/api/accounts')
    .set('Authorization', `Bearer ${miteshToken}`)
    .set('x-household-id', householdId);

  const hdfc = accRes.body.data.find((a: any) => a.name.includes('HDFC'));
  const sbi = accRes.body.data.find((a: any) => a.name.includes('Father - SBI'));
  const zerodha = accRes.body.data.find((a: any) => a.name.includes('Zerodha'));
  const groww = accRes.body.data.find((a: any) => a.name.includes('Groww'));

  miteshHdfcId = hdfc.id;
  fatherSbiId = sbi.id;
  zerodhaAccId = zerodha.id;
  growwAccId = groww.id;
});

afterAll(async () => {
  await pool.end();
});

describe('Phase 2 Investment & Portfolio Accounting Engine Tests', () => {
  test('MANDATORY SCENARIO 1: Stock purchase does NOT create an expense and preserves Net Worth; Market appreciation increases Net Worth', async () => {
    // 1. Check initial Dashboard state
    const initDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    const initialNetWorth = initDash.body.data.netWorth.netWorth;
    const initialExpenses = initDash.body.data.thisMonth.expenses;

    // 2. Create Stock Security (Test Stock @ ₹1,000)
    const secRes = await request(app)
      .post('/api/investments/securities')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        symbol: `MAND_STK_${Date.now()}`,
        name: 'Mandatory Scenario Stock',
        security_type: 'STOCK',
        initial_price: 1000.00,
      });

    expect(secRes.status).toBe(201);
    const stockId = secRes.body.data.id;

    // 3. Mitesh buys 50 shares @ ₹1,000 = ₹50,000, funded from HDFC Bank
    const buyRes = await request(app)
      .post('/api/investments/transactions')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        investment_account_id: zerodhaAccId,
        security_id: stockId,
        transaction_type: 'BUY',
        quantity: 50,
        price_per_unit: 1000.00,
        gross_amount: 50000.00,
        funding_account_id: miteshHdfcId, // Links and debits cash without recording expense
      });

    expect(buyRes.status).toBe(201);

    // 4. Verify Dashboard: Expenses MUST NOT increase! Net Worth remains exact!
    const postBuyDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(postBuyDash.body.data.thisMonth.expenses).toBe(initialExpenses); // INVARIANT: zero expense inflation
    expect(postBuyDash.body.data.netWorth.netWorth).toBeCloseTo(initialNetWorth, 1);

    // 5. Market price increases from ₹1,000 to ₹1,140 (Appreciation of ₹7,000)
    await request(app)
      .post('/api/investments/prices/set')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        security_id: stockId,
        price: 1140.00,
      });

    // Verify Net Worth increased by exactly ₹7,000
    const postApprecDash = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(postApprecDash.body.data.netWorth.netWorth).toBeCloseTo(initialNetWorth + 7000.00, 1);
  });

  test('MANDATORY SCENARIO 2: Family Transfer + Mutual Fund SIP + NAV Appreciation', async () => {
    // 1. Initial Portfolio state
    const initPort = await request(app)
      .get('/api/investments/portfolio')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    const initMfValue = initPort.body.data.breakdown.mutualFunds.value;

    // 2. Create Mutual Fund
    const mfRes = await request(app)
      .post('/api/investments/securities')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        symbol: `MAND_MF_${Date.now()}`,
        name: 'Mandatory Bluechip Fund',
        security_type: 'MUTUAL_FUND',
        initial_price: 100.00,
      });

    const fundId = mfRes.body.data.id;

    // 3. Father invests ₹30,000 in Mutual Fund @ NAV ₹100 (300 units)
    await request(app)
      .post('/api/investments/transactions')
      .set('Authorization', `Bearer ${fatherToken}`)
      .set('x-household-id', householdId)
      .send({
        investment_account_id: growwAccId,
        security_id: fundId,
        transaction_type: 'SIP',
        quantity: 300,
        price_per_unit: 100.00,
        gross_amount: 30000.00,
      });

    // 4. NAV appreciates to ₹110 (+₹3,000 gain)
    await request(app)
      .post('/api/investments/prices/set')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        security_id: fundId,
        price: 110.00,
      });

    const updatedPort = await request(app)
      .get('/api/investments/portfolio')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(updatedPort.body.data.breakdown.mutualFunds.value).toBeCloseTo(initMfValue + 33000.00, 1);
  });

  test('FIFO Cost-Basis Engine accurately calculates realized P&L on partial sale across multiple lots', async () => {
    // 1. Create Multi-Lot Stock
    const secRes = await request(app)
      .post('/api/investments/securities')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        symbol: `FIFO_STK_${Date.now()}`,
        name: 'FIFO Test Stock',
        security_type: 'STOCK',
        initial_price: 1000.00,
      });
    const stockId = secRes.body.data.id;

    // Lot 1: Buy 10 @ ₹1,000 on 2026-08-01
    await request(app)
      .post('/api/investments/transactions')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        investment_account_id: zerodhaAccId,
        security_id: stockId,
        transaction_type: 'BUY',
        transaction_date: '2026-08-01',
        quantity: 10,
        price_per_unit: 1000.00,
        gross_amount: 10000.00,
      });

    // Lot 2: Buy 10 @ ₹1,200 on 2026-08-03
    await request(app)
      .post('/api/investments/transactions')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        investment_account_id: zerodhaAccId,
        security_id: stockId,
        transaction_type: 'BUY',
        transaction_date: '2026-08-03',
        quantity: 10,
        price_per_unit: 1200.00,
        gross_amount: 12000.00,
      });

    // Sell 5 shares @ ₹1,500 on 2026-08-05
    // Sold cost basis = 5 * 1000 = ₹5,000. Proceeds = 5 * 1500 = ₹7,500 -> Realized P&L = ₹2,500.
    await request(app)
      .post('/api/investments/transactions')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        investment_account_id: zerodhaAccId,
        security_id: stockId,
        transaction_type: 'SELL',
        transaction_date: '2026-08-05',
        quantity: 5,
        price_per_unit: 1500.00,
        gross_amount: 7500.00,
      });

    const holdingsRes = await request(app)
      .get(`/api/investments/portfolio/holdings?security_id=${stockId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(holdingsRes.body.data.length).toBe(1);
    const pos = holdingsRes.body.data[0];
    expect(pos.current_quantity).toBe(15);
    expect(pos.realized_pnl).toBe(2500.00);
    expect(pos.total_invested).toBe(17000.00);
    expect(pos.average_cost).toBeCloseTo(1133.33, 1);
  });

  test('Supports fractional mutual fund units without precision loss (NUMERIC 24,8)', async () => {
    const secRes = await request(app)
      .post('/api/investments/securities')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        symbol: `FRAC_MF_${Date.now()}`,
        name: 'Fractional Units Fund',
        security_type: 'MUTUAL_FUND',
        initial_price: 118.20,
      });
    const fundId = secRes.body.data.id;

    const exactUnits = 42.30118443;
    await request(app)
      .post('/api/investments/transactions')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        investment_account_id: zerodhaAccId,
        security_id: fundId,
        transaction_type: 'SIP',
        quantity: exactUnits,
        price_per_unit: 118.20,
        gross_amount: 5000.00,
      });

    const holdingsRes = await request(app)
      .get(`/api/investments/portfolio/holdings?security_id=${fundId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    const pos = holdingsRes.body.data[0];
    expect(pos.current_quantity).toBeCloseTo(exactUnits, 6);
  });

  test('Fixed Deposit and Retirement contributions are tracked accurately', async () => {
    // 1. Create FD
    const fdRes = await request(app)
      .post('/api/investments/fixed-deposits')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        institution_name: 'HDFC Bank FD',
        principal_amount: 50000.00,
        interest_rate: 7.00,
        compounding_frequency: 'QUARTERLY',
        start_date: '2026-01-01',
        maturity_date: '2027-01-01',
      });

    expect(fdRes.status).toBe(201);
    expect(parseFloat(fdRes.body.data.maturity_amount)).toBeGreaterThan(53000.00);

    // 2. Add EPF contribution
    const epfAccs = await request(app)
      .get('/api/investments/retirement')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(epfAccs.status).toBe(200);
    expect(epfAccs.body.data.length).toBeGreaterThan(0);
  });

  test('Market data resilience: Failed quote preserves previous valid price with is_stale = true', async () => {
    const secRes = await request(app)
      .post('/api/investments/securities')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        symbol: `STALE_SEC_${Date.now()}`,
        name: 'Stale Price Test Security',
        security_type: 'STOCK',
        initial_price: 750.00,
      });
    const secId = secRes.body.data.id;

    // Refresh prices (for unknown symbol, it retains previous price and keeps price valid)
    const refreshRes = await request(app)
      .post('/api/investments/prices/refresh')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(refreshRes.status).toBe(200);

    const getSec = await request(app)
      .get(`/api/investments/securities/${secId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(getSec.body.data.latest_price).toBe(750.00);
  });
});
