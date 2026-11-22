import { MCP_SCOPE_INFO, McpScope } from './mcpTokens.service.js';

/** Human-readable list of what an assistant can do with a connection. Shown in the web and mobile setup guides. */
export const MCP_TOOL_CATALOG: Array<{ name: string; description: string; scope: McpScope }> = [
  { name: 'get_portfolio_overview', description: 'Total value, P&L, XIRR, allocation and concentration', scope: 'investments' },
  { name: 'list_holdings', description: 'Every position with cost, price, P&L, weight and holding period', scope: 'investments' },
  { name: 'get_holding', description: 'One position in depth: buy lots, dividends, recent trades', scope: 'investments' },
  { name: 'list_investment_transactions', description: 'Trades, SIPs and dividends over a time window', scope: 'investments' },
  { name: 'get_portfolio_signals', description: 'Rule-based flags: overweight, deep losses, lots turning long-term, gaps to fill', scope: 'investments' },
  { name: 'get_live_quotes', description: 'Current prices for your holdings or any NSE/BSE ticker', scope: 'investments' },
  { name: 'get_market_snapshot', description: 'Nifty 50 and Sensex levels', scope: 'investments' },
  { name: 'get_latest_ai_report', description: 'Your latest PFinanc AI check-up', scope: 'investments' },
  { name: 'get_cashflow_summary', description: 'Income, spending and savings totals (no transaction details)', scope: 'cashflow' },
];

export const MCP_PROMPT_CATALOG: Array<{ name: string; title: string }> = [
  { name: 'portfolio_review', title: 'Full portfolio review' },
  { name: 'rebalance_ideas', title: 'What to sell and what to buy' },
  { name: 'price_check', title: 'Check current prices' },
  { name: 'monthly_investing_plan', title: "Plan this month's investing" },
];

export { MCP_SCOPE_INFO };
