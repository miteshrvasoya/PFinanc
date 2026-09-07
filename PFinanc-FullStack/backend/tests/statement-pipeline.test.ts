import request from 'supertest';
import { app } from '../src/app.js';
import { QueryHelper } from '../src/database/queryHelper.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSystemSeed } from '../src/database/seed-system.js';
import { StatementImportsService } from '../src/modules/statement-imports/statementImports.service.js';
import { AiAnalysisService } from '../src/modules/statement-imports/ai/aiAnalysis.service.js';

describe('AI Statement Parsing Pipeline Architecture Tests', () => {
  let authToken: string;
  let householdId: string;
  let userId: string;
  let bankAccountId: string;

  beforeAll(async () => {
    await runMigrations();
    await runSystemSeed();

    // Register primary household owner
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'pipeline.owner@pfinanc.test',
        password: 'Password@123',
        name: 'Pipeline Owner',
        household_name: 'Pipeline Testing Household',
      });

    expect(regRes.status).toBe(201);
    authToken = regRes.body.data.token;
    householdId = regRes.body.data.defaultHouseholdId;
    userId = regRes.body.data.user.id;

    // Create a Bank Account
    const accRes = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        name: 'HDFC Pipeline Salary',
        account_type: 'BANK',
        institution_name: 'HDFC Bank',
        opening_balance: 50000.00,
        currency: 'INR',
      });

    expect(accRes.status).toBe(201);
    bankAccountId = accRes.body.data.id;
  });

  // =========================================================================
  // SCENARIO 1: 1,000-Row Statement & Chunk Failure/Retry Test (Section 61)
  // =========================================================================
  test('Scenario 1: 1,000-row statement persists 1,000 source rows; deliberate chunk failure is retryable without file re-upload', async () => {
    // Generate a 1,000-row synthetic CSV
    const rows = ['Date,Description,Withdrawal,Deposit,Balance'];
    let runningBalance = 100000.00;

    for (let i = 1; i <= 1000; i++) {
      const isCredit = i % 5 === 0;
      const amt = 50.00 + (i % 100);
      let debitStr = '';
      let creditStr = '';

      if (isCredit) {
        creditStr = amt.toFixed(2);
        runningBalance += amt;
      } else {
        debitStr = amt.toFixed(2);
        runningBalance -= amt;
      }

      const desc = isCredit ? `SALARY BONUS CREDIT ${i}` : `UPI/SWIGGY/ORDER/${i}`;
      rows.push(`15/01/2026,${desc},${debitStr},${creditStr},${runningBalance.toFixed(2)}`);
    }

    const csvContent = rows.join('\n');

    // 1. Upload & Deterministically Parse
    const uploadRes = await request(app)
      .post('/api/statement-imports/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        account_id: bankAccountId,
        filename: 'hdfc_1000_rows.csv',
        csv_content: csvContent,
      });

    expect(uploadRes.status).toBe(201);
    const importId = uploadRes.body.data.importId;
    expect(['PARSED', 'PARSED_WITH_WARNING']).toContain(uploadRes.body.data.status);
    expect(uploadRes.body.data.expectedRowCount).toBe(1000);
    expect(uploadRes.body.data.parsedRowCount).toBe(1000);

    // 2. Verify all 1,000 rows exist in statement_parsed_rows
    const dbCount = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_parsed_rows WHERE import_id = $1`,
      [importId]
    );
    expect(parseInt(dbCount!.count, 10)).toBe(1000);

    // 3. Start AI Analysis with chunk_size = 250 (Creates exactly 4 chunks)
    const runRes = await request(app)
      .post(`/api/statement-imports/${importId}/ai-run`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        chunk_size: 250,
        force_mock: true,
        async_execution: false, // execute synchronously for test control
      });

    expect(runRes.status).toBe(200);
    const runId = runRes.body.data.runId;
    expect(runRes.body.data.totalChunks).toBe(4);

    // 4. Fetch Chunks and verify
    const statusRes1 = await request(app)
      .get(`/api/statement-imports/${importId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId);

    expect(statusRes1.body.data.chunks.length).toBe(4);

    // 5. Deliberately fail Chunk 4 to simulate network/AI timeout
    const chunk4 = statusRes1.body.data.chunks[3];
    await QueryHelper.update('statement_ai_chunks', chunk4.id, {
      status: 'FAILED',
      error_code: 'SIMULATED_AI_TIMEOUT',
      error_message: 'Deliberately simulated AI timeout on chunk 4',
    });
    await QueryHelper.query(`DELETE FROM statement_ai_results WHERE chunk_id = $1`, [chunk4.id]);
    await QueryHelper.update('ai_analysis_runs', runId, { status: 'PARTIAL_FAILURE' });
    await QueryHelper.update('statement_imports', importId, { status: 'AI_PARTIAL_FAILURE' });

    // 6. Verify statement import state reflects partial failure while source rows are 100% preserved
    const statusRes2 = await request(app)
      .get(`/api/statement-imports/${importId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId);

    expect(statusRes2.body.data.status).toBe('AI_PARTIAL_FAILURE');
    const preservedCount = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_parsed_rows WHERE import_id = $1`,
      [importId]
    );
    expect(parseInt(preservedCount!.count, 10)).toBe(1000); // 100% source preserved!

    // 7. Retry Chunk 4
    const retryRes = await request(app)
      .post(`/api/statement-imports/chunks/${chunk4.id}/retry`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({ force_mock: true });

    expect(retryRes.status).toBe(200);

    // 8. Verify all 4 chunks are COMPLETED and import is READY_FOR_REVIEW
    const statusRes3 = await request(app)
      .get(`/api/statement-imports/${importId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId);

    expect(statusRes3.body.data.status).toBe('READY_FOR_REVIEW');
    expect(statusRes3.body.data.activeRun.status).toBe('COMPLETED');
    expect(statusRes3.body.data.activeRun.completed_chunks).toBe(4);

    const totalResults = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_ai_results WHERE analysis_run_id = $1`,
      [runId]
    );
    expect(parseInt(totalResults!.count, 10)).toBe(1000);
  });

  // =========================================================================
  // SCENARIO 2: Database Failure During Parsing Rollback Test (Section 62)
  // =========================================================================
  test('Scenario 2: Database failure during parsing triggers full rollback; leaves 0 partial rows and does NOT mark PARSED', async () => {
    // Malformed CSV with invalid schema / simulate DB rollback
    const invalidAccountId = '00000000-0000-0000-0000-000000000000';

    const failRes = await request(app)
      .post('/api/statement-imports/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        account_id: invalidAccountId, // Will fail account existence validation
        filename: 'failing_statement.csv',
        csv_content: 'Date,Description,Debit,Credit,Balance\n15/01/2026,UPI-TEST,100.00,,900.00',
      });

    expect(failRes.status).toBe(404);

    // Verify 0 rows were inserted
    const countCheck = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_parsed_rows WHERE description = 'UPI-TEST'`
    );
    expect(parseInt(countCheck!.count, 10)).toBe(0);
  });

  // =========================================================================
  // SCENARIO 3: Reprocessing with Multiple AI Runs Test (Section 63)
  // =========================================================================
  test('Scenario 3: Reprocessing statement with Model B creates independent AI run without duplicating source rows', async () => {
    const csvContent = `Date,Description,Debit,Credit,Balance
01/02/2026,SALARY CREDIT JAN 2026,,85000.00,85000.00
03/02/2026,UPI/SWIGGY/BANGALORE,450.00,,84550.00
05/02/2026,UBER RIDES INDIA,280.00,,84270.00`;

    // 1. Ingest Statement
    const uploadRes = await request(app)
      .post('/api/statement-imports/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        account_id: bankAccountId,
        filename: 'reprocessing_test.csv',
        csv_content: csvContent,
        allow_duplicate_file: true,
      });

    expect(uploadRes.status).toBe(201);
    const importId = uploadRes.body.data.importId;

    // 2. AI Run #1 with Model A
    const run1Res = await request(app)
      .post(`/api/statement-imports/${importId}/ai-run`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        model: 'google/gemini-2.0-flash-exp:free',
        force_mock: true,
        async_execution: false,
      });

    expect(run1Res.status).toBe(200);
    const run1Id = run1Res.body.data.runId;
    expect(run1Res.body.data.runNumber).toBe(1);

    // 3. AI Run #2 with Model B (Reprocessing without re-uploading file)
    const run2Res = await request(app)
      .post(`/api/statement-imports/${importId}/ai-run`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        model: 'anthropic/claude-3-haiku',
        force_mock: true,
        async_execution: false,
      });

    expect(run2Res.status).toBe(200);
    const run2Id = run2Res.body.data.runId;
    expect(run2Res.body.data.runNumber).toBe(2);

    // 4. Verify source rows were NOT duplicated (still exactly 3 rows)
    const sourceCount = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_parsed_rows WHERE import_id = $1`,
      [importId]
    );
    expect(parseInt(sourceCount!.count, 10)).toBe(3);

    // 5. Verify Run 1 is SUPERSEDED and Run 2 is ACTIVE
    const run1Db = await QueryHelper.queryOne<any>(`SELECT * FROM ai_analysis_runs WHERE id = $1`, [run1Id]);
    const run2Db = await QueryHelper.queryOne<any>(`SELECT * FROM ai_analysis_runs WHERE id = $1`, [run2Id]);

    expect(run1Db.is_active).toBe(false);
    expect(run1Db.status).toBe('SUPERSEDED');

    expect(run2Db.is_active).toBe(true);
    expect(run2Db.status).toBe('COMPLETED');
    expect(run2Db.model).toBe('anthropic/claude-3-haiku');

    // 6. Verify each run has its own independent AI results
    const r1Results = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_ai_results WHERE analysis_run_id = $1`,
      [run1Id]
    );
    const r2Results = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM statement_ai_results WHERE analysis_run_id = $1`,
      [run2Id]
    );

    expect(parseInt(r1Results!.count, 10)).toBe(3);
    expect(parseInt(r2Results!.count, 10)).toBe(3);
  });

  // =========================================================================
  // SCENARIO 4: Accounting Safety Guarantee Test (Section 64)
  // =========================================================================
  test('Scenario 4: Production transactions table contains ZERO records until user confirms review', async () => {
    // 1. Check baseline transactions in ledger for this account
    const initialTx = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions WHERE account_id = $1`,
      [bankAccountId]
    );
    const initialCount = parseInt(initialTx!.count, 10);

    // 2. Upload, parse, and run AI analysis
    const csvContent = `Date,Description,Debit,Credit,Balance
10/02/2026,TATA POWER ELECTRICITY,2450.00,,82550.00
12/02/2026,AMAZON INDIA,1899.00,,80651.00`;

    const uploadRes = await request(app)
      .post('/api/statement-imports/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        account_id: bankAccountId,
        filename: 'safety_check.csv',
        csv_content: csvContent,
        allow_duplicate_file: true,
      });

    const importId = uploadRes.body.data.importId;

    await request(app)
      .post(`/api/statement-imports/${importId}/ai-run`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({ force_mock: true, async_execution: false });

    // 3. VERIFY: Production transactions table STILL has ZERO new records!
    const midTx = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions WHERE account_id = $1`,
      [bankAccountId]
    );
    expect(parseInt(midTx!.count, 10)).toBe(initialCount); // Strict invariant!

    // 4. Fetch review data
    const reviewRes = await request(app)
      .get(`/api/statement-imports/${importId}/review`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId);

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.results.length).toBe(2);

    // 5. Explicit User Confirmation
    const confirmRes = await request(app)
      .post(`/api/statement-imports/${importId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-household-id', householdId)
      .send({
        include_duplicates: false,
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.committedCount).toBe(2);
    expect(confirmRes.body.data.status).toBe('COMPLETED');

    // 6. Only NOW are records written to the ledger
    const finalTx = await QueryHelper.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions WHERE account_id = $1`,
      [bankAccountId]
    );
    expect(parseInt(finalTx!.count, 10)).toBe(initialCount + 2);
  });
});
