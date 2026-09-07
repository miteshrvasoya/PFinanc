import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { BankSetupStep } from './BankSetupStep';
import { StockSetupStep } from './StockSetupStep';
import { MutualFundSetupStep } from './MutualFundSetupStep';
import { OtherAssetsSetupStep } from './OtherAssetsSetupStep';
import { OnboardingSummaryStep } from './OnboardingSummaryStep';
import {
  Wallet,
  TrendingUp,
  Layers,
  Coins,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';

interface OnboardingWizardProps {
  onFinished: () => void;
}

export type OnboardingStepId = 'bank_accounts' | 'stock_accounts' | 'mutual_funds' | 'other_assets' | 'review';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onFinished }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStepId>('bank_accounts');
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    try {
      const res = await api.getOnboardingStatus();
      if (res.success && res.data) {
        const step = res.data.current_step as OnboardingStepId;
        if (['bank_accounts', 'stock_accounts', 'mutual_funds', 'other_assets', 'review'].includes(step)) {
          setCurrentStep(step);
        }
        setCompletedSections(res.data.completed_sections || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = async (nextStep: OnboardingStepId, completedSection?: string) => {
    setCurrentStep(nextStep);
    if (completedSection) {
      setCompletedSections((prev) => Array.from(new Set([...prev, completedSection])));
    }
    try {
      await api.updateOnboardingStep(nextStep, completedSection);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async () => {
    try {
      await api.completeOnboarding();
      onFinished();
    } catch (err) {
      console.error(err);
      onFinished();
    }
  };

  const handleSkipAll = async () => {
    try {
      await api.skipOnboarding();
      onFinished();
    } catch (err) {
      console.error(err);
      onFinished();
    }
  };

  const steps: { id: OnboardingStepId; label: string; icon: any }[] = [
    { id: 'bank_accounts', label: 'Bank Accounts', icon: Wallet },
    { id: 'stock_accounts', label: 'Stocks & Broker', icon: TrendingUp },
    { id: 'mutual_funds', label: 'Mutual Funds', icon: Layers },
    { id: 'other_assets', label: 'Other Assets & Gold', icon: Coins },
    { id: 'review', label: 'Review & Finish', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-between p-4 sm:p-8 relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Progress Bar */}
      <div className="max-w-4xl w-full mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">PFinanc Financial Onboarding</h2>
              <p className="text-[11px] text-slate-400">Initialize your baseline financial state</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkipAll}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
          >
            Skip Setup & Go to Dashboard
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">
              Step {currentStepIndex + 1} of {steps.length}: <strong className="text-white">{steps[currentStepIndex]?.label}</strong>
            </span>
            <span className="text-indigo-400">{progressPercent}% Completed</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper Tabs */}
          <div className="hidden sm:flex items-center justify-between pt-1 text-xs">
            {steps.map((s, idx) => {
              const isCompleted = completedSections.includes(s.id) || idx < currentStepIndex;
              const isCurrent = s.id === currentStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStepChange(s.id)}
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    isCurrent
                      ? 'text-indigo-400 font-bold'
                      : isCompleted
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Step View Container */}
      <div className="max-w-4xl w-full mx-auto my-6 flex-1 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
        {currentStep === 'bank_accounts' && (
          <BankSetupStep
            onNext={() => handleStepChange('stock_accounts', 'bank_accounts')}
            onSkip={() => handleStepChange('stock_accounts')}
          />
        )}

        {currentStep === 'stock_accounts' && (
          <StockSetupStep
            onNext={() => handleStepChange('mutual_funds', 'stock_accounts')}
            onSkip={() => handleStepChange('mutual_funds')}
          />
        )}

        {currentStep === 'mutual_funds' && (
          <MutualFundSetupStep
            onNext={() => handleStepChange('other_assets', 'mutual_funds')}
            onSkip={() => handleStepChange('other_assets')}
          />
        )}

        {currentStep === 'other_assets' && (
          <OtherAssetsSetupStep
            onNext={() => handleStepChange('review', 'other_assets')}
            onSkip={() => handleStepChange('review')}
          />
        )}

        {currentStep === 'review' && (
          <OnboardingSummaryStep onComplete={handleComplete} />
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500">
        <p>PFinanc Financial Invariant: Starting positions and historical data establish baseline ledger correctness without artificial income/expenses.</p>
      </div>
    </div>
  );
};
