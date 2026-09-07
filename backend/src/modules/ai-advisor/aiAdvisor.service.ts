import { QueryHelper } from '../../database/queryHelper.js';
import { HoldingsService } from '../investments/holdings/holdings.service.js';
import { PortfolioService } from '../investments/portfolio/portfolio.service.js';
import { MarketDataService } from '../investments/prices/marketData.service.js';
import { AIProviderFactory, AIProviderType, DEFAULT_MODELS } from './providers/aiProviderFactory.js';
import { ChatMessage } from './providers/aiProvider.interface.js';

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

export interface Recommendation {
  action: 'BUY' | 'SELL' | 'HOLD' | 'SIP' | 'REBALANCE' | 'AVOID';
  security: string;
  securityType: 'STOCK' | 'MUTUAL_FUND' | 'ETF' | 'FIXED_INCOME' | 'GENERAL';
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedAmountInr?: number;
  expectedReturnPct?: number;
  timeHorizon?: string;
}

export interface StructuredReport {
  portfolioHealthScore: number;
  riskAssessment: 'Conservative' | 'Moderate' | 'Aggressive' | 'Very Aggressive';
  keyInsights: string[];
  recommendations: Recommendation[];
  rebalancingSuggestions: string[];
  monthlySipPlan?: Array<{ fund: string; amount: number; reason: string }>;
  monthlyStockPlan?: Array<{ stock: string; amount: number; reason: string }>;
  marketOutlook: string;
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

  static async upsertConfig(userId: string, householdId: string, data: Partial<AdvisorConfig>): Promise<AdvisorConfig> {
    const row = await QueryHelper.queryOne<any>(
      `INSERT INTO ai_advisor_config (
        user_id, household_id, ai_provider, model_name, api_key_override,
        schedule_cron, is_enabled, monthly_sip_budget_inr, monthly_stock_budget_inr
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id, household_id) DO UPDATE SET
        ai_provider              = EXCLUDED.ai_provider,
        model_name               = EXCLUDED.model_name,
        api_key_override         = EXCLUDED.api_key_override,
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

  static async runAnalysis(
    userId: string,
    householdId: string,
    triggeredBy: 'SCHEDULED' | 'MANUAL' = 'MANUAL'
  ): Promise<{ runId: string; reportId?: string; status: string }> {

    const cfg = await this.getConfig(userId, householdId) || await this.upsertConfig(userId, householdId, {});

    // Create run record
    const run = await QueryHelper.queryOne<{ id: string }>(
      `INSERT INTO ai_advisor_runs (user_id, household_id, triggered_by, status, ai_provider, model_name)
       VALUES ($1, $2, $3, 'RUNNING', $4, $5) RETURNING id`,
      [userId, householdId, triggeredBy, cfg.aiProvider, cfg.modelName]
    );
    const runId = run!.id;

    // Create "started" notification
    await this.createNotification(userId, householdId, null, 'AI_RUN_STARTED',
      '🤖 AI Advisor is analyzing your portfolio…',
      'Your investment analysis is running. We\'ll notify you when it\'s ready.'
    );

    try {
      // 1. Refresh market prices first
      await MarketDataService.refreshPrices(householdId);

      // 2. Build portfolio context
      const context = await this.buildPortfolioContext(userId, householdId);

      // 3. Fetch live market context (Nifty, top movers)
      const marketContext = await this.fetchMarketContext();

      // 4. Build prompt
      const messages = this.buildPrompt(context, cfg, marketContext);

      // 5. Call AI provider
      const provider = AIProviderFactory.create({
        provider: cfg.aiProvider,
        model: cfg.modelName,
        apiKeyOverride: cfg.apiKeyOverride,
      });

      const aiResponse = await provider.chat(messages, { temperature: 0.3, maxTokens: 4096 });

      // 6. Parse AI response
      const structuredReport = this.parseAIResponse(aiResponse.content);

      // 7. Store report
      const report = await QueryHelper.queryOne<{ id: string }>(
        `INSERT INTO ai_advisor_reports (
          run_id, user_id, household_id,
          portfolio_snapshot, market_context, recommendations,
          portfolio_health_score, risk_assessment, key_insights,
          raw_ai_response, is_read
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false) RETURNING id`,
        [
          runId,
          userId,
          householdId,
          JSON.stringify(context),
          JSON.stringify(marketContext),
          JSON.stringify(structuredReport.recommendations),
          structuredReport.portfolioHealthScore,
          structuredReport.riskAssessment,
          JSON.stringify(structuredReport.keyInsights),
          aiResponse.content,
        ]
      );

      // 8. Update run as completed
      await QueryHelper.query(
        `UPDATE ai_advisor_runs SET
          status = 'COMPLETED', completed_at = NOW(),
          tokens_input = $1, tokens_output = $2, tokens_total = $3,
          market_data_snapshot = $4
         WHERE id = $5`,
        [
          aiResponse.tokensInput || null,
          aiResponse.tokensOutput || null,
          aiResponse.tokensTotal || null,
          JSON.stringify(marketContext),
          runId,
        ]
      );

      // 9. Create "report ready" notification
      const topRec = structuredReport.recommendations[0];
      const summary = topRec
        ? `Top suggestion: ${topRec.action} ${topRec.security} — ${topRec.reason.substring(0, 100)}…`
        : 'Your personalized investment analysis is ready.';

      await this.createNotification(
        userId, householdId, report!.id,
        'AI_REPORT_READY',
        `✅ AI Advisor Report Ready — Health Score: ${structuredReport.portfolioHealthScore}/100`,
        summary
      );

      return { runId, reportId: report!.id, status: 'COMPLETED' };

    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error during AI analysis';
      console.error(`[AIAdvisorService] Run ${runId} failed:`, errorMsg);

      await QueryHelper.query(
        `UPDATE ai_advisor_runs SET status = 'FAILED', completed_at = NOW(), error_message = $1 WHERE id = $2`,
        [errorMsg, runId]
      );

      await this.createNotification(
        userId, householdId, null,
        'AI_RUN_FAILED',
        '❌ AI Advisor Analysis Failed',
        `An error occurred while analyzing your portfolio: ${errorMsg.substring(0, 200)}`
      );

      return { runId, status: 'FAILED' };
    }
  }

  // ── Portfolio Context Builder ─────────────────────────────────────────────────

  static async buildPortfolioContext(userId: string, householdId: string) {
    const [holdings, summary] = await Promise.all([
      HoldingsService.calculateHoldings({ householdId, userId }),
      PortfolioService.getPortfolioSummary(householdId, userId),
    ]);

    const activeHoldings = holdings
      .filter(h => h.current_quantity > 0)
      .map(h => ({
        symbol: h.symbol,
        name: h.name,
        type: h.security_type,
        quantity: h.current_quantity,
        avgCost: h.average_cost,
        currentPrice: h.current_price,
        currentValue: h.current_value,
        unrealizedPnlPct: h.unrealized_pnl_percent,
        totalInvested: h.total_invested,
        exchange: h.exchange,
        isStale: h.is_stale,
      }));

    return {
      holdings: activeHoldings,
      summary: summary.summary,
      breakdown: summary.breakdown,
      assetAllocation: summary.assetAllocation,
      capturedAt: new Date().toISOString(),
    };
  }

  // ── Market Context ────────────────────────────────────────────────────────────

  private static async fetchMarketContext() {
    try {
      // Fetch Nifty 50 index from Yahoo Finance
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
      /* silent fail — market context is supplementary */
    }
    return { fetchedAt: new Date().toISOString() };
  }

  // ── Prompt Builder ────────────────────────────────────────────────────────────

  static buildPrompt(context: any, cfg: AdvisorConfig, marketContext: any): ChatMessage[] {
    const { summary, breakdown, assetAllocation, holdings } = context;

    const allocationSummary = assetAllocation
      .map((a: any) => `  • ${a.label}: ₹${Math.round(a.amount).toLocaleString('en-IN')} (${a.percent}%)`)
      .join('\n');

    const holdingsSummary = holdings.slice(0, 15)
      .map((h: any) =>
        `  • ${h.symbol} (${h.type}): ₹${Math.round(h.currentValue).toLocaleString('en-IN')} | P&L: ${h.unrealizedPnlPct.toFixed(2)}% | Avg cost: ₹${h.avgCost.toFixed(2)}`
      ).join('\n');

    const budgetSection = [
      cfg.monthlySipBudgetInr
        ? `- Monthly SIP/MF Budget: ₹${cfg.monthlySipBudgetInr.toLocaleString('en-IN')}`
        : null,
      cfg.monthlyStockBudgetInr
        ? `- Monthly Stock Budget: ₹${cfg.monthlyStockBudgetInr.toLocaleString('en-IN')}`
        : null,
    ].filter(Boolean).join('\n') || '- No investment budget configured (provide general rebalancing advice)';

    const marketSection = marketContext.nifty50
      ? `- Nifty 50: ${marketContext.nifty50.price?.toFixed(2)} (${marketContext.nifty50.changePct?.toFixed(2)}% today)\n- Sensex: ${marketContext.sensex?.price?.toFixed(2) || 'N/A'}`
      : '- Market data unavailable';

    const systemPrompt = `You are an expert Indian equity and mutual fund investment advisor with deep knowledge of NSE/BSE markets, SEBI regulations, tax implications (STCG/LTCG), and personal finance planning. Your goal is to provide personalized, actionable, data-driven investment advice to maximize capital gains while respecting the user's existing portfolio and risk profile.

Always respond with a single valid JSON object (no markdown code fences). Follow the exact schema provided.`;

    const userPrompt = `Analyze this user's investment portfolio and provide personalized recommendations.

## PORTFOLIO SUMMARY
- Total Invested: ₹${Math.round(summary.totalInvested).toLocaleString('en-IN')}
- Current Value: ₹${Math.round(summary.totalCurrentValue).toLocaleString('en-IN')}
- Unrealized P&L: ₹${Math.round(summary.unrealizedPnL).toLocaleString('en-IN')} (${summary.unrealizedPnLPercent?.toFixed(2) || 0}%)
- XIRR: ${summary.xirr ? `${summary.xirr.toFixed(2)}%` : 'Insufficient data'}
- Holdings count: ${summary.holdingsCount}

## ASSET ALLOCATION
${allocationSummary || '  No holdings found'}

## TOP HOLDINGS
${holdingsSummary || '  No holdings found'}

## INVESTMENT BUDGET (monthly)
${budgetSection}

## MARKET CONTEXT (as of analysis)
${marketSection}

## ANALYSIS REQUIREMENTS
Provide:
1. Portfolio Health Score (0-100) based on diversification, returns, risk balance
2. Risk Assessment (Conservative / Moderate / Aggressive / Very Aggressive)
3. Key Insights (3-5 actionable observations about the portfolio)
4. Recommendations (5-10 specific BUY/SELL/HOLD/SIP/REBALANCE actions for Indian markets)
5. Rebalancing Suggestions (if allocation is imbalanced)
6. Monthly SIP Plan (only if SIP budget was provided)
7. Monthly Stock Plan (only if stock budget was provided)
8. Brief Market Outlook for next 3-6 months

Focus on: tax efficiency, diversification, sector concentration risks, underperforming holdings, and high-conviction opportunities in the current Indian market.

Respond with ONLY this exact JSON structure (no markdown fences):
{
  "portfolioHealthScore": <number 0-100>,
  "riskAssessment": "<Conservative|Moderate|Aggressive|Very Aggressive>",
  "keyInsights": ["<insight1>", "<insight2>", "<insight3>"],
  "recommendations": [
    {
      "action": "<BUY|SELL|HOLD|SIP|REBALANCE|AVOID>",
      "security": "<security name or symbol>",
      "securityType": "<STOCK|MUTUAL_FUND|ETF|FIXED_INCOME|GENERAL>",
      "reason": "<concise reason>",
      "priority": "<HIGH|MEDIUM|LOW>",
      "suggestedAmountInr": <number or null>,
      "expectedReturnPct": <number or null>,
      "timeHorizon": "<short/medium/long-term or null>"
    }
  ],
  "rebalancingSuggestions": ["<suggestion1>"],
  "monthlySipPlan": [{"fund": "<name>", "amount": <number>, "reason": "<reason>"}],
  "monthlyStockPlan": [{"stock": "<symbol>", "amount": <number>, "reason": "<reason>"}],
  "marketOutlook": "<2-3 sentence outlook>"
}`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  // ── AI Response Parser ────────────────────────────────────────────────────────

  static parseAIResponse(rawText: string): StructuredReport {
    // Strip markdown code fences if present
    let jsonText = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // Extract JSON object if wrapped in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Fallback graceful response if AI returned non-JSON
      console.warn('[AIAdvisorService] Failed to parse AI JSON, returning fallback report');
      return {
        portfolioHealthScore: 50,
        riskAssessment: 'Moderate',
        keyInsights: ['AI analysis completed. Review the raw response for details.'],
        recommendations: [],
        rebalancingSuggestions: [],
        marketOutlook: rawText.substring(0, 500),
      };
    }

    return {
      portfolioHealthScore: Math.min(100, Math.max(0, Number(parsed.portfolioHealthScore) || 50)),
      riskAssessment: parsed.riskAssessment || 'Moderate',
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((r: any) => ({
            action: r.action || 'HOLD',
            security: r.security || '',
            securityType: r.securityType || 'GENERAL',
            reason: r.reason || '',
            priority: r.priority || 'MEDIUM',
            suggestedAmountInr: r.suggestedAmountInr ? Number(r.suggestedAmountInr) : undefined,
            expectedReturnPct: r.expectedReturnPct ? Number(r.expectedReturnPct) : undefined,
            timeHorizon: r.timeHorizon || undefined,
          }))
        : [],
      rebalancingSuggestions: Array.isArray(parsed.rebalancingSuggestions) ? parsed.rebalancingSuggestions : [],
      monthlySipPlan: Array.isArray(parsed.monthlySipPlan) ? parsed.monthlySipPlan : undefined,
      monthlyStockPlan: Array.isArray(parsed.monthlyStockPlan) ? parsed.monthlyStockPlan : undefined,
      marketOutlook: parsed.marketOutlook || '',
    };
  }

  // ── Notification Helper ───────────────────────────────────────────────────────

  private static async createNotification(
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
