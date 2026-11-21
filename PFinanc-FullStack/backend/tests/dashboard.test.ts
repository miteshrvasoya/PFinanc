/**
 * Home page (dashboard) figures: net worth composition and monthly cash flow.
 * Uses a fresh registered household so seed data cannot interfere.
 */
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { QueryHelper } from '../src/database/queryHelper.js';
import { toLocalDateString } from '../src/utils/date.js';

let token = '';
let householdId = '';
let userId = '';
let bankId = '';
let otherId = '';

const auth = () => ({ Authorization: `Bearer ${token}`, 'x-household-id': householdId });
const today = toLocalDateString();

beforeAll(async () => {
  await runMigrations();
  const reg = await request(app).post('/api/auth/register').send({
    email: `dash_${Date.now()}@test.local`, password: 'Password@123', name: 'Dash Tester',
  });
  token = reg.body.data.token;
  householdId = reg.body.data.defaultHouseholdId;
  userId = reg.body.data.user.id;

  const bank = await request(app).post('/api/accounts').set(auth()).send({ name: 'Main Bank', account_type: 'BANK', opening_balance: 100000 });
  bankId = bank.body.data.id;
  // An account whose statement is not imported yet: only transfer legs, so its balance is an artifact.
  const other = await request(app).post('/api/accounts').set(auth()).send({ name: 'Half-imported Bank', account_type: 'BANK', opening_balance: 0, include_in_net_worth: false });
  otherId = other.body.data.id;

  const tx = (body: any) => request(app).post('/api/transactions').set(auth()).send({ account_id: bankId, transaction_date: today, ...body });
  await tx({ transaction_type: 'INCOME', amount: 50000, description: 'Salary' });
  await tx({ transaction_type: 'EXPENSE', amount: 10000, description: 'Rent' });

  // Transfer of 20,000 into the half-imported account
  await request(app).post('/api/transfers').set(auth()).send({ source_account_id: bankId, destination_account_id: otherId, amount: 20000, transfer_date: today });

  // Loan of 1,00,000 @ 12% with one EMI of 5,000 linked -> outstanding = 100000 - (5000 - 1000) = 96,000
  const loan = await QueryHelper.insert('loans', {
    household_id: householdId, name: 'Test Loan', loan_type: 'BORROWED_FROM_BANK', principal_amount: 100000,
    outstanding_amount: 100000, interest_rate: 12, emi_amount: 5000, status: 'ACTIVE', linked_account_id: bankId,
  });
  await QueryHelper.insert('transactions', {
    household_id: householdId, account_id: bankId, user_id: userId, transaction_type: 'EMI_PAYMENT', amount: 5000,
    description: 'Loan EMI', transaction_date: today, status: 'CONFIRMED', linked_entity_type: 'LOAN', linked_entity_id: loan.id,
  });

  // Investment purchase of 8,000 with a draft investment entry (units unknown)
  const brokerage = await request(app).post('/api/accounts').set(auth()).send({ name: 'Broker', account_type: 'BROKERAGE', opening_balance: 0 });
  const cash = await QueryHelper.insert('transactions', {
    household_id: householdId, account_id: bankId, user_id: userId, transaction_type: 'INVESTMENT_PURCHASE', amount: 8000,
    description: 'SIP', transaction_date: today, status: 'CONFIRMED',
  });
  await QueryHelper.insert('investment_transactions', {
    household_id: householdId, investment_account_id: brokerage.body.data.id, transaction_type: 'SIP', transaction_date: today,
    gross_amount: 8000, net_amount: 8000, linked_cash_transaction_id: cash.id, status: 'DRAFT', source: 'MANUAL',
  });
});

afterAll(async () => {
  await pool.end();
});

describe('Home page figures', () => {
  test('net worth = counted cash + investments (incl. pending at cost) - loans', async () => {
    const res = await request(app).get('/api/dashboard').set(auth());
    expect(res.status).toBe(200);
    const nw = res.body.data.netWorth;
    // Main bank: 100000 + 50000 - 10000 - 20000 (transfer) - 5000 (EMI) - 8000 (SIP) = 107000
    expect(nw.breakdown.cashAndBank).toBe(107000);
    expect(nw.breakdown.investmentsPendingAtCost).toBe(8000);
    expect(nw.breakdown.loans).toBe(96000);
    expect(nw.netWorth).toBe(107000 + 8000 - 96000);
    // The half-imported account (balance 20000) is listed, not counted.
    expect(nw.excludedAccounts).toEqual([expect.objectContaining({ name: 'Half-imported Bank', balance: 20000 })]);
  });

  test('cash flow deducts EMIs and investing from what is left over', async () => {
    const res = await request(app).get('/api/dashboard?view=personal').set(auth());
    const m = res.body.data.thisMonth;
    expect(m.income).toBe(50000);
    expect(m.spending).toBe(10000);
    expect(m.emi).toBe(5000);
    expect(m.invested).toBe(8000);
    // The transfer went to an account that is not counted in net worth, so it left the tracked picture.
    expect(m.sentToFamily).toBe(20000);
    // Left over equals the change in counted balances: 107000 - 100000.
    expect(m.leftOver).toBe(50000 - 10000 - 5000 - 8000 - 20000);
    expect(m.leftOver).toBe(7000);
    expect(m.savingsRatePct).toBe(80);
    expect(res.body.data.cashFlowTrend).toHaveLength(6);
  });

  test('each transfer appears once in recent transactions', async () => {
    const res = await request(app).get('/api/dashboard').set(auth());
    const transfers = res.body.data.recentTransactions.filter((t: any) => t.transaction_type === 'TRANSFER');
    expect(transfers).toHaveLength(1);
    expect(transfers[0].account_id).toBe(bankId);
  });

  test('the net-worth flag can be switched back on from the account settings', async () => {
    const patch = await request(app).patch(`/api/accounts/${otherId}`).set(auth()).send({ include_in_net_worth: true });
    expect(patch.status).toBe(200);
    expect(patch.body.data.include_in_net_worth).toBe(true);
    const res = await request(app).get('/api/dashboard').set(auth());
    expect(res.body.data.netWorth.breakdown.cashAndBank).toBe(127000);
    expect(res.body.data.netWorth.excludedAccounts).toHaveLength(0);
    // Once both accounts are counted, the transfer between them is internal.
    expect(res.body.data.thisMonth.sentToFamily).toBe(0);
    expect(res.body.data.thisMonth.leftOver).toBe(27000);
  });
});
