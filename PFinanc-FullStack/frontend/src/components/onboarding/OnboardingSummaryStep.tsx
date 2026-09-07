import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building,
  TrendingUp,
  Coins,
  ArrowRight,
} from 'lucide-react';

interface OnboardingSummaryStepProps {
  onComplete: () => void;
}

export const OnboardingSummaryStep: React.FC<OnboardingSummaryStepProps> = ({ onComplete }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await api.getDashboard('household');
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const netWorth = dashboardData?.netWorth?.netWorth || 0;
  const cashAssets = dashboardData?.netWorth?.cashAssets || 0;
  const investmentAssets = dashboardData?.netWorth?.investmentAssets || 0;
  const accountsCount = dashboardData?.cashPosition?.accounts?.length || 0;

  return (
    <div className="space-y-6 text-center max-w-xl mx-auto py-4">
      {/* Celebration Header */}
      <div className="space-y-3">
        <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Your Financial Workspace is Ready!
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Your starting financial position has been initialized cleanly. Real-time accounting and ledger auditability are now active.
        </p>
      </div>

      {/* Net Worth Callout Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/40 bg-indigo-500/5 space-y-2 text-center shadow-xl">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
          Initial Family Net Worth
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          {formatINR(netWorth)}
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Liquid Cash: <strong>{formatINR(cashAssets)}</strong></span>
          <span>•</span>
          <span>Investments & Gold: <strong>{formatINR(investmentAssets)}</strong></span>
        </div>
      </div>

      {/* Configured Domains Grid */}
      <div className="grid grid-cols-2 gap-3 text-left text-xs">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <Building className="w-4 h-4" />
            <span>Bank & Cash Accounts</span>
          </div>
          <p className="text-lg font-extrabold text-white">{accountsCount} Accounts</p>
          <p className="text-[10px] text-slate-500">{formatINR(cashAssets)} total balance</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>Investments & Wealth</span>
          </div>
          <p className="text-lg font-extrabold text-white">{formatINR(investmentAssets)}</p>
          <p className="text-[10px] text-slate-500">Stocks, MFs, FDs & Gold</p>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 pt-2">
        ✓ Any sections you skipped can be configured anytime from the sidebar.
      </p>

      {/* Launch Dashboard Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onComplete}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          <span>Launch PFinanc Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
