import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';

let miteshToken = '';
let fatherToken = '';
let householdId = '';
let miteshHdfcId = '';
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
  miteshHdfcId = hdfc.id;
  fatherSbiId = sbi.id;
});

afterAll(async () => {
  await pool.end();
});

describe('Financial Ledger & Accounting Integrity Tests', () => {
  test('Dashboard computes initial net worth and balances correctly', async () => {
    const res = await request(app)
      .get('/api/dashboard?view=household')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { netWorth, cashPosition } = res.body.data;
    expect(netWorth.netWorth).toBeGreaterThan(0);
    expect(cashPosition.accounts.length).toBeGreaterThanOrEqual(4);
  });

  test('Creating Expense decreases account balance and increases monthly expenses', async () => {
    // 1. Get current balance
    const accBefore = await request(app)
      .get(`/api/accounts/${miteshHdfcId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);
    const balanceBefore = accBefore.body.data.current_balance;

    // 2. Add expense of ₹500
    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        account_id: miteshHdfcId,
        transaction_type: 'EXPENSE',
        amount: 500,
        description: 'Test Coffee Purchase',
        status: 'CONFIRMED',
      });

    expect(txRes.status).toBe(201);

    // 3. Verify new balance
    const accAfter = await request(app)
      .get(`/api/accounts/${miteshHdfcId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);
    expect(accAfter.body.data.current_balance).toBe(balanceBefore - 500);
  });

  test('Family Transfer changes account balances without altering Household Net Worth or inflating Income/Expense', async () => {
    // 1. Get initial metrics
    const dashBefore = await request(app)
      .get('/api/dashboard?view=household')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    const netWorthBefore = dashBefore.body.data.netWorth.netWorth;
    const incomeBefore = dashBefore.body.data.thisMonth.income;
    const expenseBefore = dashBefore.body.data.thisMonth.expenses;

    const miteshAccBefore = await request(app)
      .get(`/api/accounts/${miteshHdfcId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    const fatherAccBefore = await request(app)
      .get(`/api/accounts/${fatherSbiId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    // 2. Perform transfer of ₹5,000 from Mitesh to Father
    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        source_account_id: miteshHdfcId,
        destination_account_id: fatherSbiId,
        amount: 5000,
        description: 'Automated Test Family Support',
        status: 'CONFIRMED',
      });

    expect(transferRes.status).toBe(201);
    expect(transferRes.body.success).toBe(true);

    // 3. Check individual account balance changes
    const miteshAccAfter = await request(app)
      .get(`/api/accounts/${miteshHdfcId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    const fatherAccAfter = await request(app)
      .get(`/api/accounts/${fatherSbiId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(miteshAccAfter.body.data.current_balance).toBe(miteshAccBefore.body.data.current_balance - 5000);
    expect(fatherAccAfter.body.data.current_balance).toBe(fatherAccBefore.body.data.current_balance + 5000);

    // 4. Verify Household Net Worth and Income/Expense invariant
    const dashAfter = await request(app)
      .get('/api/dashboard?view=household')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    expect(dashAfter.body.data.netWorth.netWorth).toBeCloseTo(netWorthBefore, 2);
    expect(dashAfter.body.data.thisMonth.income).toBe(incomeBefore);
    expect(dashAfter.body.data.thisMonth.expenses).toBe(expenseBefore);
  });

  test('Draft and Voided transactions do not impact account balances', async () => {
    const accBefore = await request(app)
      .get(`/api/accounts/${miteshHdfcId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);
    const balanceBefore = accBefore.body.data.current_balance;

    // Create DRAFT transaction
    const draftTx = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({
        account_id: miteshHdfcId,
        transaction_type: 'EXPENSE',
        amount: 9999,
        description: 'Draft unconfirmed purchase candidate',
        status: 'DRAFT',
      });

    expect(draftTx.status).toBe(201);

    // Balance should remain completely unchanged
    const accAfterDraft = await request(app)
      .get(`/api/accounts/${miteshHdfcId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);
    expect(accAfterDraft.body.data.current_balance).toBe(balanceBefore);

    // Void the draft
    await request(app)
      .post(`/api/transactions/${draftTx.body.data.id}/void`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);

    const accAfterVoid = await request(app)
      .get(`/api/accounts/${miteshHdfcId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId);
    expect(accAfterVoid.body.data.current_balance).toBe(balanceBefore);
  });
});
