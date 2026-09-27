import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoginView } from '../auth/LoginView';
import { FirstInstallSetup } from '../auth/FirstInstallSetup';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { RefreshCw, LayoutDashboard, Receipt, TrendingUp, Wallet, User } from 'lucide-react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isFirstInstall, setIsFirstInstall] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
          router.push('/');
        }}
      />
    );
  }
  
  const bottomNavItems = [
    { id: 'dashboard', href: '/', icon: <LayoutDashboard className="w-6 h-6" />, label: 'Home' },
    { id: 'transactions', href: '/transactions', icon: <Receipt className="w-6 h-6" />, label: 'Txns' },
    { id: 'investments', href: '/investments', icon: <TrendingUp className="w-6 h-6" />, label: 'Invest' },
    { id: 'accounts', href: '/accounts', icon: <Wallet className="w-6 h-6" />, label: 'Accounts' },
    { id: 'family', href: '/family', icon: <User className="w-6 h-6" />, label: 'Family' },
  ];

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-16 md:pb-0">
        {/* Sticky Header */}
        <Header />

        {/* Dynamic Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#090d16]/85 backdrop-blur-xl border-t border-slate-800/60 px-2 py-2 flex items-center justify-between z-40 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
        {bottomNavItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link key={item.id} href={item.href} className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 relative ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {isActive && (
                <div className="absolute -top-2 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
              )}
              <div className={`p-1.5 transition-transform duration-300 ${isActive ? '-translate-y-1 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'active:scale-90'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-bold mt-0.5 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
