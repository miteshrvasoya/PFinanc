import { QueryHelper } from '../../database/queryHelper.js';
import { INCOME_REPORT_SQL, EXPENSE_REPORT_SQL } from '../accounts/ledgerTypes.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { PortfolioService } from '../investments/portfolio/portfolio.service.js';
import { LoansService } from '../loans/loans.service.js';
import { accessibleAccountSql } from '../../middleware/rbac.js';
import { toLocalDateString } from '../../utils/date.js';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const LIQUID_TYPES = ['BANK', 'CASH', 'WALLET'];

export class DashboardService {
  /**
   * Home page data.
   *
   * Net worth = liquid balances + investments - liabilities, where
   *   - only accounts with include_in_net_worth = true count (accounts awaiting statement import are
   *     listed separately instead of contributing artifact balances),
   *   - investments = market value of confirmed holdings + cost of draft purchases whose security/units
   *     are not filled in yet (otherwise money moved into investments would vanish from net worth),
   *   - liabilities = credit-card dues + overdrafts + outstanding borrowed loans.
   *
   * Cash flow uses the account owner as scope (personal view = accounts you own) and breaks the month into
   * income, spending, EMIs, net investing and (personal view) money sent to family members' accounts.
   */
  static async getDashboardData(
    householdId: string,
    userId: string,
    view: 'household' | 'personal' = 'household',
    /** MEMBER/VIEWER: limit ledger figures to accounts this user can access (owner, shared, granted). */
    restrictToAccessibleAccounts = false
  ) {
    const isPersonalView = view === 'personal';

    // 1. Accounts & balances
    const allAccounts = await AccountsService.listAccounts(householdId, userId);
    const accounts = isPersonalView ? allAccounts.filter((a) => a.owner_user_id === userId) : allAccounts;
    const counted = accounts.filter((a) => a.is_active && a.include_in_net_worth !== false);
    const notCounted = accounts.filter((a) => a.is_active && a.include_in_net_worth === false);

    let bankTotal = 0;
    let cashTotal = 0;
    let walletTotal = 0;
    let liquid = 0;
    let creditCardDue = 0;
    let overdraft = 0;

    for (const a of counted) {
      const bal = a.current_balance;
      if (a.account_type === 'CREDIT_CARD') {
        // Card balances are negative when money is owed; an overpaid card is a small asset.
        if (bal < 0) creditCardDue += -bal;
        else liquid += bal;
      } else if (LIQUID_TYPES.includes(a.account_type)) {
        if (a.account_type === 'BANK') bankTotal += bal;
        else if (a.account_type === 'CASH') cashTotal += bal;
        else walletTotal += bal;
        if (bal >= 0) liquid += bal;
        else overdraft += -bal;
      }
    }

    // 2. Investments: confirmed holdings at market + draft purchases at cost
    const [portfolio, draftInvestments, loans] = await Promise.all([
      PortfolioService.getPortfolioSummary(householdId, isPersonalView ? userId : undefined),
      this.draftInvestmentCost(householdId, isPersonalView ? userId : undefined),
      LoansService.getOutstanding(householdId, isPersonalView ? userId : undefined),
    ]);
    const investmentsAtMarket = portfolio.summary.totalCurrentValue;
    const investmentAssets = investmentsAtMarket + draftInvestments.cost;

    // 3. Liabilities
    const borrowed = loans.filter((l) => l.loanType !== 'LENT_TO_PERSON');
    const lent = loans.filter((l) => l.loanType === 'LENT_TO_PERSON');
    const loanOutstanding = borrowed.reduce((s, l) => s + l.outstanding, 0);
    const lentOutstanding = lent.reduce((s, l) => s + l.outstanding, 0);

    const totalAssets = liquid + investmentAssets + lentOutstanding;
    const totalLiabilities = creditCardDue + overdraft + loanOutstanding;
    const netWorth = totalAssets - totalLiabilities;

    // 4. Cash flow: this month, last month and a six-month trend
    const now = new Date();
    const monthStart = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthEnd = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    const scope = { householdId, userId, isPersonalView, restrictToAccessibleAccounts };

    const trend = await this.cashFlowByMonth(scope, toLocalDateString(monthStart(-5)), toLocalDateString(now));
    const emptyMonth = (offset: number) => ({
      month_key: toLocalDateString(monthStart(offset)).slice(0, 7),
      income: 0, spending: 0, emi: 0, invested: 0, loansAndOther: 0, sentToFamily: 0,
    });
    const byKey = new Map(trend.map((m) => [m.month_key, m]));
    const sixMonths = [-5, -4, -3, -2, -1, 0].map((o) => {
      const base = byKey.get(toLocalDateString(monthStart(o)).slice(0, 7)) || emptyMonth(o);
      return this.withTotals(base, monthStart(o));
    });
    const thisMonthFlow = sixMonths[5];
    const lastMonthFlow = sixMonths[4];

    // 5. Spending by category (current month)
    const categoryBreakdown = await this.categoryBreakdown(scope, toLocalDateString(monthStart(0)), toLocalDateString(monthEnd(0)));

    // 6. Recent transactions (one row per transfer, not one per leg)
    const recentTransactions = await this.recentTransactions(scope);

    // 7. Things that need the user's attention
    const attention = await this.attentionItems(householdId, isPersonalView ? userId : undefined, draftInvestments.count, notCounted.length);

    return {
      view,
      netWorth: {
        netWorth: round2(netWorth),
        totalAssets: round2(totalAssets),
        totalLiabilities: round2(totalLiabilities),
        cashAssets: round2(liquid),
        investmentAssets: round2(investmentAssets),
        breakdown: {
          cashAndBank: round2(liquid),
          investmentsAtMarket: round2(investmentsAtMarket),
          investmentsPendingAtCost: round2(draftInvestments.cost),
          moneyLent: round2(lentOutstanding),
          creditCardDue: round2(creditCardDue),
          overdraft: round2(overdraft),
          loans: round2(loanOutstanding),
        },
        loans: borrowed.map((l) => ({ name: l.name, outstanding: round2(l.outstanding), emi: l.emi })),
        excludedAccounts: notCounted.map((a) => ({
          id: a.id,
          name: a.name,
          owner: a.owner_name,
          balance: round2(a.current_balance),
        })),
      },
      cashPosition: {
        bankTotal: round2(bankTotal),
        cashTotal: round2(cashTotal),
        walletTotal: round2(walletTotal),
        creditCardTotal: round2(creditCardDue),
        accounts: accounts
          .filter((a) => [...LIQUID_TYPES, 'CREDIT_CARD'].includes(a.account_type) && a.is_active)
          .map((a) => ({
            id: a.id,
            name: a.name,
            owner_name: a.owner_name,
            owner_user_id: a.owner_user_id,
            account_type: a.account_type,
            institution_name: a.institution_name,
            current_balance: round2(a.current_balance),
            include_in_net_worth: a.include_in_net_worth !== false,
          })),
      },
      portfolio: portfolio.summary,
      assetAllocation: [
        { label: 'Cash & Bank Balances', amount: round2(liquid), color: '#38bdf8' },
        ...portfolio.assetAllocation,
      ],
      thisMonth: {
        monthName: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
        asOf: toLocalDateString(now),
        ...thisMonthFlow,
        // Backwards-compatible aliases
        expenses: thisMonthFlow.spending,
        netCashFlow: thisMonthFlow.leftOver,
      },
      lastMonth: lastMonthFlow,
      cashFlowTrend: sixMonths,
      categoryBreakdown,
      recentTransactions,
      attention,
    };
  }

  private static withTotals(
    m: { month_key: string; income: number; spending: number; emi: number; invested: number; loansAndOther: number; sentToFamily: number },
    start: Date
  ) {
    const income = round2(m.income);
    const spending = round2(m.spending);
    const emi = round2(m.emi);
    const invested = round2(m.invested);
    const loansAndOther = round2(m.loansAndOther);
    const sentToFamily = round2(m.sentToFamily);
    // Equals the change in counted cash balances for the month.
    const leftOver = round2(income + loansAndOther - spending - emi - invested - sentToFamily);
    return {
      month_key: m.month_key,
      month_label: start.toLocaleString('en-IN', { month: 'short' }),
      income,
      spending,
      emi,
      invested,
      loansAndOther,
      sentToFamily,
      leftOver,
      savingsRatePct: income > 0 ? round2(((income - spending) / income) * 100) : null,
    };
  }

  /** SQL predicate selecting the accounts in scope (alias `a`), appending params. */
  private static scopeSql(
    s: { userId: string; isPersonalView: boolean; restrictToAccessibleAccounts: boolean },
    params: any[]
  ): string {
    const parts: string[] = [];
    if (s.isPersonalView) {
      params.push(s.userId);
      parts.push(`a.owner_user_id = $${params.length}`);
    }
    if (s.restrictToAccessibleAccounts) {
      params.push(s.userId);
      parts.push(accessibleAccountSql('a', `$${params.length}`));
    }
    return parts.length ? parts.join(' AND ') : 'true';
  }

  private static async cashFlowByMonth(
    s: { householdId: string; userId: string; isPersonalView: boolean; restrictToAccessibleAccounts: boolean },
    start: string,
    end: string
  ) {
    const params: any[] = [s.householdId, start, end];
    const scope = this.scopeSql(s, params);
    // Cash flow covers the accounts counted in net worth. A transfer only matters when its other side is
    // outside that set (a family member's account in personal view, or an account not counted in net worth):
    // that money leaves (or enters) the tracked picture. Transfers between counted accounts net to zero.
    const counterpartOutside = (alias: string) =>
      s.isPersonalView
        ? `(${alias}.owner_user_id <> a.owner_user_id OR ${alias}.include_in_net_worth = false)`
        : `(${alias}.include_in_net_worth = false)`;
    const rows = await QueryHelper.query<any>(
      `SELECT TO_CHAR(date_trunc('month', t.transaction_date), 'YYYY-MM') AS month_key,
              COALESCE(SUM(CASE WHEN t.transaction_type IN (${INCOME_REPORT_SQL}) THEN t.amount END), 0)::float AS income,
              COALESCE(SUM(CASE WHEN t.transaction_type IN (${EXPENSE_REPORT_SQL}) THEN t.amount END), 0)::float AS spending,
              COALESCE(SUM(CASE WHEN t.transaction_type = 'EMI_PAYMENT' THEN t.amount END), 0)::float AS emi,
              COALESCE(SUM(CASE WHEN t.transaction_type = 'INVESTMENT_PURCHASE' THEN t.amount
                                WHEN t.transaction_type = 'INVESTMENT_REDEMPTION' THEN -t.amount END), 0)::float AS invested,
              COALESCE(SUM(CASE WHEN t.transaction_type IN ('LOAN_DISBURSEMENT', 'BORROWED_AMOUNT', 'LENT_PRINCIPAL_RECEIVED') THEN t.amount
                                WHEN t.transaction_type IN ('LENT_AMOUNT', 'BORROWED_PRINCIPAL_REPAID', 'OTHER') THEN -t.amount END), 0)::float AS "loansAndOther",
              COALESCE(SUM(CASE WHEN t.transaction_type = 'TRANSFER' AND tr.source_account_id = t.account_id AND ${counterpartOutside('da')} THEN t.amount
                                WHEN t.transaction_type = 'TRANSFER' AND tr.destination_account_id = t.account_id AND ${counterpartOutside('sa')} THEN -t.amount END), 0)::float AS "sentToFamily"
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN transfers tr ON tr.id = t.transfer_id
       LEFT JOIN accounts sa ON sa.id = tr.source_account_id
       LEFT JOIN accounts da ON da.id = tr.destination_account_id
       WHERE t.household_id = $1 AND t.status = 'CONFIRMED' AND a.include_in_net_worth = true
         AND t.transaction_date BETWEEN $2 AND $3 AND ${scope}
       GROUP BY 1`,
      params
    );
    return rows;
  }

  private static async categoryBreakdown(
    s: { householdId: string; userId: string; isPersonalView: boolean; restrictToAccessibleAccounts: boolean },
    start: string,
    end: string
  ) {
    const params: any[] = [s.householdId, start, end];
    const scope = this.scopeSql(s, params);
    const rows = await QueryHelper.query<any>(
      `SELECT c.id AS category_id,
              COALESCE(pc.name, c.name, 'Uncategorized') AS category_name,
              COALESCE(pc.icon, c.icon) AS category_icon,
              COALESCE(pc.color, c.color) AS category_color,
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
         AND t.transaction_type IN (${EXPENSE_REPORT_SQL}) AND ${scope}
       GROUP BY 1, 2, 3, 4`,
      params
    );
    // Roll children up into their parent group (e.g. Restaurants + Groceries -> Food & Dining).
    const groups = new Map<string, { category_name: string; category_icon: string | null; category_color: string | null; total_amount: number }>();
    for (const r of rows) {
      const g = groups.get(r.category_name) || { category_name: r.category_name, category_icon: r.category_icon, category_color: r.category_color, total_amount: 0 };
      g.total_amount = round2(g.total_amount + r.total_amount);
      groups.set(r.category_name, g);
    }
    return [...groups.values()].sort((a, b) => b.total_amount - a.total_amount).slice(0, 6);
  }

  private static async recentTransactions(s: { householdId: string; userId: string; isPersonalView: boolean; restrictToAccessibleAccounts: boolean }) {
    const params: any[] = [s.householdId];
    const scope = this.scopeSql(s, params);
    // Hide the receiving leg of a transfer when the sending leg is also visible, so each transfer shows once.
    const senderVisible = s.isPersonalView ? `sa.owner_user_id = a.owner_user_id` : `sa.household_id = t.household_id`;
    return QueryHelper.query(
      `SELECT t.id, t.account_id, a.name AS account_name, t.user_id, u.name AS user_name,
              t.category_id, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
              t.transaction_type, CAST(t.amount AS FLOAT) AS amount, t.currency, t.transaction_date,
              t.description, t.merchant_name, t.status, t.needs_review, t.created_at,
              tr.source_account_id, sa.name AS transfer_source_account_name, da.name AS transfer_dest_account_name
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN transfers tr ON tr.id = t.transfer_id
       LEFT JOIN accounts sa ON sa.id = tr.source_account_id
       LEFT JOIN accounts da ON da.id = tr.destination_account_id
       WHERE t.household_id = $1 AND t.status <> 'VOID' AND ${scope}
         AND NOT (t.transfer_id IS NOT NULL AND tr.destination_account_id = t.account_id AND ${senderVisible})
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT 8`,
      params
    );
  }

  /** Cost of draft investment purchases (security/units not filled in yet), net of draft redemptions. */
  private static async draftInvestmentCost(householdId: string, ownerUserId?: string) {
    const params: any[] = [householdId];
    let ownerSql = '';
    if (ownerUserId) {
      params.push(ownerUserId);
      ownerSql = `AND a.owner_user_id = $${params.length}`;
    }
    const row = await QueryHelper.queryOne<{ cost: number; count: number }>(
      `SELECT COALESCE(SUM(CASE WHEN it.transaction_type IN ('BUY', 'SIP') THEN it.net_amount
                                WHEN it.transaction_type IN ('SELL', 'REDEMPTION') THEN -it.net_amount END), 0)::float AS cost,
              COUNT(*) FILTER (WHERE it.transaction_type IN ('BUY', 'SIP', 'SELL', 'REDEMPTION'))::int AS count
       FROM investment_transactions it
       JOIN accounts a ON a.id = it.investment_account_id
       WHERE it.household_id = $1 AND it.status = 'DRAFT' ${ownerSql}`,
      params
    );
    return { cost: Math.max(0, round2(row?.cost || 0)), count: row?.count || 0 };
  }

  private static async attentionItems(householdId: string, ownerUserId: string | undefined, draftInvestmentCount: number, excludedAccountCount: number) {
    const params: any[] = [householdId];
    let ownerSql = '';
    if (ownerUserId) {
      params.push(ownerUserId);
      ownerSql = `AND a.owner_user_id = $${params.length}`;
    }
    const row = await QueryHelper.queryOne<{ review: number; drafts: number }>(
      `SELECT COUNT(*) FILTER (WHERE t.needs_review AND t.status <> 'VOID')::int AS review,
              COUNT(*) FILTER (WHERE t.status = 'DRAFT')::int AS drafts
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE t.household_id = $1 ${ownerSql}`,
      params
    );
    return {
      transactionsToReview: row?.review || 0,
      draftTransactions: row?.drafts || 0,
      investmentsPendingDetails: draftInvestmentCount,
      accountsNotInNetWorth: excludedAccountCount,
    };
  }
}
