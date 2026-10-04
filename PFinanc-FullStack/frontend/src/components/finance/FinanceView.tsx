import React, { useState, useEffect } from 'react';
import { Target, Banknote, Home, ArrowLeftRight, PiggyBank, Receipt, Split } from 'lucide-react';
import { api } from '../../lib/api';
import { BudgetsTab } from './BudgetsTab';
import { LoansTab } from './LoansTab';
import { RentTab } from './RentTab';

type FinanceTab = 'overview' | 'budgets' | 'loans' | 'rent';

export const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  const tabs: { id: FinanceTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'budgets', label: 'Budgets', icon: PiggyBank },
    { id: 'loans', label: 'Loans & Debt', icon: Banknote },
    { id: 'rent', label: 'Rent', icon: Home },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Target className="w-7 h-7 text-indigo-500" />
            Financial Management
          </h2>
          <p className="text-slate-400 text-sm mt-1">Manage budgets, track loans, and configure rent</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Views */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <div className="text-center py-24 text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Finance Overview is under construction.</p>
            <p className="text-sm mt-2">Select a tab above to manage Budgets, Loans, or Rent.</p>
          </div>
        )}

        {activeTab === 'budgets' && <BudgetsTab />}
        {activeTab === 'loans' && <LoansTab />}
        {activeTab === 'rent' && <RentTab />}
      </div>
    </div>
  );
};
