import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { QueryHelper } from '../../database/queryHelper.js';
import { toLocalDateString } from '../../utils/date.js';
import { HoldingsService } from '../investments/holdings/holdings.service.js';
import { MarketDataService } from '../investments/prices/marketData.service.js';
import { FinancialInsightsService } from '../analytics/financialInsights.service.js';
import { AIAdvisorService } from '../ai-advisor/aiAdvisor.service.js';
import { PortfolioSignalsService } from '../ai-advisor/portfolioSignals.service.js';
import { McpAuthContext, McpScope, McpTokensService } from './mcpTokens.service.js';

/**
 * PFinanc MCP server. One instance is created per request (stateless Streamable HTTP) and bound to the
 * token holder's identity, so a tool can only ever read what that user (and token scopes) allow.
 * Every tool is read-only: assistants can analyse, they cannot change anything.
 */

const SERVER_INSTRUCTIONS = `PFinanc is a self-hosted personal finance app. These tools give read-only access to the user's investment portfolio so you can analyse it and help them think through buy / hold / sell decisions.

Suggested workflow:
1. get_portfolio_overview for totals, allocation and concentration.
2. list_holdings (and get_holding for detail) to see each position with cost, price and holding period.
3. get_portfolio_signals for rule-based flags (overweight, deep losses, lots turning long-term, structural gaps).
4. get_live_quotes and get_market_snapshot to check current prices, then use your own research tools if you have them for company news, valuation and outlook.
5. Present a clear report: what looks strong, what to review for reducing, what to consider adding, with reasons that cite the numbers.

Rules: amounts are INR. Be explicit that this is analysis, not licensed financial advice; the user decides. Prefer asset-class and diversification reasoning; do not promise returns. If prices are stale or data is missing, say so.`;

type ScopeArg = 'personal' | 'household';

class ToolDenied extends Error {}

export function createPfinancMcpServer(ctx: McpAuthContext): McpServer {
  const server = new McpServer({ name: 'pfinanc', version: '1.0.0' }, { instructions: SERVER_INSTRUCTIONS });

  const scopeSchema = z
    .enum(['personal', 'household'])
    .optional()
    .describe('"personal" (default) = the token owner\'s own accounts. "household" = all family members; needs a connection created with the household option.');

  const requireScope = (scope: McpScope) => {
    if (!ctx.scopes.includes(scope)) {
      throw new ToolDenied(`This connection does not have the "${scope}" permission. Create a new connection in PFinanc with that option enabled.`);
    }
  };

  const resolveScope = (requested?: ScopeArg): ScopeArg => {
    if (requested === 'household') {
      requireScope('household');
      return 'household';
    }
    return 'personal';
  };

  /** Wraps a tool: scope check, error handling, audit log (tool name only - never the data returned). */
  const tool = <T extends z.ZodRawShape>(
    name: string,
    meta: { title: string; description: string; scope: McpScope; openWorld?: boolean },
    shape: T,
    fn: (args: z.infer<z.ZodObject<T>>) => Promise<unknown>
  ) => {
    server.registerTool(
      name,
      {
        title: meta.title,
        description: meta.description,
        inputSchema: shape,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: !!meta.openWorld },
      },
      (async (args: any) => {
        const started = Date.now();
        try {
          requireScope(meta.scope);
          const data = await fn(args);
          await McpTokensService.logActivity(ctx.tokenId, name, 'OK', Date.now() - started);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        } catch (err: any) {
          const denied = err instanceof ToolDenied;
          await McpTokensService.logActivity(ctx.tokenId, name, denied ? 'DENIED' : 'ERROR', Date.now() - started);
          return { isError: true, content: [{ type: 'text' as const, text: denied ? err.message : `Could not complete "${name}": ${err?.message || 'unexpected error'}` }] };
        }
      }) as any
    );
  };

  // ── Portfolio ──────────────────────────────────────────────────────────────

  tool(
    'get_portfolio_overview',
    {
      title: 'Portfolio overview',
      description: 'Total value, invested amount, unrealised P&L, XIRR, asset allocation and concentration (largest position, top-3 weight). Start here.',
      scope: 'investments',
    },
    { scope: scopeSchema },
    async ({ scope }) => {
      const s = await PortfolioSignalsService.compute(ctx.householdId, ctx.userId, resolveScope(scope));
      const cfg = await AIAdvisorService.getConfig(ctx.userId, ctx.householdId);
      return {
        asOf: s.asOf,
        scope: s.scope,
        totals: s.totals,
        allocation: s.allocation,
        concentration: s.concentration,
        investmentBudget: { monthlySipInr: cfg?.monthlySipBudgetInr ?? null, monthlyStockInr: cfg?.monthlyStockBudgetInr ?? null },
        note: 'Amounts in INR. Use list_holdings for per-position detail.',
      };
    }
  );

  tool(
    'list_holdings',
    {
      title: 'List holdings',
      description: 'Current positions with quantity, average cost, current price, value, P&L %, portfolio weight and holding period (long-term vs short-term units).',
      scope: 'investments',
    },
    {
      scope: scopeSchema,
      sortBy: z.enum(['value', 'pnlPct', 'weight', 'name']).optional().describe('Default "value"'),
      securityType: z.enum(['STOCK', 'MUTUAL_FUND', 'ETF', 'OTHER']).optional(),
      limit: z.number().int().min(1).max(100).optional().describe('Default 50'),
    },
    async ({ scope, sortBy, securityType, limit }) => {
      const s = await PortfolioSignalsService.compute(ctx.householdId, ctx.userId, resolveScope(scope));
      let list = s.positions;
      if (securityType) list = list.filter((p) => p.securityType === securityType);
      const key = sortBy || 'value';
      list = [...list].sort((a, b) =>
        key === 'pnlPct' ? b.unrealizedPnlPct - a.unrealizedPnlPct : key === 'weight' ? b.weightPct - a.weightPct : key === 'name' ? a.name.localeCompare(b.name) : b.currentValue - a.currentValue
      );
      return { count: list.length, positions: list.slice(0, limit || 50) };
    }
  );

  tool(
    'get_holding',
    {
      title: 'Holding detail',
      description: 'One position in depth: buy lots (date, quantity, unit cost), realised P&L, dividends and recent transactions.',
      scope: 'investments',
    },
    { symbol: z.string().min(1).max(100).describe('Ticker or scheme symbol as shown in list_holdings'), scope: scopeSchema },
    async ({ symbol, scope }) => {
      const sc = resolveScope(scope);
      const userId = sc === 'personal' ? ctx.userId : undefined;
      const all = await HoldingsService.calculateHoldings({ householdId: ctx.householdId, userId });
      const matches = all.filter((h) => h.symbol.toUpperCase() === symbol.toUpperCase());
      if (matches.length === 0) throw new Error(`No holding with symbol "${symbol}" was found. Call list_holdings to see valid symbols.`);
      const h = matches[0];
      const params: any[] = [ctx.householdId, h.security_id];
      let owner = '';
      if (userId) { params.push(userId); owner = ` AND a.owner_user_id = $3`; }
      const txns = await QueryHelper.query<any>(
        `SELECT it.transaction_type AS type, it.transaction_date AS date, CAST(it.quantity AS FLOAT) AS quantity,
                CAST(it.price_per_unit AS FLOAT) AS price, CAST(it.gross_amount AS FLOAT) AS amount, CAST(it.fees AS FLOAT) AS fees
         FROM investment_transactions it JOIN accounts a ON a.id = it.investment_account_id
         WHERE it.household_id = $1 AND it.security_id = $2 AND it.status = 'CONFIRMED'${owner}
         ORDER BY it.transaction_date DESC, it.created_at DESC LIMIT 25`,
        params
      );
      return {
        symbol: h.symbol, name: h.name, type: h.security_type, exchange: h.exchange,
        quantity: h.current_quantity, averageCost: h.average_cost, currentPrice: h.current_price, priceDate: h.price_date, priceIsStale: h.is_stale,
        invested: Math.round(h.total_invested), currentValue: Math.round(h.current_value),
        unrealizedPnl: Math.round(h.unrealized_pnl), unrealizedPnlPct: Number(h.unrealized_pnl_percent.toFixed(2)),
        realizedPnl: Math.round(h.realized_pnl), totalDividends: Math.round(h.total_dividends),
        lots: (h.lots || []).map((l) => ({ date: l.date, quantity: l.quantity, unitCost: l.unitCost })),
        recentTransactions: txns,
      };
    }
  );

  tool(
    'list_investment_transactions',
    {
      title: 'Investment transactions',
      description: 'Trades, SIPs, dividends and other investment transactions, newest first. Filter by symbol, type and time window.',
      scope: 'investments',
    },
    {
      scope: scopeSchema,
      symbol: z.string().max(100).optional(),
      type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'SIP', 'REDEMPTION', 'BONUS', 'SPLIT', 'INTEREST', 'FEE', 'TAX', 'OTHER']).optional(),
      days: z.number().int().min(1).max(3650).optional().describe('Look back this many days. Default 365'),
      limit: z.number().int().min(1).max(200).optional().describe('Default 50'),
    },
    async ({ scope, symbol, type, days, limit }) => {
      const sc = resolveScope(scope);
      const params: any[] = [ctx.householdId, toLocalDateString(new Date(Date.now() - (days || 365) * 86_400_000))];
      let where = `it.household_id = $1 AND it.status = 'CONFIRMED' AND it.transaction_date >= $2`;
      if (sc === 'personal') { params.push(ctx.userId); where += ` AND a.owner_user_id = $${params.length}`; }
      if (symbol) { params.push(symbol.toUpperCase()); where += ` AND UPPER(s.symbol) = $${params.length}`; }
      if (type) { params.push(type); where += ` AND it.transaction_type = $${params.length}`; }
      params.push(limit || 50);
      const rows = await QueryHelper.query<any>(
        `SELECT it.transaction_date AS date, it.transaction_type AS type, s.symbol, s.name,
                CAST(it.quantity AS FLOAT) AS quantity, CAST(it.price_per_unit AS FLOAT) AS price,
                CAST(it.gross_amount AS FLOAT) AS amount, CAST(it.fees AS FLOAT) AS fees
         FROM investment_transactions it
         JOIN accounts a ON a.id = it.investment_account_id
         LEFT JOIN securities s ON s.id = it.security_id
         WHERE ${where} ORDER BY it.transaction_date DESC, it.created_at DESC LIMIT $${params.length}`,
        params
      );
      return { count: rows.length, transactions: rows };
    }
  );

  tool(
    'get_portfolio_signals',
    {
      title: 'Portfolio signals',
      description:
        'Rule-based observations from the user\'s own data: overweight or concentrated positions, deep losses (tax-loss review), big winners, lots turning long-term soon, stale prices, and structural gaps worth adding. These are prompts for review, not instructions to trade.',
      scope: 'investments',
    },
    { scope: scopeSchema },
    async ({ scope }) => {
      const s = await PortfolioSignalsService.compute(ctx.householdId, ctx.userId, resolveScope(scope));
      return { asOf: s.asOf, reviewForReducing: s.reviewForReducing, reviewForAdding: s.reviewForAdding, flags: s.flags, caveats: s.caveats };
    }
  );

  // ── Market ─────────────────────────────────────────────────────────────────

  tool(
    'get_live_quotes',
    {
      title: 'Live quotes',
      description:
        'Fetch current prices from the app\'s market-data providers. Omit "symbols" to quote every current holding, or pass NSE/BSE tickers (up to 20) to check any stock, including ones not owned. Compares the live price with the last stored price. Mutual fund NAVs are best-effort.',
      scope: 'investments',
      openWorld: true,
    },
    {
      symbols: z.array(z.string().min(1).max(30)).max(20).optional().describe('e.g. ["RELIANCE","TCS"]. Default: all holdings'),
      exchange: z.enum(['NSE', 'BSE']).optional().describe('Exchange for symbols not in the portfolio. Default NSE'),
      scope: scopeSchema,
    },
    async ({ symbols, exchange, scope }) => {
      const sc = resolveScope(scope);
      const holdings = await HoldingsService.calculateHoldings({ householdId: ctx.householdId, userId: sc === 'personal' ? ctx.userId : undefined });
      const active = holdings.filter((h) => h.current_quantity > 0);
      const bySymbol = new Map(active.map((h) => [h.symbol.toUpperCase(), h]));

      const wanted = symbols && symbols.length ? symbols.map((s) => s.toUpperCase()) : active.slice(0, 40).map((h) => h.symbol.toUpperCase());
      const secs = wanted.map((sym) => {
        const h = bySymbol.get(sym);
        return h
          ? { id: h.security_id, symbol: h.symbol, isin: h.isin, exchange: h.exchange, security_type: h.security_type }
          : { id: `adhoc:${sym}`, symbol: sym, isin: null, exchange: exchange || 'NSE', security_type: 'STOCK' };
      });
      const quotes = await MarketDataService.getLiveQuotes(secs);
      return {
        fetchedAt: new Date().toISOString(),
        quotes: secs.map((sec) => {
          const q = quotes.get(sec.id);
          const h = bySymbol.get(sec.symbol.toUpperCase());
          const stored = h?.current_price ?? null;
          return {
            symbol: sec.symbol,
            owned: !!h,
            livePrice: q?.price ?? null,
            open: q?.open ?? null, high: q?.high ?? null, low: q?.low ?? null,
            priceDate: q?.priceDate ?? null, source: q?.source ?? null, currency: q?.currency ?? 'INR',
            storedPrice: stored,
            changeVsStoredPct: q && stored ? Number((((q.price - stored) / stored) * 100).toFixed(2)) : null,
            available: !!q,
          };
        }),
        note: 'Quotes come from free data sources and may be delayed. A null price means no quote was available for that symbol.',
      };
    }
  );

  tool(
    'get_market_snapshot',
    {
      title: 'Market snapshot',
      description: 'Latest Nifty 50 and Sensex levels with the day\'s change, for market context.',
      scope: 'investments',
      openWorld: true,
    },
    {},
    async () => AIAdvisorService.fetchMarketContext()
  );

  // ── Cash flow & AI report ──────────────────────────────────────────────────

  tool(
    'get_cashflow_summary',
    {
      title: 'Cash-flow summary',
      description: 'Aggregated income, spending, savings rate, emergency-fund months, EMI load and top categories for the last N months. No individual transactions or merchant names. Useful to judge how much the user can invest.',
      scope: 'cashflow',
    },
    { months: z.number().int().min(1).max(12).optional().describe('Default 6') },
    async ({ months }) => {
      const member = await QueryHelper.queryOne<{ role: string }>(`SELECT role FROM household_members WHERE household_id = $1 AND user_id = $2`, [ctx.householdId, ctx.userId]);
      const now = new Date();
      const start = toLocalDateString(new Date(now.getFullYear(), now.getMonth() - ((months || 6) - 1), 1));
      const o = await FinancialInsightsService.getOverview({
        householdId: ctx.householdId, userId: ctx.userId, role: member?.role, scope: 'personal', startDate: start, endDate: toLocalDateString(now),
      });
      return {
        period: o.period,
        kpis: o.kpis,
        monthly: o.monthly,
        topExpenseCategories: o.expenseCategories.slice(0, 10).map((c) => ({ category: c.category_name, amount: c.total_amount, sharePct: c.share_pct, changePct: c.change_pct })),
        incomeSources: o.incomeCategories.slice(0, 6).map((c) => ({ source: c.category_name, amount: c.total_amount })),
      };
    }
  );

  tool(
    'get_latest_ai_report',
    {
      title: 'Latest PFinanc AI report',
      description: 'The most recent AI money check-up generated inside PFinanc (health score, insights, recommendations), if the user has run one.',
      scope: 'investments',
    },
    {},
    async () => {
      const row: any = await AIAdvisorService.getLatestReport(ctx.userId, ctx.householdId);
      if (!row?.report) return { available: false, note: 'No AI report has been generated yet. Ask the user to run a check-up in PFinanc.' };
      return { available: true, createdAt: row.created_at, model: row.served_model || row.model_name, report: row.report };
    }
  );

  // ── Prompts (ready-made analyses a user can launch from their assistant) ───

  const promptText = (body: string) => ({ messages: [{ role: 'user' as const, content: { type: 'text' as const, text: body } }] });
  const DISCLAIMER = 'Finish with a short note that this is analysis for the user to weigh, not licensed financial advice.';

  server.registerPrompt(
    'portfolio_review',
    { title: 'Full portfolio review', description: 'A complete review of the portfolio with strengths, risks and next steps.' },
    () =>
      promptText(
        `Review my investment portfolio using the PFinanc tools. Call get_portfolio_overview, list_holdings, get_portfolio_signals and get_market_snapshot. Then write a report with: (1) a 3-line summary, (2) what is working, (3) risks (concentration, losses, stale data), (4) three concrete next steps, each citing the numbers. Keep it plain-language. ${DISCLAIMER}`
      )
  );

  server.registerPrompt(
    'rebalance_ideas',
    {
      title: 'What to sell and what to buy',
      description: 'Positions to consider trimming or exiting and areas to add to, with reasons and tax awareness.',
      argsSchema: { goal: z.string().optional().describe('e.g. "long-term growth", "regular income", "reduce risk"') },
    },
    ({ goal }) =>
      promptText(
        `My goal: ${goal || 'balanced long-term growth'}. Using the PFinanc tools (get_portfolio_signals, list_holdings, get_holding for any flagged position, get_live_quotes), tell me: which positions I should consider reducing or exiting and why; which asset classes or categories I should consider adding to (and a rough % of new money); and the tax angle (units close to the 12-month long-term mark, losses that could offset gains). If you have web research tools, check recent news and valuation for the specific stocks you mention and say what you found. Make clear which parts come from my data and which from your research. ${DISCLAIMER}`
      )
  );

  server.registerPrompt(
    'price_check',
    {
      title: 'Check current prices',
      description: 'Live prices for holdings or given tickers, and what changed versus the last stored price.',
      argsSchema: { symbols: z.string().optional().describe('Comma-separated tickers, e.g. "RELIANCE,TCS". Empty = all holdings') },
    },
    ({ symbols }) =>
      promptText(
        `Call get_live_quotes${symbols ? ` for ${symbols}` : ' for all my holdings'} and get_market_snapshot. Show a compact table (symbol, live price, change vs stored, my P&L %) and call out anything that moved more than 3%. If prices are missing or stale, say so. ${DISCLAIMER}`
      )
  );

  server.registerPrompt(
    'monthly_investing_plan',
    { title: 'Plan this month\'s investing', description: 'How much I can invest this month and where to put it.' },
    () =>
      promptText(
        `Use get_cashflow_summary, get_portfolio_overview and get_portfolio_signals to suggest how much I can comfortably invest this month (respect emergency-fund months and EMI load) and how to split it across asset classes given my current allocation and my SIP/stock budgets. Show your reasoning with the numbers. ${DISCLAIMER}`
      )
  );

  return server;
}
