import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';

let miteshToken = '';
let householdId = '';
let miteshHdfcId = '';

beforeAll(async () => {
  const mRes = await request(app).post('/api/auth/login').send({
    email: 'mitesh@pfinanc.local',
    password: 'Password@123',
  });
  miteshToken = mRes.body.data.token;
  householdId = mRes.body.data.defaultHouseholdId;

  const createAccRes = await request(app)
    .post('/api/accounts')
    .set('Authorization', `Bearer ${miteshToken}`)
    .set('x-household-id', householdId)
    .send({
      name: `CSV Test Account ${Date.now()}`,
      account_type: 'BANK',
      institution_name: 'Test Bank',
      opening_balance: 50000,
    });

  miteshHdfcId = createAccRes.body.data.id;
});

afterAll(async () => {
  await pool.end();
});

describe('CSV Import Engine & Duplicate Detection Tests', () => {
  const sampleCsv = `Date,Description,Debit,Credit,Ref
2026-08-16,Amazon Retail Order,1499.00,,AMZ99812
2026-08-16,Salary Bonus,,5000.00,BONUS2026
2026-08-17,Starbucks Coffee,350.00,,SBUX101
2026-08-17,Starbucks Coffee,350.00,,SBUX101
`;

  let batchId = '';

  test('Uploads CSV, parses rows, auto-detects columns, and detects intra-batch duplicates', async () => {
    const res = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .field('account_id', miteshHdfcId)
      .attach('file', Buffer.from(sampleCsv, 'utf-8'), 'hdfc_statement.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { metrics, rows } = res.body.data;
    batchId = res.body.data.batchId;

    expect(metrics.totalRows).toBe(4);
    expect(metrics.validRows).toBe(3);
    expect(metrics.duplicateRows).toBe(1); // 4th row is identical to 3rd row
    expect(rows.length).toBe(4);
  });

  test('Commits valid rows atomically to the account ledger', async () => {
    const commitRes = await request(app)
      .post(`/api/imports/commit/${batchId}`)
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .send({ include_duplicates: false });

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.success).toBe(true);
    expect(commitRes.body.data.importedCount).toBe(3);
  });

  test('Re-uploading the same statement identifies all rows as database duplicates', async () => {
    const res = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${miteshToken}`)
      .set('x-household-id', householdId)
      .field('account_id', miteshHdfcId)
      .attach('file', Buffer.from(sampleCsv, 'utf-8'), 'hdfc_statement_reupload.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.duplicateRows).toBe(4); // All 4 match database or internal duplicate
    expect(res.body.data.metrics.validRows).toBe(0);
  });
});
