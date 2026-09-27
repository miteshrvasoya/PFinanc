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
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Clock,
  PieChart
} from 'lucide-react';

interface DashboardViewProps {
  onQuickAction?: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
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
  const recentTransactions = data?.recentTransactions || [];
  
  // Mock data for wireframe purposes
  const pendingActions = [
    { id: 1, title: '3 transactions waiting for approval', type: 'approval' },
    { id: 2, title: 'EPF contribution reminder', type: 'reminder' }
  ];
  const investments = { totalValue: 450000, todayChange: 2500, percentChange: 0.5 };

  return (
    <div className="space-y-6 pb-6">
      {/* Pending Actions (Only shown if there are actions) */}
      {pendingActions.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-amber-500">Needs Attention</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingActions.map(action => (
              <div key={action.id} className="bg-slate-900/50 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-200">{action.title}</span>
                </div>
                <span className="text-xs text-amber-500 font-semibold">Review &rarr;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Total Net Worth */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border border-slate-800 lg:col-span-1">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Worth</span>
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {formatINR(netWorth.netWorth)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className="text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3 mr-1" /> +2.4%
              </span>
              <span className="text-slate-500">vs last month</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Cash & Bank</span>
              <span className="font-semibold text-sky-400 text-sm">{formatINR(cashPosition.bankTotal + cashPosition.cashTotal)}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Liabilities</span>
              <span className="font-semibold text-rose-400 text-sm">
                {netWorth.totalLiabilities > 0 ? formatINR(netWorth.totalLiabilities) : '₹0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Cash Flow</h3>
              <p className="text-xs text-slate-400 mt-0.5">This Month ({thisMonth.monthName})</p>
            </div>
            <button
              onClick={() => onNavigateToTab('analytics')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              View Analytics
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
            <div className="flex flex-col justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-2">
                <ArrowUpRight className="w-4 h-4" />
                <span>Income</span>
              </div>
              <div className="text-xl font-bold text-white">{formatINR(thisMonth.income)}</div>
            </div>
            
            <div className="flex flex-col justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-medium mb-2">
                <ArrowDownRight className="w-4 h-4" />
                <span>Expenses</span>
              </div>
              <div className="text-xl font-bold text-white">{formatINR(thisMonth.expenses)}</div>
            </div>
            
            <div className="flex flex-col justify-center p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium mb-2">
                <Wallet className="w-4 h-4" />
                <span>Savings</span>
              </div>
              <div className="text-xl font-bold text-white">{formatINR(thisMonth.income - thisMonth.expenses)}</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, ((thisMonth.income - thisMonth.expenses) / (thisMonth.income || 1)) * 100))}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions List */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white">Recent Transactions</h3>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View all &rarr;
            </button>
          </div>

          <div className="space-y-2 flex-1">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/30 rounded-xl h-full flex items-center justify-center">
                No recent transactions found.
              </div>
            ) : (
              recentTransactions.slice(0, 6).map((tx: any) => {
                const isIncome = tx.transaction_type === 'INCOME' || tx.transaction_type === 'REFUND';
                const isTransfer = tx.transaction_type === 'TRANSFER';
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/40 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isTransfer
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : isIncome
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isTransfer ? (
                          <ArrowLeftRight className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm mb-0.5">{tx.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{formatDate(tx.transaction_date)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                          <span>{tx.account_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-bold text-sm ${
                          isTransfer
                            ? 'text-slate-300'
                            : isIncome
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isTransfer ? '' : isIncome ? '+' : '-'}{formatINR(tx.amount)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Investments Overview & Accounts Summary */}
        <div className="flex flex-col gap-6">
          {/* Investments */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white">Investments</h3>
              <button
                onClick={() => onNavigateToTab('investments')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View portfolio &rarr;
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 mb-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Portfolio Value</p>
                <p className="text-2xl font-bold text-white">{formatINR(investments.totalValue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Today's Change</p>
                <p className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded inline-block">
                  +{formatINR(investments.todayChange)} ({investments.percentChange}%)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-slate-900/30 rounded-lg text-center border border-slate-800/50">
                <PieChart className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-400 uppercase">Stocks</p>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">45%</p>
              </div>
              <div className="p-3 bg-slate-900/30 rounded-lg text-center border border-slate-800/50">
                <TrendingUp className="w-5 h-5 text-sky-400 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-400 uppercase">Mutual Funds</p>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">30%</p>
              </div>
              <div className="p-3 bg-slate-900/30 rounded-lg text-center border border-slate-800/50">
                <Landmark className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-400 uppercase">Fixed Dep.</p>
                <p className="text-xs font-semibold text-slate-200 mt-0.5">25%</p>
              </div>
            </div>
          </div>
          
          {/* Family Summary (Optional - shown if household view) */}
          {viewMode === 'household' && (
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-white">Family Finances</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300">Shared</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400 text-xs">Combined Net Worth</span>
                  <span className="font-semibold text-white">{formatINR(netWorth.netWorth)}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400 text-xs">Shared Accounts</span>
                  <span className="font-semibold text-white">{cashPosition.accounts?.length || 0}</span>
                </div>
                <div className="pt-1">
                  <button onClick={() => onNavigateToTab('family')} className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors">
                    Manage Family Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
