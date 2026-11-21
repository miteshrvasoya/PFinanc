import { QueryHelper } from '../../database/queryHelper.js';
import { accessibleAccountSql, isPrivilegedRole } from '../../middleware/rbac.js';
import { INCOME_REPORT_SQL, EXPENSE_REPORT_SQL, CREDIT_TYPES_SQL, DEBIT_TYPES_SQL } from '../accounts/ledgerTypes.js';
import { toLocalDateString } from '../../utils/date.js';

/**
 * Deterministic financial facts + rule-based insights.
 * Powers the Analytics page and is the grounding data given to the AI advisor, so every number the
 * LLM sees is computed here (never estimated by the model).
 */

export type InsightScope = 'personal' | 'household';
export type InsightSeverity = 'positive' | 'info' | 'warning' | 'critical';
export type InsightArea = 'cashflow' | 'spending' | 'savings' | 'debt' | 'liquidity' | 'investments' | 'budget' | 'data_quality';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  area: InsightArea;
  title: string;
  detail: string;
}

export interface OverviewParams {
  householdId: string;
  userId: string;
  role?: string;
  scope?: InsightScope;
  startDate?: string; // YYYY-MM-DD inclusive
  endDate?: string; // YYYY-MM-DD inclusive
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (part: number, whole: number) => (whole > 0 ? round2((part / whole) * 100) : null);
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s: string, days: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}
function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86_400_000) + 1;
}
function monthStart(d: Date): string {
  return toLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
}

export class FinancialInsightsService {
  /** Accounts in scope, as a SQL predicate on alias `a` (params appended to `params`). */
  private static accountScope(p: OverviewParams, params: any[]): string {
    const scope = p.scope || 'household';
    if (scope === 'personal') {
      params.push(p.userId);
      return `a.owner_user_id = $${params.length}`;
    }
    if (!isPrivilegedRole(p.role)) {
      params.push(p.userId);
      return accessibleAccountSql('a', `$${params.length}`);
    }
    return 'true';
  }

  static async getOverview(p: OverviewParams) {
    const today = toLocalDateString();
    const endDate = p.endDate || today;
    const startDate = p.startDate || monthStart(new Date(parseYmd(endDate).getFullYear(), parseYmd(endDate).getMonth() - 5, 1));
    const lengthDays = Math.max(1, daysBetween(startDate, endDate));
    const prevEnd = addDays(startDate, -1);
    const prevStart = addDays(prevEnd, -(lengthDays - 1));

    // Six complete months before the current month: the baseline for "typical" monthly figures.
    const now = new Date();
    const baselineStart = monthStart(new Date(now.getFullYear(), now.getMonth() - 6, 1));
    const baselineEnd = addDays(monthStart(now), -1);

    const [period, previous, monthly, categories, prevCategories, merchants, largest, recurring, balances, loans, baseline, budgets, quality] =
      await Promise.all([
        this.totals(p, startDate, endDate),
        this.totals(p, prevStart, prevEnd),
        this.monthlySeries(p, startDate, endDate),
        this.categoryBreakdown(p, startDate, endDate),
        this.categoryBreakdown(p, prevStart, prevEnd),
        this.topMerchants(p, startDate, endDate),
        this.largestExpenses(p, startDate, endDate),
        this.recurringPayments(p),
        this.liquidBalances(p),
        this.loanSummary(p),
        this.totals(p, baselineStart, baselineEnd),
        this.budgetStatus(p),
        this.dataQuality(p, startDate, endDate),
      ]);

    const baselineMonths = 6;
    const avgMonthlyIncome = round2(baseline.income / baselineMonths);
    const avgMonthlyExpense = round2(baseline.expense / baselineMonths);
    const avgMonthlyOutflow = round2((baseline.expense + baseline.emi) / baselineMonths);
    const avgMonthlyInvested = round2(baseline.netInvested / baselineMonths);

    const prevByCategory = new Map(prevCategories.expense.map((c) => [c.category_name, c.total_amount]));
    const expenseCategories = categories.expense.map((c) => ({
      ...c,
      share_pct: pct(c.total_amount, period.expense),
      previous_amount: round2(prevByCategory.get(c.category_name) || 0),
      change_pct: prevByCategory.get(c.category_name) ? pct(c.total_amount - prevByCategory.get(c.category_name)!, prevByCategory.get(c.category_name)!) : null,
    }));

    const kpis = {
      income: period.income,
      expense: period.expense,
      netSavings: round2(period.income - period.expense),
      savingsRatePct: pct(period.income - period.expense, period.income),
      emiPaid: period.emi,
      netInvested: period.netInvested,
      investmentRatePct: pct(period.netInvested, period.income),
      previous: {
        income: previous.income,
        expense: previous.expense,
        savingsRatePct: pct(previous.income - previous.expense, previous.income),
      },
      incomeChangePct: previous.income > 0 ? pct(period.income - previous.income, previous.income) : null,
      expenseChangePct: previous.expense > 0 ? pct(period.expense - previous.expense, previous.expense) : null,
      liquidBalance: balances.liquid,
      creditCardDue: balances.creditCardDue,
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgMonthlyInvested,
      emergencyFundMonths: avgMonthlyOutflow > 0 ? round2(balances.liquid / avgMonthlyOutflow) : null,
      loanOutstanding: loans.outstanding,
      monthlyEmi: loans.monthlyEmi,
      emiToIncomePct: pct(loans.monthlyEmi, avgMonthlyIncome),
      recurringMonthlyTotal: round2(recurring.reduce((s, r) => s + r.monthly_estimate, 0)),
    };

    const overview = {
      scope: p.scope || 'household',
      period: { startDate, endDate, days: lengthDays },
      previousPeriod: { startDate: prevStart, endDate: prevEnd },
      kpis,
      monthly,
      expenseCategories,
      incomeCategories: categories.income.map((c) => ({ ...c, share_pct: pct(c.total_amount, period.income) })),
      topMerchants: merchants,
      largestExpenses: largest,
      recurringPayments: recurring,
      loans: loans.items,
      budgets,
      dataQuality: quality,
      generatedAt: new Date().toISOString(),
    };

    return { ...overview, insights: this.deriveInsights(overview) };
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  private static async totals(p: OverviewParams, start: string, end: string) {
    const params: any[] = [p.householdId, start, end];
    const scope = this.accountScope(p, params);
    const row = await QueryHelper.queryOne<any>(
      `SELECT
         COALESCE(SUM(CASE WHEN t.transaction_type IN (${INCOME_REPORT_SQL}) THEN t.amount END), 0)::float AS income,
         COALESCE(SUM(CASE WHEN t.transaction_type IN (${EXPENSE_REPORT_SQL}) THEN t.amount END), 0)::float AS expense,
         COALESCE(SUM(CASE WHEN t.transaction_type = 'EMI_PAYMENT' THEN t.amount END), 0)::float AS emi,
         COALESCE(SUM(CASE WHEN t.transaction_type = 'INVESTMENT_PURCHASE' THEN t.amount
                           WHEN t.transaction_type = 'INVESTMENT_REDEMPTION' THEN -t.amount END), 0)::float AS net_invested
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE t.household_id = $1 AND t.status = 'CONFIRMED'
         AND t.transaction_date BETWEEN $2 AND $3 AND ${scope}`,
      params
    );
    return {
      income: round2(row?.income),
      expense: round2(row?.expense),
      emi: round2(row?.emi),
      netInvested: round2(row?.net_invested),
    };
  }

  private static async monthlySeries(p: OverviewParams, start: string, end: string) {
    const params: any[] = [p.householdId, start, end];
    const scope = this.accountScope(p, params);
    const rows = await QueryHelper.query<any>(
      `WITH months AS (
         SELECT generate_series(date_trunc('month', $2::date), date_trunc('month', $3::date), interval '1 month')::date AS m
       )
       SELECT TO_CHAR(m.m, 'YYYY-MM') AS month_key, TO_CHAR(m.m, 'Mon YY') AS month_label,
         COALESCE(SUM(CASE WHEN t.transaction_type IN (${INCOME_REPORT_SQL}) THEN t.amount END), 0)::float AS income,
         COALESCE(SUM(CASE WHEN t.transaction_type IN (${EXPENSE_REPORT_SQL}) THEN t.amount END), 0)::float AS expense,
         COALESCE(SUM(CASE WHEN t.transaction_type = 'EMI_PAYMENT' THEN t.amount END), 0)::float AS emi,
         COALESCE(SUM(CASE WHEN t.transaction_type = 'INVESTMENT_PURCHASE' THEN t.amount
                           WHEN t.transaction_type = 'INVESTMENT_REDEMPTION' THEN -t.amount END), 0)::float AS invested
       FROM months m
       LEFT JOIN transactions t ON t.household_id = $1 AND t.status = 'CONFIRMED'
         AND t.transaction_date BETWEEN GREATEST(m.m, $2::date) AND LEAST((m.m + interval '1 month - 1 day')::date, $3::date)
         AND EXISTS (SELECT 1 FROM accounts a WHERE a.id = t.account_id AND ${scope})
       GROUP BY m.m ORDER BY m.m`,
      params
    );
    return rows.map((r) => ({
      month_key: r.month_key,
      month_label: r.month_label,
      income: round2(r.income),
      expense: round2(r.expense),
      emi: round2(r.emi),
      invested: round2(r.invested),
      net: round2(r.income - r.expense),
      savings_rate_pct: pct(r.income - r.expense, r.income),
    }));
  }

  /** Category totals with split attribution and parent-category roll-up. */
  private static async categoryBreakdown(p: OverviewParams, start: string, end: string) {
    const params: any[] = [p.householdId, start, end];
    const scope = this.accountScope(p, params);
    const rows = await QueryHelper.query<any>(
      `SELECT
         CASE WHEN t.transaction_type IN (${INCOME_REPORT_SQL}) THEN 'INCOME' ELSE 'EXPENSE' END AS kind,
         COALESCE(c.name, 'Uncategorized') AS category_name,
         COALESCE(pc.name, c.name, 'Uncategorized') AS parent_name,
         COALESCE(c.color, pc.color, '#94a3b8') AS category_color,
         COUNT(DISTINCT t.id)::int AS transaction_count,
         SUM(parts.amount)::float AS total_amount
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN LATERAL (
         SELECT ts.category_id, ts.amount FROM transaction_splits ts WHERE ts.parent_transaction_id = t.id
         UNION ALL
         SELECT t.category_id, t.amount WHERE NOT EXISTS (SELECT 1 FROM transaction_splits s2 WHERE s2.parent_transaction_id = t.id)
       ) parts ON true
       LEFT JOIN categories c ON c.id = parts.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_category_id
       WHERE t.household_id = $1 AND t.status = 'CONFIRMED' AND t.transaction_date BETWEEN $2 AND $3
         AND t.transaction_type IN (${INCOME_REPORT_SQL}, ${EXPENSE_REPORT_SQL}) AND ${scope}
       GROUP BY 1, 2, 3, 4
       ORDER BY total_amount DESC`,
      params
    );
    const map = (kind: string) =>
      rows
        .filter((r) => r.kind === kind)
        .map((r) => ({
          category_name: r.category_name,
          parent_name: r.parent_name,
          category_color: r.category_color,
          transaction_count: r.transaction_count,
          total_amount: round2(r.total_amount),
        }));
    return { expense: map('EXPENSE'), income: map('INCOME') };
  }

  private static async topMerchants(p: OverviewParams, start: string, end: string) {
    const params: any[] = [p.householdId, start, end];
    const scope = this.accountScope(p, params);
    return QueryHelper.query<any>(
      `SELECT COALESCE(NULLIF(t.merchant_name, ''), t.description) AS merchant,
              COUNT(*)::int AS transaction_count, SUM(t.amount)::float AS total_amount,
              MAX(c.name) AS category_name
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.household_id = $1 AND t.status = 'CONFIRMED' AND t.transaction_date BETWEEN $2 AND $3
         AND t.transaction_type IN (${EXPENSE_REPORT_SQL}) AND ${scope}
       GROUP BY 1 ORDER BY total_amount DESC LIMIT 10`,
      params
    );
  }

  private static async largestExpenses(p: OverviewParams, start: string, end: string) {
    const params: any[] = [p.householdId, start, end];
    const scope = this.accountScope(p, params);
    return QueryHelper.query<any>(
      `SELECT t.id, t.transaction_date, t.description, COALESCE(t.merchant_name, '') AS merchant,
              t.amount::float AS amount, c.name AS category_name, t.needs_review
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.household_id = $1 AND t.status = 'CONFIRMED' AND t.transaction_date BETWEEN $2 AND $3
         AND t.transaction_type IN (${EXPENSE_REPORT_SQL}) AND ${scope}
       ORDER BY t.amount DESC LIMIT 8`,
      params
    );
  }

  /**
   * Payments to the same merchant in at least 3 of the last 6 months with a stable amount
   * (subscriptions, rent, SIPs, EMIs, card bills).
   */
  private static async recurringPayments(p: OverviewParams) {
    const params: any[] = [p.householdId];
    const scope = this.accountScope(p, params);
    const rows = await QueryHelper.query<any>(
      `WITH monthly AS (
         SELECT COALESCE(NULLIF(t.merchant_name, ''), t.description) AS merchant,
                t.transaction_type, MAX(c.name) AS category_name,
                date_trunc('month', t.transaction_date) AS m, SUM(t.amount) AS amt
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.household_id = $1 AND t.status = 'CONFIRMED'
           AND t.transaction_date >= date_trunc('month', CURRENT_DATE) - interval '6 months'
           AND t.transaction_type IN (${EXPENSE_REPORT_SQL}, 'EMI_PAYMENT', 'INVESTMENT_PURCHASE')
           AND ${scope}
         GROUP BY 1, 2, 4
       )
       SELECT merchant, transaction_type, MAX(category_name) AS category_name,
              COUNT(*)::int AS months_seen,
              AVG(amt)::float AS monthly_estimate,
              (STDDEV_POP(amt) / NULLIF(AVG(amt), 0))::float AS variability,
              MAX(m)::date AS last_month
       FROM monthly
       GROUP BY merchant, transaction_type
       HAVING COUNT(*) >= 3 AND (STDDEV_POP(amt) / NULLIF(AVG(amt), 0)) < 0.35
       ORDER BY monthly_estimate DESC
       LIMIT 15`,
      params
    );
    return rows.map((r) => ({
      merchant: r.merchant,
      kind: r.transaction_type === 'EMI_PAYMENT' ? 'EMI' : r.transaction_type === 'INVESTMENT_PURCHASE' ? 'INVESTMENT' : 'EXPENSE',
      category_name: r.category_name,
      months_seen: r.months_seen,
      monthly_estimate: round2(r.monthly_estimate),
      last_month: r.last_month,
    }));
  }

  private static async liquidBalances(p: OverviewParams) {
    const params: any[] = [p.householdId];
    const scope = this.accountScope(p, params);
    const rows = await QueryHelper.query<any>(
      `SELECT a.account_type,
              (a.opening_balance
               + COALESCE(SUM(CASE WHEN t.status = 'CONFIRMED' AND (t.transaction_type IN (${CREDIT_TYPES_SQL}) OR (t.transaction_type = 'TRANSFER' AND tr.destination_account_id = a.id)) THEN t.amount END), 0)
               - COALESCE(SUM(CASE WHEN t.status = 'CONFIRMED' AND (t.transaction_type IN (${DEBIT_TYPES_SQL}) OR (t.transaction_type = 'TRANSFER' AND tr.source_account_id = a.id)) THEN t.amount END), 0)
              )::float AS balance
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       LEFT JOIN transfers tr ON tr.id = t.transfer_id
       WHERE a.household_id = $1 AND a.is_active = true AND a.account_type IN ('BANK','CASH','WALLET','CREDIT_CARD') AND ${scope}
       GROUP BY a.id`,
      params
    );
    let liquid = 0;
    let creditCardDue = 0;
    for (const r of rows) {
      if (r.account_type === 'CREDIT_CARD') creditCardDue += Math.max(0, -r.balance);
      else liquid += Math.max(0, r.balance);
    }
    return { liquid: round2(liquid), creditCardDue: round2(creditCardDue) };
  }

  private static async loanSummary(p: OverviewParams) {
    const params: any[] = [p.householdId];
    let scopeSql = 'true';
    if ((p.scope || 'household') === 'personal') {
      params.push(p.userId);
      scopeSql = `l.linked_account_id IN (SELECT id FROM accounts WHERE owner_user_id = $${params.length})`;
    }
    const items = await QueryHelper.query<any>(
      `SELECT l.name, l.loan_type, l.counterparty, l.principal_amount::float AS principal,
              l.outstanding_amount::float AS outstanding, l.interest_rate::float AS interest_rate,
              l.emi_amount::float AS emi, l.end_date
       FROM loans l
       WHERE l.household_id = $1 AND l.status = 'ACTIVE' AND ${scopeSql}
       ORDER BY l.outstanding_amount DESC`,
      params
    );
    const borrowed = items.filter((l) => l.loan_type !== 'LENT_TO_PERSON');
    return {
      items,
      outstanding: round2(borrowed.reduce((s, l) => s + (l.outstanding || 0), 0)),
      monthlyEmi: round2(borrowed.reduce((s, l) => s + (l.emi || 0), 0)),
    };
  }

  private static async budgetStatus(p: OverviewParams) {
    const params: any[] = [p.householdId];
    const scope = this.accountScope(p, params);
    const now = new Date();
    params.push(monthStart(now), toLocalDateString(now));
    const rows = await QueryHelper.query<any>(
      `SELECT b.id, COALESCE(c.name, 'Overall') AS category_name, b.amount::float AS budget, b.period,
              COALESCE((
                SELECT SUM(t.amount) FROM transactions t JOIN accounts a ON a.id = t.account_id
                WHERE t.household_id = b.household_id AND t.status = 'CONFIRMED'
                  AND t.transaction_type IN (${EXPENSE_REPORT_SQL})
                  AND t.transaction_date BETWEEN $${params.length - 1} AND $${params.length}
                  AND (b.category_id IS NULL OR t.category_id = b.category_id
                       OR t.category_id IN (SELECT id FROM categories WHERE parent_category_id = b.category_id))
                  AND ${scope}
              ), 0)::float AS spent
       FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.household_id = $1 AND b.period = 'MONTHLY'`,
      params
    );
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return rows.map((r) => ({
      ...r,
      used_pct: pct(r.spent, r.budget),
      projected: round2((r.spent / dayOfMonth) * daysInMonth),
    }));
  }

  private static async dataQuality(p: OverviewParams, start: string, end: string) {
    const params: any[] = [p.householdId, start, end];
    const scope = this.accountScope(p, params);
    const row = await QueryHelper.queryOne<any>(
      `SELECT
         COUNT(*) FILTER (WHERE t.needs_review)::int AS needs_review,
         COUNT(*) FILTER (WHERE t.category_id IS NULL AND t.transaction_type IN (${EXPENSE_REPORT_SQL}))::int AS uncategorized_expenses,
         COALESCE(SUM(t.amount) FILTER (WHERE t.category_id IS NULL AND t.transaction_type IN (${EXPENSE_REPORT_SQL})), 0)::float AS uncategorized_amount,
         COUNT(*) FILTER (WHERE t.status = 'DRAFT')::int AS draft_transactions,
         MAX(t.transaction_date) AS last_transaction_date
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE t.household_id = $1 AND t.transaction_date BETWEEN $2 AND $3 AND t.status <> 'VOID' AND ${scope}`,
      params
    );
    const drafts = await QueryHelper.queryOne<any>(
      `SELECT COUNT(*)::int AS n FROM investment_transactions WHERE household_id = $1 AND status = 'DRAFT'`,
      [p.householdId]
    );
    return {
      needsReview: row?.needs_review || 0,
      uncategorizedExpenses: row?.uncategorized_expenses || 0,
      uncategorizedAmount: round2(row?.uncategorized_amount),
      draftTransactions: row?.draft_transactions || 0,
      draftInvestmentEntries: drafts?.n || 0,
      lastTransactionDate: row?.last_transaction_date || null,
    };
  }

  // ─── Rule-based insights ──────────────────────────────────────────────────

  private static deriveInsights(o: any): Insight[] {
    const k = o.kpis;
    const out: Insight[] = [];
    const add = (i: Insight) => out.push(i);

    if (k.income > 0 && k.savingsRatePct !== null) {
      if (k.savingsRatePct < 0) {
        add({ id: 'negative-savings', severity: 'critical', area: 'savings', title: 'Spending exceeded income',
          detail: `Expenses of ${inr(k.expense)} were ${inr(k.expense - k.income)} more than income in this period.` });
      } else if (k.savingsRatePct < 20) {
        add({ id: 'low-savings', severity: 'warning', area: 'savings', title: `Savings rate is ${k.savingsRatePct}%`,
          detail: `You kept ${inr(k.netSavings)} of ${inr(k.income)} earned. A 20–30% savings rate is a common target.` });
      } else {
        add({ id: 'healthy-savings', severity: 'positive', area: 'savings', title: `Savings rate is ${k.savingsRatePct}%`,
          detail: `You kept ${inr(k.netSavings)} of ${inr(k.income)} earned this period.` });
      }
    }

    if (k.expenseChangePct !== null && Math.abs(k.expenseChangePct) >= 15 && k.previous.expense > 0) {
      add({ id: 'expense-change', severity: k.expenseChangePct > 0 ? 'warning' : 'positive', area: 'spending',
        title: `Spending ${k.expenseChangePct > 0 ? 'up' : 'down'} ${Math.abs(k.expenseChangePct)}% vs previous period`,
        detail: `${inr(k.expense)} this period vs ${inr(k.previous.expense)} in the previous period of the same length.` });
    }

    const risers = o.expenseCategories
      .filter((c: any) => c.change_pct !== null && c.change_pct >= 40 && c.total_amount - c.previous_amount >= 2000)
      .slice(0, 2);
    for (const c of risers) {
      add({ id: `category-rise-${c.category_name}`, severity: 'info', area: 'spending',
        title: `${c.category_name} spending up ${Math.round(c.change_pct)}%`,
        detail: `${inr(c.total_amount)} vs ${inr(c.previous_amount)} in the previous period (+${inr(c.total_amount - c.previous_amount)}).` });
    }

    const top = o.expenseCategories[0];
    if (top && top.share_pct >= 35 && o.expenseCategories.length > 2) {
      add({ id: 'category-concentration', severity: 'info', area: 'spending', title: `${top.category_name} is ${Math.round(top.share_pct)}% of spending`,
        detail: `${inr(top.total_amount)} across ${top.transaction_count} transactions.` });
    }

    if (k.emergencyFundMonths !== null) {
      if (k.emergencyFundMonths < 3) {
        add({ id: 'emergency-fund', severity: k.emergencyFundMonths < 1 ? 'critical' : 'warning', area: 'liquidity',
          title: `Liquid savings cover ${k.emergencyFundMonths} months of outflows`,
          detail: `${inr(k.liquidBalance)} in bank/cash vs ~${inr(k.avgMonthlyExpense)} average monthly spending (plus EMIs). 3–6 months is a common buffer.` });
      } else if (k.emergencyFundMonths > 12 && k.liquidBalance > 0) {
        add({ id: 'idle-cash', severity: 'info', area: 'liquidity', title: `${k.emergencyFundMonths} months of expenses sitting in cash`,
          detail: `${inr(k.liquidBalance)} is liquid. Amounts beyond a 6-month buffer could be put to work.` });
      }
    }

    if (k.emiToIncomePct !== null && k.monthlyEmi > 0) {
      add({ id: 'emi-burden', severity: k.emiToIncomePct > 40 ? 'critical' : k.emiToIncomePct > 25 ? 'warning' : 'info', area: 'debt',
        title: `EMIs take ${k.emiToIncomePct}% of monthly income`,
        detail: `${inr(k.monthlyEmi)}/month across active loans; ${inr(k.loanOutstanding)} outstanding.` });
    }

    if (k.income > 0 && k.investmentRatePct !== null) {
      add({ id: 'investment-rate', severity: k.investmentRatePct >= 15 ? 'positive' : 'info', area: 'investments',
        title: `${Math.max(0, k.investmentRatePct)}% of income invested`,
        detail: `Net ${inr(Math.max(0, k.netInvested))} moved into investments this period.` });
    }

    if (k.creditCardDue > 0) {
      add({ id: 'card-due', severity: 'info', area: 'debt', title: `${inr(k.creditCardDue)} owed on credit cards`, detail: 'Pay in full by the due date to avoid interest.' });
    }

    for (const b of o.budgets.filter((b: any) => b.budget > 0 && b.projected > b.budget).slice(0, 3)) {
      add({ id: `budget-${b.id}`, severity: b.spent > b.budget ? 'warning' : 'info', area: 'budget',
        title: `${b.category_name} budget ${b.spent > b.budget ? 'exceeded' : 'on track to be exceeded'}`,
        detail: `${inr(b.spent)} spent of ${inr(b.budget)}; projected ${inr(b.projected)} by month end.` });
    }

    const q = o.dataQuality;
    if (q.needsReview > 0 || q.uncategorizedExpenses > 0) {
      add({ id: 'data-quality', severity: 'info', area: 'data_quality', title: 'Some transactions need attention',
        detail: [
          q.needsReview ? `${q.needsReview} flagged for review` : null,
          q.uncategorizedExpenses ? `${q.uncategorizedExpenses} uncategorized expenses (${inr(q.uncategorizedAmount)})` : null,
        ].filter(Boolean).join(' · ') + '. Figures above may shift once these are reviewed.' });
    }
    if (q.draftInvestmentEntries > 0) {
      add({ id: 'investment-drafts', severity: 'info', area: 'data_quality', title: `${q.draftInvestmentEntries} draft investment entries`,
        detail: 'Portfolio value and returns exclude these until their security and units are filled in.' });
    }

    const order: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
    return out.sort((a, b) => order[a.severity] - order[b.severity]);
  }
}
