import { QueryHelper } from '../../database/queryHelper.js';
import { HoldingsService } from '../investments/holdings/holdings.service.js';
import { PortfolioService } from '../investments/portfolio/portfolio.service.js';
import { MarketDataService } from '../investments/prices/marketData.service.js';
import { FinancialInsightsService } from '../analytics/financialInsights.service.js';
import { toLocalDateString } from '../../utils/date.js';
import { PortfolioSignalsService } from './portfolioSignals.service.js';
import { AIProviderFactory, AIProviderType, DEFAULT_MODELS } from './providers/aiProviderFactory.js';
import { ChatMessage, ChatResponse, IAIProvider, LLMError } from './providers/aiProvider.interface.js';
import { AdvisorReport, REPORT_JSON_SCHEMA, describeIssues, extractJson, reportValidator } from './reportSchema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvisorConfig {
  id: string;
  userId: string;
  householdId: string;
  aiProvider: AIProviderType;
  modelName: string;
  apiKeyOverride?: string;
  scheduleCron: string;
  isEnabled: boolean;
  monthlySipBudgetInr?: number;
  monthlyStockBudgetInr?: number;
}

// ─── AI Advisor Service ───────────────────────────────────────────────────────

export class AIAdvisorService {
  // ── Config CRUD ─────────────────────────────────────────────────────────────

  static async getConfig(userId: string, householdId: string): Promise<AdvisorConfig | null> {
    const row = await QueryHelper.queryOne<any>(
      `SELECT * FROM ai_advisor_config WHERE user_id = $1 AND household_id = $2`,
      [userId, householdId]
    );
    return row ? this.mapConfig(row) : null;
  }

  /** Mask used when returning API keys to clients; a value starting with it means "unchanged". */
  static readonly KEY_MASK = '••••';

  static maskConfig(cfg: AdvisorConfig): AdvisorConfig & { hasApiKey: boolean } {
    const key = cfg.apiKeyOverride;
    return {
      ...cfg,
      apiKeyOverride: key ? `${this.KEY_MASK}${key.slice(-4)}` : undefined,
      hasApiKey: !!key,
    };
  }

  /**
   * @param data.apiKeyOverride undefined = keep the stored key, '' / null = clear it, otherwise replace it.
   */
  static async upsertConfig(userId: string, householdId: string, data: Partial<AdvisorConfig>): Promise<AdvisorConfig> {
    const keepKey = data.apiKeyOverride === undefined;
    // Fields a client did not send keep their stored value, so saving from the web does not wipe what the
    // mobile app set (and vice versa) - both write to this one row.
    const existing = await this.getConfig(userId, householdId);
    const provider = data.aiProvider || existing?.aiProvider || 'OPENROUTER';
    data = {
      ...data,
      aiProvider: provider,
      modelName: data.modelName || (data.aiProvider && data.aiProvider !== existing?.aiProvider ? undefined : existing?.modelName),
      scheduleCron: data.scheduleCron ?? existing?.scheduleCron,
      isEnabled: data.isEnabled ?? existing?.isEnabled,
      // undefined = keep stored value; null/0 = clear it
      monthlySipBudgetInr: data.monthlySipBudgetInr === undefined ? existing?.monthlySipBudgetInr : data.monthlySipBudgetInr,
      monthlyStockBudgetInr: data.monthlyStockBudgetInr === undefined ? existing?.monthlyStockBudgetInr : data.monthlyStockBudgetInr,
    };
    const row = await QueryHelper.queryOne<any>(
      `INSERT INTO ai_advisor_config (
        user_id, household_id, ai_provider, model_name, api_key_override,
        schedule_cron, is_enabled, monthly_sip_budget_inr, monthly_stock_budget_inr
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id, household_id) DO UPDATE SET
        ai_provider              = EXCLUDED.ai_provider,
        model_name               = EXCLUDED.model_name,
        api_key_override         = CASE WHEN $10 THEN ai_advisor_config.api_key_override ELSE EXCLUDED.api_key_override END,
        schedule_cron            = EXCLUDED.schedule_cron,
        is_enabled               = EXCLUDED.is_enabled,
        monthly_sip_budget_inr   = EXCLUDED.monthly_sip_budget_inr,
        monthly_stock_budget_inr = EXCLUDED.monthly_stock_budget_inr,
        updated_at               = NOW()
      RETURNING *`,
      [
        userId,
        householdId,
        data.aiProvider || 'OPENROUTER',
        data.modelName || DEFAULT_MODELS[data.aiProvider || 'OPENROUTER'],
        data.apiKeyOverride || null,
        data.scheduleCron || '30 3 * * *',
        data.isEnabled !== undefined ? data.isEnabled : true,
        data.monthlySipBudgetInr || null,
        data.monthlyStockBudgetInr || null,
        keepKey,
      ]
    );
    return this.mapConfig(row!);
  }

  private static mapConfig(row: any): AdvisorConfig {
    return {
      id: row.id,
      userId: row.user_id,
      householdId: row.household_id,
      aiProvider: row.ai_provider as AIProviderType,
      modelName: row.model_name,
      apiKeyOverride: row.api_key_override,
      scheduleCron: row.schedule_cron,
      isEnabled: row.is_enabled,
      monthlySipBudgetInr: row.monthly_sip_budget_inr ? parseFloat(row.monthly_sip_budget_inr) : undefined,
      monthlyStockBudgetInr: row.monthly_stock_budget_inr ? parseFloat(row.monthly_stock_budget_inr) : undefined,
    };
  }

  // ── Reports / Notifications ──────────────────────────────────────────────────

  static async getReports(userId: string, householdId: string, limit = 20) {
    return QueryHelper.query(
      `SELECT r.*, run.triggered_by, run.ai_provider, run.model_name, run.tokens_total
       FROM ai_advisor_reports r
       JOIN ai_advisor_runs run ON run.id = r.run_id
       WHERE r.user_id = $1 AND r.household_id = $2
       ORDER BY r.created_at DESC
       LIMIT $3`,
      [userId, householdId, limit]
    );
  }

  static async getLatestReport(userId: string, householdId: string) {
    return QueryHelper.queryOne(
      `SELECT r.*, run.triggered_by, run.ai_provider, run.model_name, run.tokens_total
       FROM ai_advisor_reports r
       JOIN ai_advisor_runs run ON run.id = r.run_id
       WHERE r.user_id = $1 AND r.household_id = $2
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [userId, householdId]
    );
  }

  static async getReportById(reportId: string, userId: string) {
    return QueryHelper.queryOne(
      `SELECT r.*, run.triggered_by, run.ai_provider, run.model_name, run.tokens_total
       FROM ai_advisor_reports r
       JOIN ai_advisor_runs run ON run.id = r.run_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [reportId, userId]
    );
  }

  static async markReportRead(reportId: string, userId: string) {
    await QueryHelper.query(
      `UPDATE ai_advisor_reports SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [reportId, userId]
    );
    await QueryHelper.query(
      `UPDATE ai_advisor_notifications SET is_read = true, read_at = NOW()
       WHERE report_id = $1 AND user_id = $2`,
      [reportId, userId]
    );
  }

  static async getRuns(userId: string, householdId: string, limit = 20) {
    return QueryHelper.query(
      `SELECT * FROM ai_advisor_runs
       WHERE user_id = $1 AND household_id = $2
       ORDER BY started_at DESC LIMIT $3`,
      [userId, householdId, limit]
    );
  }

  static async getUnreadNotifications(userId: string) {
    return QueryHelper.query(
      `SELECT * FROM ai_advisor_notifications
       WHERE user_id = $1 AND is_read = false
       ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
  }

  static async markAllNotificationsRead(userId: string) {
    await QueryHelper.query(
      `UPDATE ai_advisor_notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }

  // ── Core Analysis Runner ─────────────────────────────────────────────────────

  /** Create the RUNNING run record (lets callers return the id before the analysis finishes). */
  static async createRun(userId: string, householdId: string, triggeredBy: 'SCHEDULED' | 'MANUAL'): Promise<string> {
    const cfg = await this.getConfig(userId, householdId) || await this.upsertConfig(userId, householdId, {});
    const run = await QueryHelper.queryOne<{ id: string }>(
      `INSERT INTO ai_advisor_runs (user_id, household_id, triggered_by, status, ai_provider, model_name)
       VALUES ($1, $2, $3, 'RUNNING', $4, $5) RETURNING id`,
      [userId, householdId, triggeredBy, cfg.aiProvider, cfg.modelName]
    );
    return run!.id;
  }

  static async runAnalysis(
    userId: string,
    householdId: string,
    triggeredBy: 'SCHEDULED' | 'MANUAL' = 'MANUAL',
    existingRunId?: string
  ): Promise<{ runId: string; reportId?: string; status: string }> {

    const cfg = await this.getConfig(userId, householdId) || await this.upsertConfig(userId, householdId, {});

    // Reuse the run created by the caller (manual trigger) instead of creating a second, orphaned one.
    const runId = existingRunId || (await this.createRun(userId, householdId, triggeredBy));

    await this.createNotification(userId, householdId, null, 'AI_RUN_STARTED',
      '🤖 AI Advisor is analyzing your finances…',
      'Your analysis is running. We\'ll notify you when it\'s ready.'
    );

    try {
      // 1. Refresh market prices (best effort: a pricing outage must not block the analysis)
      await MarketDataService.refreshPrices(householdId).catch((err) =>
        console.warn('[AIAdvisorService] Price refresh failed, using last known prices:', err?.message)
      );

      // 2. Deterministic facts: cash flow, spending, liquidity, debt, portfolio, data quality
      const [context, marketContext] = await Promise.all([
        this.buildAnalysisContext(userId, householdId, cfg),
        this.fetchMarketContext(),
      ]);

      // 3. Ask the model, validate, repair once if needed
      const provider = AIProviderFactory.create({
        provider: cfg.aiProvider,
        model: cfg.modelName,
        apiKeyOverride: cfg.apiKeyOverride,
      });
      const { report, raw, usage, servedModel } = await this.generateReport(provider, this.buildPrompt(context, marketContext));

      // 4. Store report (legacy columns kept populated for history views)
      const stored = await QueryHelper.queryOne<{ id: string }>(
        `INSERT INTO ai_advisor_reports (
          run_id, user_id, household_id,
          portfolio_snapshot, market_context, recommendations,
          portfolio_health_score, risk_assessment, key_insights,
          raw_ai_response, report, financial_snapshot, served_model, schema_version, is_read
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,2,false) RETURNING id`,
        [
          runId,
          userId,
          householdId,
          JSON.stringify(context.portfolio),
          JSON.stringify(marketContext),
          JSON.stringify(report.recommendations),
          report.financialHealthScore,
          report.riskAssessment,
          JSON.stringify(report.keyInsights),
          raw,
          JSON.stringify(report),
          JSON.stringify(context),
          servedModel,
        ]
      );

      await QueryHelper.query(
        `UPDATE ai_advisor_runs SET
          status = 'COMPLETED', completed_at = NOW(),
          tokens_input = $1, tokens_output = $2, tokens_total = $3,
          market_data_snapshot = $4
         WHERE id = $5`,
        [usage.input || null, usage.output || null, usage.total || null, JSON.stringify(marketContext), runId]
      );

      const top = report.keyInsights.find((i) => i.severity === 'critical' || i.severity === 'warning') || report.keyInsights[0];
      await this.createNotification(
        userId, householdId, stored!.id,
        'AI_REPORT_READY',
        `✅ AI Advisor Report Ready — Financial Health ${report.financialHealthScore}/100`,
        top ? `${top.title}: ${top.detail}`.slice(0, 240) : report.summary.slice(0, 240)
      );

      return { runId, reportId: stored!.id, status: 'COMPLETED' };

    } catch (err: any) {
      const errorMsg = err instanceof LLMError
        ? err.message
        : err?.message || 'Unknown error during AI analysis';
      console.error(`[AIAdvisorService] Run ${runId} failed:`, errorMsg);

      await QueryHelper.query(
        `UPDATE ai_advisor_runs SET status = 'FAILED', completed_at = NOW(), error_message = $1 WHERE id = $2`,
        [errorMsg, runId]
      );

      await this.createNotification(
        userId, householdId, null,
        'AI_RUN_FAILED',
        '❌ AI Advisor Analysis Failed',
        errorMsg.substring(0, 240)
      );

      return { runId, status: 'FAILED' };
    }
  }

  // ── Context Builder ───────────────────────────────────────────────────────────

  /**
   * Everything the model is allowed to reason about. All numbers are computed deterministically.
   * Privacy: only aggregates leave the server - no account numbers, transaction narrations, counterparty
   * names or merchant names (which in Indian UPI data are often private individuals).
   */
  static async buildAnalysisContext(userId: string, householdId: string, cfg: AdvisorConfig) {
    const member = await QueryHelper.queryOne<{ role: string }>(
      `SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`,
      [householdId, userId]
    );
    const now = new Date();
    const startDate = toLocalDateString(new Date(now.getFullYear(), now.getMonth() - 6, 1));

    const [overview, holdings, portfolio] = await Promise.all([
      FinancialInsightsService.getOverview({
        householdId, userId, role: member?.role, scope: 'personal', startDate, endDate: toLocalDateString(now),
      }),
      HoldingsService.calculateHoldings({ householdId, userId }),
      PortfolioService.getPortfolioSummary(householdId, userId),
    ]);

    const k = overview.kpis;
    const activeHoldings = holdings
      .filter((h) => h.current_quantity > 0)
      .sort((a, b) => b.current_value - a.current_value)
      .slice(0, 25)
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        type: h.security_type,
        currentValue: Math.round(h.current_value),
        invested: Math.round(h.total_invested),
        unrealizedPnlPct: Number(h.unrealized_pnl_percent.toFixed(2)),
        weightPct: portfolio.summary.totalCurrentValue > 0
          ? Number(((h.current_value / portfolio.summary.totalCurrentValue) * 100).toFixed(2))
          : 0,
        priceIsStale: !!h.is_stale,
      }));

    return {
      asOf: toLocalDateString(now),
      period: overview.period,
      cashflow: {
        totalIncome: k.income,
        totalExpense: k.expense,
        netSavings: k.netSavings,
        savingsRatePct: k.savingsRatePct,
        emiPaid: k.emiPaid,
        netInvested: k.netInvested,
        investmentRatePct: k.investmentRatePct,
        monthly: overview.monthly,
      },
      typicalMonth: {
        avgIncome: k.avgMonthlyIncome,
        avgExpense: k.avgMonthlyExpense,
        avgInvested: k.avgMonthlyInvested,
        recurringCommitments: overview.recurringPayments.map((r) => ({
          kind: r.kind,
          category: r.category_name || 'Uncategorized',
          monthlyAmount: r.monthly_estimate,
          monthsSeen: r.months_seen,
        })),
      },
      spendingByCategory: overview.expenseCategories.slice(0, 15).map((c) => ({
        category: c.category_name,
        group: c.parent_name,
        amount: c.total_amount,
        sharePct: c.share_pct,
        previousPeriodAmount: c.previous_amount,
        changePct: c.change_pct,
      })),
      incomeBySource: overview.incomeCategories.slice(0, 8).map((c) => ({ source: c.category_name, amount: c.total_amount })),
      largestExpenses: overview.largestExpenses.map((e) => ({
        date: e.transaction_date,
        category: e.category_name || 'Uncategorized',
        amount: e.amount,
        flaggedForReview: e.needs_review,
      })),
      liquidity: {
        liquidBalance: k.liquidBalance,
        creditCardDue: k.creditCardDue,
        emergencyFundMonths: k.emergencyFundMonths,
      },
      debt: {
        totalOutstanding: k.loanOutstanding,
        monthlyEmi: k.monthlyEmi,
        emiToIncomePct: k.emiToIncomePct,
        loans: overview.loans.map((l) => ({
          type: l.loan_type,
          outstanding: l.outstanding,
          interestRatePct: l.interest_rate,
          emi: l.emi,
          endDate: l.end_date,
        })),
      },
      budgets: overview.budgets.map((b) => ({ category: b.category_name, budget: b.budget, spentThisMonth: b.spent, projected: b.projected })),
      portfolio: {
        summary: portfolio.summary,
        breakdown: portfolio.breakdown,
        assetAllocation: portfolio.assetAllocation.map((a) => ({ label: a.label, amount: Math.round(a.amount), percent: a.percent })),
        holdings: activeHoldings,
      },
      // Rule-based observations (overweight, deep losses, lots turning long-term, gaps) plus holding periods.
      investmentSignals: (() => {
        const sig = PortfolioSignalsService.fromData(holdings, portfolio, 'personal');
        return {
          concentration: sig.concentration,
          flags: sig.flags,
          reviewForReducing: sig.reviewForReducing,
          reviewForAdding: sig.reviewForAdding,
          holdingPeriods: sig.positions.slice(0, 25).map((p) => ({ symbol: p.symbol, oldestLotDays: p.oldestLotDays, longTermQuantity: p.longTermQuantity, shortTermQuantity: p.shortTermQuantity })),
        };
      })(),
      investmentBudget: {
        monthlySipInr: cfg.monthlySipBudgetInr || null,
        monthlyStockInr: cfg.monthlyStockBudgetInr || null,
      },
      dataQuality: overview.dataQuality,
      precomputedSignals: overview.insights.map((i) => ({ severity: i.severity, area: i.area, title: i.title, detail: i.detail })),
    };
  }

  // ── Market Context ────────────────────────────────────────────────────────────

  static async fetchMarketContext() {
    try {
      const response = await fetch(
        'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5ENSEI,%5EBSESN&fields=regularMarketPrice,regularMarketChangePercent',
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PFinanc/1.0)' },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (response.ok) {
        const data = await response.json() as any;
        const quotes = data?.quoteResponse?.result || [];
        const nifty = quotes.find((q: any) => q.symbol === '^NSEI');
        const sensex = quotes.find((q: any) => q.symbol === '^BSESN');
        return {
          nifty50: nifty ? { price: nifty.regularMarketPrice, changePct: nifty.regularMarketChangePercent } : null,
          sensex: sensex ? { price: sensex.regularMarketPrice, changePct: sensex.regularMarketChangePercent } : null,
          fetchedAt: new Date().toISOString(),
        };
      }
    } catch {
      /* market context is supplementary */
    }
    return { nifty50: null, sensex: null, fetchedAt: new Date().toISOString() };
  }

  // ── Prompt ────────────────────────────────────────────────────────────────────

  static readonly SYSTEM_PROMPT = `You are a careful personal-finance analyst for an Indian household using a self-hosted finance app. You review one person's finances and explain what matters most, in plain language, with specific next steps.

How to work:
- Base every statement on the DATA provided. Quote the figures you rely on in each insight's and recommendation's "evidence" field (for example "Savings rate 18.4% vs 26.1% in the previous period"). Never invent balances, prices, returns, fund names, or market events that are not in the data.
- Cover the whole picture, in this order of importance: cash flow and savings rate, emergency fund, debt and EMIs, spending patterns and budgets, then investments and allocation. A household with thin savings or high-interest debt needs that addressed before any investment idea.
- "precomputedSignals" are rule-based observations computed from the same data. Use them as starting points: confirm, prioritise, and explain them; do not simply repeat them.
- Respect data quality. If dataQuality shows flagged, uncategorized, or draft entries, or holdings have stale prices, say how that limits your conclusions in "dataCaveats" and lower confidence accordingly. Do not treat uncategorized spending as a category the person chose.
- "investmentSignals" lists rule-based flags for the holdings (overweight positions, deep losses, big winners, lots about to turn long-term, missing diversification) with "reviewForReducing" and "reviewForAdding". Turn the relevant ones into HOLD / SELL / REBALANCE recommendations worded as "consider ... because ..." with the evidence. When a lot is close to the 12-month mark, mention that waiting may lower tax on a sale; for a deep loss mention it may offset gains. Never present a sale as certain or urgent without evidence, and say the decision is the user's.
- Investment suggestions: stay at the level of asset classes and fund categories (for example "large-cap index fund", "short-duration debt fund", "ELSS for 80C") unless a specific security already appears in the holdings. Do not predict returns. Only fill monthlySipPlan / monthlyStockPlan when the matching monthly budget is provided, and keep their totals within that budget; otherwise return empty arrays.
- Indian context: consider emergency funds in liquid instruments, EMI-to-income limits, 80C / 80CCD(1B) / 80D where relevant, LTCG/STCG on equity, and the difference between saving and investing. Mention tax ideas as things to check, not as definitive advice.
- Scores are integers from 0 to 100: financialHealthScore overall, and scoreBreakdown for cashflow, liquidity, debt, and investments. If an area has no data, score it 50 and say so in dataCaveats. riskAssessment describes the investment portfolio; use "Insufficient data" when there are no confirmed holdings.
- Keep it useful: 3 to 6 keyInsights and 3 to 8 recommendations, most important first. Use "security": "" and "securityType": "GENERAL" for non-investment actions, and "suggestedAmountInr": 0 when no amount applies.
- marketOutlook: one or two sentences grounded only in the market data provided; if it is missing, say market data was unavailable.
- This is educational analysis, not licensed investment advice; keep the tone factual and calm.

Reply with a single JSON object that matches the required schema, with no text before or after it.`;

  static buildPrompt(context: unknown, marketContext: unknown): ChatMessage[] {
    const userPrompt = `Analyse this person's finances and produce the report.

All amounts are in INR. Percentages are already computed. "monthly" covers the analysis period; "typicalMonth" averages the last six complete months.

DATA:
${JSON.stringify({ ...(context as object), market: marketContext })}

Required JSON shape (every key is required):
${JSON.stringify(REPORT_JSON_SCHEMA)}`;

    return [
      { role: 'system', content: this.SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];
  }

  // ── Generation with validation + one repair attempt ───────────────────────────

  static async generateReport(provider: IAIProvider, messages: ChatMessage[]) {
    const schema = { name: 'financial_advisor_report', schema: REPORT_JSON_SCHEMA };
    const options = { temperature: 0.2, maxTokens: 16000, effort: 'high' as const, jsonSchema: schema };

    const usage = { input: 0, output: 0, total: 0 };
    const track = (r: ChatResponse) => {
      usage.input += r.tokensInput || 0;
      usage.output += r.tokensOutput || 0;
      usage.total += r.tokensTotal || 0;
    };

    const first = await provider.chat(messages, options);
    track(first);
    const attempt = this.validate(first.content);
    if (attempt.ok) {
      return { report: attempt.report, raw: first.content, usage, servedModel: first.model || null };
    }

    // Repair: show the model its own output and the exact problems, ask for a corrected object.
    console.warn(`[AIAdvisorService] Report failed validation, requesting repair:\n${attempt.problems}`);
    const repair = await provider.chat(
      [
        ...messages,
        { role: 'assistant', content: first.content.slice(0, 60000) },
        {
          role: 'user',
          content: `That reply did not match the required schema:\n${attempt.problems}\n\nReturn the complete corrected JSON object only, keeping your analysis the same where it was valid.`,
        },
      ],
      options
    );
    track(repair);
    const second = this.validate(repair.content);
    if (second.ok) {
      return { report: second.report, raw: repair.content, usage, servedModel: repair.model || null };
    }
    throw new Error(`The AI response could not be turned into a valid report after one repair attempt:\n${second.problems}`);
  }

  private static validate(raw: string): { ok: true; report: AdvisorReport } | { ok: false; problems: string } {
    let parsed: unknown;
    try {
      parsed = extractJson(raw);
    } catch (e: any) {
      return { ok: false, problems: `- (root): ${e.message}` };
    }
    const result = reportValidator.safeParse(parsed);
    return result.success ? { ok: true, report: result.data } : { ok: false, problems: describeIssues(result.error) };
  }

  // ── Notification Helper ───────────────────────────────────────────────────────

  static async createNotification(
    userId: string,
    householdId: string,
    reportId: string | null,
    type: string,
    title: string,
    body: string
  ) {
    await QueryHelper.query(
      `INSERT INTO ai_advisor_notifications (user_id, household_id, report_id, title, body, type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, householdId, reportId, title, body, type]
    );
  }
}
