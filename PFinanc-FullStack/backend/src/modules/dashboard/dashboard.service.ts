import { QueryHelper } from '../../database/queryHelper.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { PortfolioService } from '../investments/portfolio/portfolio.service.js';

export class DashboardService {
  static async getDashboardData(householdId: string, userId: string, view: 'household' | 'personal' = 'household') {
    const isPersonalView = view === 'personal';

    // 1. Fetch accessible accounts and compute cash balances
    const allAccounts = await AccountsService.listAccounts(householdId, userId);
    const accounts = isPersonalView ? allAccounts.filter((a) => a.owner_user_id === userId) : allAccounts;

    let bankAndCashAssets = 0;
    let totalLiabilities = 0;

    let bankTotal = 0;
    let cashTotal = 0;
    let walletTotal = 0;
    let creditCardTotal = 0;

    accounts.forEach((a) => {
      const bal = a.current_balance;
      if (a.account_type === 'CREDIT_CARD') {
        creditCardTotal += Math.abs(bal);
        totalLiabilities += Math.abs(bal);
      } else if (['BANK', 'CASH', 'WALLET'].includes(a.account_type)) {
        if (a.account_type === 'BANK') bankTotal += bal;
        else if (a.account_type === 'CASH') cashTotal += bal;
        else if (a.account_type === 'WALLET') walletTotal += bal;

        if (bal >= 0) {
          bankAndCashAssets += bal;
        } else {
          totalLiabilities += Math.abs(bal);
        }
      }
    });

    // 2. Fetch Phase 2 Investment Portfolio Valuations
    const portfolio = await PortfolioService.getPortfolioSummary(
      householdId,
      isPersonalView ? userId : undefined
    );

    const investmentAssets = portfolio.summary.totalCurrentValue;
    const totalAssets = bankAndCashAssets + investmentAssets;
    const netWorth = totalAssets - totalLiabilities;

    // 3. This Month Summary (Current Month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const txConditions = ['t.household_id = $1', 't.status = \'CONFIRMED\'', 't.transaction_date >= $2', 't.transaction_date <= $3'];
    const txParams: any[] = [householdId, startOfMonth, endOfMonth];

    if (isPersonalView) {
      txParams.push(userId);
      txConditions.push(`t.user_id = $${txParams.length}`);
    }

    const txWhere = txConditions.join(' AND ');

    // Calculate income, expense, and transfers strictly isolating transfers and investment funding from income/expense
    const monthlyMetrics = await QueryHelper.queryOne<{
      total_income: string;
      total_expense: string;
      total_transfers: string;
    }>(
      `SELECT 
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('INCOME', 'REFUND') THEN t.amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('EXPENSE', 'FEE') THEN t.amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'TRANSFER' AND tr.source_account_id = t.account_id THEN t.amount ELSE 0 END), 0) AS total_transfers
      FROM transactions t
      LEFT JOIN transfers tr ON tr.id = t.transfer_id
      WHERE ${txWhere}`,
      txParams
    );

    const income = parseFloat(monthlyMetrics?.total_income || '0');
    const expenses = parseFloat(monthlyMetrics?.total_expense || '0');
    const transferVolume = parseFloat(monthlyMetrics?.total_transfers || '0');
    const netCashFlow = income - expenses;

    // 4. Category Breakdown for current month expenses
    const categoryBreakdown = await QueryHelper.query<{
      category_id: string;
      category_name: string;
      category_icon: string;
      category_color: string;
      total_amount: string;
    }>(
      `SELECT 
        c.id AS category_id,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        SUM(t.amount) AS total_amount
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${txWhere} AND t.transaction_type IN ('EXPENSE', 'FEE')
      GROUP BY c.id, c.name, c.icon, c.color
      ORDER BY total_amount DESC
      LIMIT 8`,
      txParams
    );

    // 5. Recent Transactions (last 10)
    const recentTxParams: any[] = [householdId];
    let recentWhere = `t.household_id = $1`;
    if (isPersonalView) {
      recentTxParams.push(userId);
      recentWhere += ` AND t.user_id = $2`;
    }

    const recentTransactions = await QueryHelper.query(
      `SELECT 
        t.id,
        t.account_id,
        a.name AS account_name,
        t.user_id,
        u.name AS user_name,
        t.category_id,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        t.transaction_type,
        CAST(t.amount AS FLOAT) AS amount,
        t.currency,
        t.transaction_date,
        t.description,
        t.merchant_name,
        t.status,
        t.created_at
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${recentWhere}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT 10`,
      recentTxParams
    );

    return {
      view,
      netWorth: {
        totalAssets,
        totalLiabilities,
        netWorth,
        cashAssets: bankAndCashAssets,
        investmentAssets,
      },
      cashPosition: {
        bankTotal,
        cashTotal,
        walletTotal,
        creditCardTotal,
        accounts: accounts.filter((a) => ['BANK', 'CASH', 'WALLET', 'CREDIT_CARD'].includes(a.account_type)),
      },
      portfolio: portfolio.summary,
      assetAllocation: [
        { label: 'Cash & Bank Balances', amount: bankAndCashAssets, color: '#38bdf8' },
        ...portfolio.assetAllocation,
      ],
      thisMonth: {
        monthName: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        income,
        expenses,
        transferVolume,
        netCashFlow,
      },
      categoryBreakdown: categoryBreakdown.map((c) => ({
        ...c,
        total_amount: parseFloat(c.total_amount),
      })),
      recentTransactions,
    };
  }
}
