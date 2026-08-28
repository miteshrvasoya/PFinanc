import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoginView } from '../auth/LoginView';
import { FirstInstallSetup } from '../auth/FirstInstallSetup';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { RefreshCw } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isFirstInstall, setIsFirstInstall] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);

  // Onboarding state
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

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Header */}
        <Header />

        {/* Dynamic Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
