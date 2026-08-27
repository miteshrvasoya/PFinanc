import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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
import { FirstInstallSetup } from '../components/auth/FirstInstallSetup';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isFirstInstall, setIsFirstInstall] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);

  // Onboarding state
  const [onboardingState, setOnboardingState] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [initialTxAction, setInitialTxAction] = useState<'add_expense' | 'add_income' | null>(null);
  const [initialTransferOpen, setInitialTransferOpen] = useState(false);

  useEffect(() => {
    checkSystem();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      checkOnboarding();
    }
  }, [isAuthenticated]);

  const checkSystem = async () => {
    try {
      const res = await api.getSystemStatus();
      if (res.success && res.data) {
        setIsFirstInstall(res.data.isFirstInstall);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingSystem(false);
    }
  };

  const checkOnboarding = async () => {
    try {
      const res = await api.getOnboardingStatus();
      if (res.success && res.data) {
        setOnboardingState(res.data);
        if (res.data.status === 'IN_PROGRESS') {
          setShowOnboarding(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || checkingSystem) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
        <span className="font-semibold text-sm">Initializing PFinanc...</span>
      </div>
    );
  }

  // If completely fresh installation with 0 users, show first install welcome
  if (isFirstInstall && !isAuthenticated) {
    return (
      <FirstInstallSetup
        onCompleted={() => {
          setIsFirstInstall(false);
          setShowOnboarding(true);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // If user is currently going through onboarding wizard
  if (showOnboarding) {
    return (
      <OnboardingWizard
        onFinished={() => {
          setShowOnboarding(false);
          setActiveTab('dashboard');
        }}
      />
    );
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
