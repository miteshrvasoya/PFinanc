import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
  Landmark,
  Banknote,
  CreditCard,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';

interface DashboardViewProps {
  onQuickAction: (action: 'add_expense' | 'add_income' | 'transfer' | 'add_account' | 'import_csv') => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onQuickAction, onNavigateToTab }) => {
  const { currentHousehold, viewMode } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard(viewMode);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentHousehold?.id, viewMode]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Calculating Ledger Balances & Net Worth...</p>
        </div>
      </div>
    );
  }

  const netWorth = data?.netWorth || { totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
  const thisMonth = data?.thisMonth || { income: 0, expenses: 0, transferVolume: 0, netCashFlow: 0 };
  const cashPosition = data?.cashPosition || { bankTotal: 0, cashTotal: 0, walletTotal: 0, creditCardTotal: 0, accounts: [] };
  const categoryBreakdown = data?.categoryBreakdown || [];
  const recentTransactions = data?.recentTransactions || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {viewMode === 'household' ? `${currentHousehold?.name || 'Family'} Overview` : 'Personal Financial Overview'}
          </h2>
          <p className="text-sm text-slate-400">
            {viewMode === 'household' ? 'Unified family ledger across all accounts & members' : 'Your personal accounts, spending, and income'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onQuickAction('add_expense')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => onQuickAction('add_income')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>Add Income</span>
          </button>
          <button
            onClick={() => onQuickAction('transfer')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-500/20"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer Money</span>
          </button>
        </div>
      </div>

      {/* Net Worth & Monthly Cash Flow Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Total Net Worth Card */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Household Net Worth</span>
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight mt-1">
              {formatINR(netWorth.netWorth)}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Total Assets</span>
              <span className="font-semibold text-emerald-400 text-sm">{formatINR(netWorth.totalAssets)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Liabilities</span>
              <span className="font-semibold text-rose-400 text-sm">
                {netWorth.totalLiabilities > 0 ? formatINR(netWorth.totalLiabilities) : '₹0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Cash Flow Card */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">This Month ({thisMonth.monthName})</span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {formatINR(thisMonth.netCashFlow)}
                  </span>
                  <span className="text-xs font-medium text-slate-400">Net Cash Flow</span>
                </div>
              </div>
              <button
                onClick={fetchDashboard}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* In-Depth Monthly Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Income */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>Total Income</span>
                </div>
                <div className="text-lg font-bold text-emerald-300 mt-1">
                  {formatINR(thisMonth.income)}
                </div>
              </div>

              {/* Expense */}
              <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-medium">
                  <TrendingDown className="w-4 h-4" />
                  <span>Total Expenses</span>
                </div>
                <div className="text-lg font-bold text-rose-300 mt-1">
                  {formatINR(thisMonth.expenses)}
                </div>
              </div>

              {/* Internal Transfers Volume (Zero-Double-Count Highlight) */}
              <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <div className="flex items-center justify-between text-indigo-400 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Transfers Movement</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded">Excluded</span>
                </div>
                <div className="text-lg font-bold text-indigo-300 mt-1">
                  {formatINR(thisMonth.transferVolume)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Internal family transfers are excluded from income/expense calculations to ensure zero double-counting.</span>
          </div>
        </div>
      </div>

      {/* Cash Position Breakdown & Category Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Position Breakdown */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Cash & Account Position</h3>
            <button
              onClick={() => onNavigateToTab('accounts')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View All ({cashPosition.accounts?.length || 0}) &rarr;
            </button>
          </div>

          {/* Aggregate Pillars */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Landmark className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Bank Accounts</p>
                <p className="font-bold text-white">{formatINR(cashPosition.bankTotal)}</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Physical Cash</p>
                <p className="font-bold text-white">{formatINR(cashPosition.cashTotal)}</p>
              </div>
            </div>
          </div>

          {/* Account Mini List */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            {cashPosition.accounts?.slice(0, 4).map((acc: any) => (
              <div
                key={acc.id}
                className="p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/50 flex items-center justify-between transition-colors text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-200">{acc.name}</p>
                  <p className="text-[10px] text-slate-400">{acc.owner_name} • {acc.account_number_masked || acc.account_type}</p>
                </div>
                <span className="font-bold text-white">{formatINR(acc.current_balance)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Category Spending Breakdown */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Monthly Expense by Category</h3>
            <button
              onClick={() => onNavigateToTab('analytics')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Analytics &rarr;
            </button>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No expenses recorded for this month yet.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat: any) => {
                const totalExpense = thisMonth.expenses || 1;
                const percent = Math.min(100, Math.round((cat.total_amount / totalExpense) * 100));
                return (
                  <div key={cat.category_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.category_color || '#3b82f6' }}
                        ></span>
                        {cat.category_name}
                      </span>
                      <span className="font-semibold text-white">{formatINR(cat.total_amount)} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: cat.category_color || '#6366f1',
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Recent Activity</h3>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              All Transactions &rarr;
            </button>
          </div>

          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No recent transactions found.
              </div>
            ) : (
              recentTransactions.slice(0, 5).map((tx: any) => {
                const isIncome = tx.transaction_type === 'INCOME' || tx.transaction_type === 'REFUND';
                const isTransfer = tx.transaction_type === 'TRANSFER';
                return (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isTransfer
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : isIncome
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isTransfer ? (
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        ) : isIncome ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200 line-clamp-1">{tx.description}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatDate(tx.transaction_date)} • {tx.account_name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          isTransfer
                            ? 'text-indigo-300'
                            : isIncome
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isTransfer ? '' : isIncome ? '+' : '-'}{formatINR(tx.amount)}
                      </p>
                      <span className="text-[9px] uppercase font-semibold px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
