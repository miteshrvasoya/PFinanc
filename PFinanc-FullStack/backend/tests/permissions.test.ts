import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';

let ownerToken = '';
let outsideUserToken = '';
let householdId = '';
let outsideHouseholdId = '';
let ownerHdfcId = '';

beforeAll(async () => {
  // Login as Owner
  const mRes = await request(app).post('/api/auth/login').send({
    email: 'owner@pfinanc.local',
    password: 'Password@123',
  });
  ownerToken = mRes.body.data.token;
  householdId = mRes.body.data.defaultHouseholdId;

  const uniqueEmail = `stranger_${Date.now()}@otherfamily.local`;
  const outRes = await request(app).post('/api/auth/register').send({
    email: uniqueEmail,
    password: 'Password@123',
    name: 'Stranger User',
  });
  outsideUserToken = outRes.body.data.token;
  outsideHouseholdId = outRes.body.data.defaultHouseholdId;

  // Get Owner's account ID
  const accRes = await request(app)
    .get('/api/accounts')
    .set('Authorization', `Bearer ${ownerToken}`)
    .set('x-household-id', householdId);

  ownerHdfcId = accRes.body.data[0].id;
});

afterAll(async () => {
  await pool.end();
});

describe('Multi-Tenancy & RBAC Authorization Security Tests', () => {
  test('User from Household B cannot access Household A dashboard', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${outsideUserToken}`)
      .set('x-household-id', householdId); // Stranger tries accessing Owner's household

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('HOUSEHOLD_ACCESS_DENIED');
  });

  test('User from Household B cannot view or modify accounts belonging to Household A', async () => {
    // Attempt to view account
    const viewRes = await request(app)
      .get(`/api/accounts/${ownerHdfcId}`)
      .set('Authorization', `Bearer ${outsideUserToken}`)
      .set('x-household-id', outsideHouseholdId);

    expect(viewRes.status).toBe(403);
    expect(viewRes.body.error.code).toBe('ACCOUNT_ACCESS_DENIED');

    // Attempt to inject transaction
    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${outsideUserToken}`)
      .set('x-household-id', outsideHouseholdId)
      .send({
        account_id: ownerHdfcId,
        transaction_type: 'EXPENSE',
        amount: 50000,
        description: 'Malicious unauthorized debit attempt',
      });

    expect(txRes.status).toBe(403);
    expect(txRes.body.error.code).toBe('ACCOUNT_ACCESS_DENIED');
  });
});
