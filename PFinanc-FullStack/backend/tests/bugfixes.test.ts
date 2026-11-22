/**
 * Regression tests for defects fixed in the bug-sweep (authorization holes, ledger corruption,
 * import direction errors, migration safety).
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { QueryHelper } from '../src/database/queryHelper.js';

let ownerToken = '';
let memberToken = '';
let strangerToken = '';
let householdId = '';
let strangerHouseholdId = '';
let hdfcId = '';

const auth = (token: string, hh = householdId) => ({ Authorization: `Bearer ${token}`, 'x-household-id': hh });

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password@123' });
  return res.body.data;
}

async function balanceOf(accountId: string, token = ownerToken) {
  const res = await request(app).get(`/api/accounts/${accountId}`).set(auth(token));
  return res.body.data.current_balance as number;
}

async function createExpense(amount: number, description: string) {
  const res = await request(app)
    .post('/api/transactions')
    .set(auth(ownerToken))
    .send({ account_id: hdfcId, transaction_type: 'EXPENSE', amount, description });
  expect(res.status).toBe(201);
  return res.body.data;
}

beforeAll(async () => {
  await runMigrations();
  await runSeed();

  const owner = await login('owner@pfinanc.local');
  ownerToken = owner.token;
  householdId = owner.defaultHouseholdId;
  memberToken = (await login('member@pfinanc.local')).token;

  const reg = await request(app).post('/api/auth/register').send({
    email: `stranger_${Date.now()}@otherfamily.local`,
    password: 'Password@123',
    name: 'Stranger',
  });
  strangerToken = reg.body.data.token;
  strangerHouseholdId = reg.body.data.defaultHouseholdId;

  const accounts = await request(app).get('/api/accounts').set(auth(ownerToken));
  hdfcId = accounts.body.data.find((a: any) => a.name === 'Owner - HDFC Bank').id;
});

afterAll(async () => {
  await pool.end();
});

describe('Migrations', () => {
  test('re-running migrations is a no-op and every file is recorded once', async () => {
    await runMigrations();
    const files = fs.readdirSync(path.resolve(__dirname, '../src/database/migrations')).filter((f) => f.endsWith('.sql'));
    const rows = await QueryHelper.query<{ filename: string }>('SELECT filename FROM schema_migrations');
    expect(rows.map((r) => r.filename).sort()).toEqual(files.sort());
  });
});

describe('QueryHelper scoping', () => {
  test('update() with no changes still honours the scoping clause', async () => {
    const row = await QueryHelper.update('accounts', hdfcId, {}, 'household_id = $1', [strangerHouseholdId]);
    expect(row).toBeNull();
  });

  test('update() renumbers several scoping params correctly', async () => {
    const row = await QueryHelper.update(
      'accounts', hdfcId, { notes: 'scoped' },
      'household_id = $1 AND is_active = $2 AND currency = $3', [householdId, true, 'INR']
    );
    expect(row?.notes).toBe('scoped');
  });
});

describe('Authorization', () => {
  test('a household owner cannot act on another household via the :householdId param', async () => {
    const read = await request(app).get(`/api/households/${householdId}`).set(auth(strangerToken, strangerHouseholdId));
    expect(read.status).toBe(403);
    const write = await request(app)
      .patch(`/api/households/${householdId}`)
      .set(auth(strangerToken, strangerHouseholdId))
      .send({ name: 'Hijacked' });
    expect(write.status).toBe(403);
  });

  test('accepting an invitation for an existing account requires that account\'s password', async () => {
    const inv = await request(app)
      .post('/api/invitations')
      .set(auth(strangerToken, strangerHouseholdId))
      .send({ email: 'owner@pfinanc.local', role: 'MEMBER' });
    expect(inv.status).toBe(201);

    const takeover = await request(app)
      .post(`/api/invitations/public/${inv.body.data.token}/accept`)
      .send({ password: 'attacker-password' });
    expect(takeover.status).toBe(401);
    expect(takeover.body.data?.token).toBeUndefined();
  });

  test('VIEWERs are read-only', async () => {
    const email = `viewer_${Date.now()}@pfinanc.local`;
    const inv = await request(app).post('/api/invitations').set(auth(ownerToken)).send({ email, role: 'VIEWER' });
    const accepted = await request(app)
      .post(`/api/invitations/public/${inv.body.data.token}/accept`)
      .send({ password: 'Password@123', name: 'Viewer' });
    expect(accepted.status).toBe(200);
    const viewerToken = accepted.body.data.token;

    expect((await request(app).get('/api/dashboard').set(auth(viewerToken))).status).toBe(200);
    const write = await request(app)
      .post('/api/transactions')
      .set(auth(viewerToken))
      .send({ account_id: hdfcId, transaction_type: 'EXPENSE', amount: 10, description: 'viewer write' });
    expect(write.status).toBe(403);
  });

  test('MEMBERs do not see transactions on other members\' private accounts', async () => {
    const tx = await createExpense(123.45, 'Private HDFC spend');
    const list = await request(app).get('/api/transactions?limit=500').set(auth(memberToken));
    expect(list.status).toBe(200);
    expect(list.body.data.items.some((t: any) => t.id === tx.id)).toBe(false);
    const single = await request(app).get(`/api/transactions/${tx.id}`).set(auth(memberToken));
    expect(single.status).toBe(404);
  });
});

describe('Ledger integrity', () => {
  test('editing an account name does not reset its opening balance', async () => {
    const before = await request(app).get(`/api/accounts/${hdfcId}`).set(auth(ownerToken));
    const res = await request(app).patch(`/api/accounts/${hdfcId}`).set(auth(ownerToken)).send({ name: 'Owner - HDFC Bank' });
    expect(res.status).toBe(200);
    expect(res.body.data.opening_balance).toBe(before.body.data.opening_balance);
    expect(res.body.data.is_shared).toBe(before.body.data.is_shared);
  });

  test('splitting a transaction keeps it in the account balance', async () => {
    const tx = await createExpense(1000, 'Split me');
    const afterCreate = await balanceOf(hdfcId);
    const split = await request(app)
      .post(`/api/splits/${tx.id}`)
      .set(auth(ownerToken))
      .send({ splits: [{ amount: 600 }, { amount: 400 }] });
    expect(split.status).toBe(200);
    expect(await balanceOf(hdfcId)).toBeCloseTo(afterCreate, 2);
    const reloaded = await request(app).get(`/api/transactions/${tx.id}`).set(auth(ownerToken));
    expect(reloaded.body.data.transaction_type).toBe('EXPENSE');
  });

  test('a voided transaction cannot be re-confirmed', async () => {
    const tx = await createExpense(50, 'Void me');
    expect((await request(app).post(`/api/transactions/${tx.id}/void`).set(auth(ownerToken))).status).toBe(200);
    const confirm = await request(app).post(`/api/transactions/${tx.id}/confirm`).set(auth(ownerToken));
    expect(confirm.status).toBe(400);
  });

  test('bare TRANSFER rows are rejected (they would be ignored by the ledger)', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set(auth(ownerToken))
      .send({ account_id: hdfcId, transaction_type: 'TRANSFER', amount: 10, description: 'orphan transfer' });
    expect(res.status).toBe(400);
  });

  test('malformed ids return 400 instead of 500', async () => {
    const res = await request(app).get('/api/transactions/not-a-uuid').set(auth(ownerToken));
    expect(res.status).toBe(400);
  });
});

describe('CSV import direction', () => {
  test('an unmatched credit row stays income instead of defaulting to expense', async () => {
    const csv = 'Date,Narration,Withdrawal Amt,Deposit Amt\n15-04-2025,ZZQ UNKNOWN CREDIT 9911,,5000.00\n16/04/25,ZZQ UNKNOWN DEBIT 9912,250.00,\n';
    const res = await request(app)
      .post('/api/imports/preview')
      .set(auth(ownerToken))
      .field('account_id', hdfcId)
      .attach('file', Buffer.from(csv, 'utf-8'), 'direction_test.csv');
    expect(res.status).toBe(200);
    const [credit, debit] = res.body.data.rows.map((r: any) => r.parsed_data);
    expect(credit.transaction_type).toBe('INCOME');
    expect(credit.date).toBe('2025-04-15');
    expect(debit.transaction_type).toBe('EXPENSE');
    expect(debit.date).toBe('2025-04-16');
  });
});
