/**
 * AI advisor pipeline tests - no network: providers are faked.
 */
import { pool } from '../src/database/db.js';
import { runMigrations } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';
import { QueryHelper } from '../src/database/queryHelper.js';
import { AIAdvisorService } from '../src/modules/ai-advisor/aiAdvisor.service.js';
import { extractJson, reportValidator } from '../src/modules/ai-advisor/reportSchema.js';
import { ChatMessage, ChatOptions, ChatResponse, IAIProvider } from '../src/modules/ai-advisor/providers/aiProvider.interface.js';

const validReport = {
  summary: 'Savings are healthy but the emergency fund is thin.',
  financialHealthScore: 68,
  scoreBreakdown: { cashflow: 75, liquidity: 40, debt: 80, investments: 60 },
  riskAssessment: 'Moderate',
  keyInsights: [
    { title: 'Emergency fund covers 1.8 months', detail: 'Below the 3-6 month buffer.', evidence: 'liquidBalance 72,000 vs avgExpense 40,000', area: 'liquidity', severity: 'warning' },
  ],
  recommendations: [
    {
      action: 'BUILD_EMERGENCY_FUND', title: 'Top up the emergency fund', security: '', securityType: 'GENERAL',
      reason: 'Reach 3 months of expenses first.', evidence: 'emergencyFundMonths 1.8', priority: 'HIGH',
      suggestedAmountInr: 50000, timeHorizon: 'SHORT',
    },
  ],
  rebalancingSuggestions: [],
  monthlySipPlan: [],
  monthlyStockPlan: [],
  marketOutlook: 'Market data was unavailable.',
  dataCaveats: [],
};

class FakeProvider implements IAIProvider {
  readonly name = 'FAKE';
  calls: ChatMessage[][] = [];
  constructor(private readonly replies: string[]) {}
  async chat(messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResponse> {
    this.calls.push(messages);
    const content = this.replies[Math.min(this.calls.length - 1, this.replies.length - 1)];
    return { content, tokensInput: 100, tokensOutput: 50, tokensTotal: 150, model: 'fake-model' };
  }
}

const prompt: ChatMessage[] = [{ role: 'user', content: 'analyse' }];

beforeAll(async () => {
  await runMigrations();
  await runSeed();
});

afterAll(async () => {
  await pool.end();
});

describe('report parsing', () => {
  test('extracts JSON wrapped in prose or code fences', () => {
    const json = JSON.stringify(validReport);
    expect(extractJson(json)).toEqual(validReport);
    expect(extractJson('```json\n' + json + '\n```')).toEqual(validReport);
    expect(extractJson('Here is your report:\n' + json + '\nHope this helps {not json}')).toEqual(validReport);
  });

  test('validator enforces ranges the JSON schema cannot express', () => {
    expect(reportValidator.safeParse(validReport).success).toBe(true);
    expect(reportValidator.safeParse({ ...validReport, financialHealthScore: 140 }).success).toBe(false);
    expect(reportValidator.safeParse({ ...validReport, keyInsights: [] }).success).toBe(false);
  });
});

describe('generateReport', () => {
  test('accepts a valid first reply without a repair call', async () => {
    const provider = new FakeProvider([JSON.stringify(validReport)]);
    const out = await AIAdvisorService.generateReport(provider, prompt);
    expect(provider.calls).toHaveLength(1);
    expect(out.report.financialHealthScore).toBe(68);
    expect(out.usage.total).toBe(150);
  });

  test('repairs an invalid reply once, sending the validation problems back', async () => {
    const broken = JSON.stringify({ ...validReport, riskAssessment: 'Spicy', financialHealthScore: 101 });
    const provider = new FakeProvider([broken, JSON.stringify(validReport)]);
    const out = await AIAdvisorService.generateReport(provider, prompt);
    expect(provider.calls).toHaveLength(2);
    const repairTurn = provider.calls[1][provider.calls[1].length - 1].content;
    expect(repairTurn).toContain('riskAssessment');
    expect(repairTurn).toContain('financialHealthScore');
    expect(out.report.riskAssessment).toBe('Moderate');
    expect(out.usage.total).toBe(300);
  });

  test('fails loudly (no fabricated fallback report) when the repair is also invalid', async () => {
    const provider = new FakeProvider(['not json at all']);
    await expect(AIAdvisorService.generateReport(provider, prompt)).rejects.toThrow(/valid report/);
    expect(provider.calls).toHaveLength(2);
  });
});

describe('analysis context', () => {
  test('contains computed cash-flow facts but no narrations or merchant names', async () => {
    const u = await QueryHelper.queryOne<any>(
      `SELECT u.id, hm.household_id FROM users u JOIN household_members hm ON hm.user_id = u.id WHERE u.email = 'owner@pfinanc.local'`
    );
    const acc = await QueryHelper.queryOne<any>(`SELECT id FROM accounts WHERE household_id = $1 AND owner_user_id = $2 AND account_type = 'BANK' LIMIT 1`, [u.household_id, u.id]);
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    await QueryHelper.insert('transactions', {
      household_id: u.household_id, account_id: acc.id, user_id: u.id, transaction_type: 'EXPENSE', amount: 777,
      description: 'UPI/P2A/123/SECRET FRIEND NAME/dinner', merchant_name: 'SECRET FRIEND NAME', transaction_date: ymd, status: 'CONFIRMED',
    });

    const context = await AIAdvisorService.buildAnalysisContext(u.id, u.household_id, {
      id: 'x', userId: u.id, householdId: u.household_id, aiProvider: 'ANTHROPIC', modelName: 'claude-opus-5-5',
      scheduleCron: '30 3 * * *', isEnabled: true,
    });
    const serialized = JSON.stringify(context);
    expect(context.cashflow.totalExpense).toBeGreaterThanOrEqual(777);
    expect(Array.isArray(context.precomputedSignals)).toBe(true);
    expect(serialized).not.toContain('SECRET FRIEND NAME');
    expect(serialized).not.toContain('UPI/P2A');

    const messages = AIAdvisorService.buildPrompt(context, { nifty50: null, sensex: null });
    expect(messages[0].role).toBe('system');
    expect(messages[1].content).toContain('"cashflow"');
  });
});
