import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sidebar, NavTab } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { DashboardView } from '../components/dashboard/DashboardView';
import { AccountsView } from '../components/accounts/AccountsView';
import { InvestmentsView } from '../components/investments/InvestmentsView';
import { TransactionsView } from '../components/transactions/TransactionsView';
import { TransfersView } from '../components/transfers/TransfersView';
import { ImportsView } from '../components/imports/ImportsView';
import { CategoriesView } from '../components/categories/CategoriesView';
import { FamilyView } from '../components/family/FamilyView';
import { AnalyticsView } from '../components/analytics/AnalyticsView';
import { LoginView } from '../components/auth/LoginView';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [initialTxAction, setInitialTxAction] = useState<'add_expense' | 'add_income' | null>(null);
  const [initialTransferOpen, setInitialTransferOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
        <span className="font-semibold text-sm">Initializing PFinanc...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleQuickAction = (action: 'add_expense' | 'add_income' | 'transfer' | 'add_account' | 'import_csv') => {
    if (action === 'add_expense' || action === 'add_income') {
      setInitialTxAction(action);
      setActiveTab('transactions');
    } else if (action === 'transfer') {
      setInitialTransferOpen(true);
      setActiveTab('transfers');
    } else if (action === 'add_account') {
      setActiveTab('accounts');
    } else if (action === 'import_csv') {
      setActiveTab('imports');
    }
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Header */}
        <Header />

        {/* Dynamic Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onQuickAction={handleQuickAction}
              onNavigateToTab={setActiveTab}
            />
          )}
          {activeTab === 'accounts' && <AccountsView />}
          {activeTab === 'investments' && <InvestmentsView />}
          {activeTab === 'transactions' && (
            <TransactionsView
              initialAction={initialTxAction}
              onClearInitialAction={() => setInitialTxAction(null)}
            />
          )}
          {activeTab === 'transfers' && (
            <TransfersView
              initialOpen={initialTransferOpen}
              onClearInitialOpen={() => setInitialTransferOpen(false)}
            />
          )}
          {activeTab === 'imports' && <ImportsView />}
          {activeTab === 'categories' && <CategoriesView />}
          {activeTab === 'family' && <FamilyView />}
          {activeTab === 'analytics' && <AnalyticsView />}
        </main>
      </div>
    </div>
  );
}
