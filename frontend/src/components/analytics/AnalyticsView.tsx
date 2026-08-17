import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Users,
  Calendar,
  RefreshCw,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [trends, setTrends] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [trendRes, expCatRes, incCatRes, famRes] = await Promise.all([
        api.getMonthlyTrends(6),
        api.getCategoryAnalytics('EXPENSE'),
        api.getCategoryAnalytics('INCOME'),
        api.getFamilyAnalytics(),
      ]);

      if (trendRes.success && trendRes.data) setTrends(trendRes.data);
      if (expCatRes.success && expCatRes.data) setExpenseCategories(expCatRes.data);
      if (incCatRes.success && incCatRes.data) setIncomeCategories(incCatRes.data);
      if (famRes.success && famRes.data) setFamilyMembers(famRes.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const totalExpense = expenseCategories.reduce((acc, curr) => acc + curr.total_amount, 0) || 1;
  const totalIncome = incomeCategories.reduce((acc, curr) => acc + curr.total_amount, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h2 className="text-2xl font-bold text-white tracking-tight">Financial Intelligence & Analytics</h2>
        <p className="text-sm text-slate-400">
          Historical cash flow trends, category distributions, and family member contributions
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
          <span>Generating Analytics Graphs...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Income vs Expense Trend Bar Chart */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Monthly Cash Flow Trends (Last 6 Months)</h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span> Income
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-3 rounded bg-rose-500"></span> Expense
                </span>
              </div>
            </div>

            {/* Custom Bar Chart Visualizer */}
            <div className="pt-6 grid grid-cols-6 gap-3 sm:gap-6 items-end h-64 border-b border-slate-800 pb-4">
              {trends.map((m) => {
                const maxVal = Math.max(...trends.flatMap((t) => [t.income, t.expense, 1000]));
                const incHeight = Math.max(8, Math.round((m.income / maxVal) * 180));
                const expHeight = Math.max(8, Math.round((m.expense / maxVal) * 180));

                return (
                  <div key={m.month_key} className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2">
                      {/* Income Bar */}
                      <div
                        className="w-4 sm:w-7 rounded-t-md bg-emerald-500/80 hover:bg-emerald-400 transition-all cursor-pointer relative group"
                        style={{ height: `${incHeight}px` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-[10px] text-emerald-300 font-bold px-2 py-1 rounded shadow-lg border border-slate-700 whitespace-nowrap z-10">
                          +{formatINR(m.income)}
                        </div>
                      </div>

                      {/* Expense Bar */}
                      <div
                        className="w-4 sm:w-7 rounded-t-md bg-rose-500/80 hover:bg-rose-400 transition-all cursor-pointer relative group"
                        style={{ height: `${expHeight}px` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-[10px] text-rose-300 font-bold px-2 py-1 rounded shadow-lg border border-slate-700 whitespace-nowrap z-10">
                          -{formatINR(m.expense)}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 text-center">
                      {m.month_label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2-Column Layout: Category Breakdown & Family Member Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Categories Breakdown */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <PieChart className="w-4 h-4" />
                <span>Expense Category Distribution</span>
              </div>

              <div className="space-y-3">
                {expenseCategories.length === 0 ? (
                  <p className="text-slate-500 text-xs py-8 text-center">No expense category data available.</p>
                ) : (
                  expenseCategories.map((c) => {
                    const percent = Math.round((c.total_amount / totalExpense) * 100);
                    return (
                      <div key={c.category_id} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: c.category_color || '#ef4444' }}
                            ></span>
                            {c.category_name} ({c.transaction_count} txns)
                          </span>
                          <span className="font-bold text-white">
                            {formatINR(c.total_amount)} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: c.category_color || '#ef4444',
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Family Members Breakdown */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Users className="w-4 h-4" />
                <span>Family Member Activity Breakdown</span>
              </div>

              <div className="space-y-3">
                {familyMembers.map((m) => (
                  <div
                    key={m.user_id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_name}`}
                        alt={m.user_name}
                        className="w-9 h-9 rounded-full border border-slate-700 bg-slate-800 object-cover"
                      />
                      <div>
                        <p className="font-bold text-white">{m.user_name}</p>
                        <p className="text-[10px] text-slate-400">{m.role}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <p className="text-emerald-400 font-bold">Income: +{formatINR(m.total_income)}</p>
                      <p className="text-rose-400 font-bold">Expense: -{formatINR(m.total_expense)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
