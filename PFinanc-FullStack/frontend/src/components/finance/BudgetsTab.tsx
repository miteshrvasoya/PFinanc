import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { PiggyBank, Plus, RefreshCw, Pencil, Trash } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

export const BudgetsTab: React.FC = () => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    try {
      const res = await api.getBudgets();
      if (res.success) {
        setBudgets(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span>Loading budgets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Your Budgets</h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all">
          <Plus className="w-4 h-4" />
          Add Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800">
          <PiggyBank className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h4 className="text-white font-bold text-lg mb-2">No Budgets Configured</h4>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Set up monthly or weekly budgets for your spending categories to track your expenses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <div key={b.id} className="glass-panel p-5 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${b.category_color || 'indigo'}-500/20 flex items-center justify-center`}>
                    <span className="text-lg">{b.category_icon || '💰'}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{b.category_name || 'Overall Budget'}</h4>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{b.period}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-indigo-400">{formatINR(b.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
