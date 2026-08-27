import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSystemSeed } from '../src/database/seed-system.js';

describe('Phase 2.5: Production Onboarding, Initial Data, and Clean Initialization', () => {
  beforeAll(async () => {
    // Reset database to completely clean state
    await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    await runMigrations();
    await runSystemSeed();
  });

  afterAll(async () => {
    await pool.end();
  });

  let ownerToken: string;
  let ownerHouseholdId: string;
  let ownerUserId: string;

  let memberToken: string;
  let memberUserId: string;

  // 1. Fresh Installation Check
  it('Step 1: Fresh installation reports zero users and isFirstInstall = true', async () => {
    const res = await request(app).get('/api/auth/system-status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isFirstInstall).toBe(true);
    expect(res.body.data.userCount).toBe(0);
  });

  // 2. First User Registration & Household Naming
  it('Step 2: First user registers, becomes OWNER of "Vasoya Family", and initializes onboarding', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Mitesh Vasoya',
        email: 'mitesh@pfinanc.local',
        password: 'Password@123',
        household_name: 'Vasoya Family',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isFirstUser).toBe(true);
    expect(res.body.data.defaultHouseholdId).toBeDefined();

    ownerToken = res.body.data.token;
    ownerHouseholdId = res.body.data.defaultHouseholdId;
    ownerUserId = res.body.data.user.id;

    // Verify system status now reports isFirstInstall = false
    const statusRes = await request(app).get('/api/auth/system-status');
    expect(statusRes.body.data.isFirstInstall).toBe(false);
    expect(statusRes.body.data.userCount).toBe(1);
  });

  // 3. Resumable Onboarding State Machine
  it('Step 3: Onboarding progress is persisted per-user and can be resumed/updated', async () => {
    // Get initial state
    const getRes = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.status).toBe('IN_PROGRESS');

    // Update step to stock_accounts
    const updateRes = await request(app)
      .post('/api/onboarding/step')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId)
      .send({
        step: 'stock_accounts',
        completed_section: 'bank_accounts',
        metadata: { banksConfigured: 1 },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.current_step).toBe('stock_accounts');
    expect(updateRes.body.data.completed_sections).toContain('bank_accounts');

    // Verify persistence across new request
    const checkRes = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId);

    expect(checkRes.body.data.current_step).toBe('stock_accounts');
    expect(checkRes.body.data.completed_sections).toContain('bank_accounts');
  });

  // 4. Initial Opening Bank Balance Invariant (NO Income/Expense created)
  it('Step 4: Opening bank balance of ₹85,000 creates balance without generating income or expense', async () => {
    const accRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId)
      .send({
        name: 'HDFC Salary Savings',
        account_type: 'BANK',
        institution_name: 'HDFC Bank',
        opening_balance: 85000.00,
        opening_balance_date: '2026-08-01',
      });

    expect(accRes.status).toBe(201);
    expect(accRes.body.data.current_balance).toBe(85000.00);

    // Verify Dashboard metrics: Net Worth = ₹85,000, but monthly income/expense = ₹0
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.netWorth.netWorth).toBe(85000.00);
    expect(dashRes.body.data.thisMonth.income).toBe(0.00);
    expect(dashRes.body.data.thisMonth.expenses).toBe(0.00);
  });

  // 5. Universal CSV Classification Engine & Rule Learning
  it('Step 5: Multi-tier classification matches SWIGGY as Food Delivery and learns user correction', async () => {
    // 1. Built-in classifier test
    const classifyRes = await request(app)
      .post('/api/classification/classify')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId)
      .send({ description: 'POS SWIGGY RESTAURANT BANGLORE' });

    expect(classifyRes.status).toBe(200);
    expect(classifyRes.body.data.categoryName).toBe('Food Delivery');
    expect(classifyRes.body.data.confidence).toBe('SYSTEM_RULE');

    // 2. Fetch a category to create a user rule
    const catRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId);

    const restaurantCat = catRes.body.data.find((c: any) => c.name === 'Restaurants') || catRes.body.data[0];

    // 3. Save a custom user rule for 'ZOMATO' -> 'Restaurants'
    const ruleRes = await request(app)
      .post('/api/classification/rules')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId)
      .send({
        pattern: 'ZOMATO',
        category_id: restaurantCat.id,
        transaction_type: 'EXPENSE',
      });

    expect(ruleRes.status).toBe(201);

    // 4. Test classifier now matches ZOMATO using Priority 1 (USER_RULE)
    const zomatoClassify = await request(app)
      .post('/api/classification/classify')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId)
      .send({ description: 'UPI-ZOMATO-PAY-1234' });

    expect(zomatoClassify.status).toBe(200);
    expect(zomatoClassify.body.data.confidence).toBe('USER_RULE');
    expect(zomatoClassify.body.data.categoryId).toBe(restaurantCat.id);
  });

  // 6. Family Invitations & Independent Member Onboarding
  it('Step 6: Household owner invites Father; Father joins and has independent onboarding state', async () => {
    const inviteRes = await request(app)
      .post('/api/invitations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId)
      .send({
        email: 'father@pfinanc.local',
        name: 'Father Vasoya',
        role: 'ADMIN',
      });

    expect(inviteRes.status).toBe(201);
    const token = inviteRes.body.data.token;

    // Public inspection of invitation token
    const inspectRes = await request(app).get(`/api/invitations/public/${token}`);
    expect(inspectRes.status).toBe(200);
    expect(inspectRes.body.data.email).toBe('father@pfinanc.local');
    expect(inspectRes.body.data.household_name).toBe('Vasoya Family');

    // Father accepts invitation
    const acceptRes = await request(app)
      .post(`/api/invitations/public/${token}/accept`)
      .send({
        name: 'Father Vasoya',
        password: 'Password@123',
      });

    expect(acceptRes.status).toBe(200);
    memberToken = acceptRes.body.data.token;
    memberUserId = acceptRes.body.data.user.id;

    // Father has their own independent onboarding state
    const memberOnboarding = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${memberToken}`)
      .set('x-household-id', ownerHouseholdId);

    expect(memberOnboarding.status).toBe(200);
    expect(memberOnboarding.body.data.status).toBe('IN_PROGRESS');
  });

  // 7. Physical Gold & Precious Assets Integration into Net Worth
  it('Step 7: Physical Gold (25.5 grams @ ₹2,10,000) integrates cleanly into Net Worth', async () => {
    const assetRes = await request(app)
      .post('/api/physical-assets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId)
      .send({
        asset_name: '24K Physical Gold Bar',
        asset_type: 'PHYSICAL_GOLD',
        quantity: 25.50,
        unit: 'grams',
        purchase_cost: 120000.00,
        current_value: 210000.00,
        as_of_date: '2026-08-17',
      });

    expect(assetRes.status).toBe(201);
    expect(assetRes.body.data.current_value).toBe(210000.00);

    // Verify Portfolio and Dashboard include the Gold valuation
    const portRes = await request(app)
      .get('/api/investments/portfolio')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId);

    expect(portRes.status).toBe(200);
    expect(portRes.body.data.breakdown.physicalAssets.goldValue).toBe(210000.00);

    // Net Worth = Bank (₹85k) + Gold (₹210k) = ₹295,000
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId);

    expect(dashRes.body.data.netWorth.netWorth).toBe(295000.00);
  });

  // 8. Onboarding Completion
  it('Step 8: Completing onboarding marks state as COMPLETED', async () => {
    const completeRes = await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-household-id', ownerHouseholdId);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');
    expect(completeRes.body.data.completed_at).toBeDefined();
  });
});
