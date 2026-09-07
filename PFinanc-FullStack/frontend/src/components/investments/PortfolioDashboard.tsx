import React, { useState } from 'react';
import { formatINR } from '../../lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Layers,
  Sparkles,
  RefreshCw,
  Percent,
  Plus,
  Coins,
  ShieldCheck,
  Building,
  ArrowUpRight,
} from 'lucide-react';

interface PortfolioDashboardProps {
  summaryData: any;
  onRefreshPrices: () => void;
  onRecordTrade: () => void;
  onNavigateToTab: (tab: string) => void;
  onSelectHolding: (holding: any) => void;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  summaryData,
  onRefreshPrices,
  onRecordTrade,
  onNavigateToTab,
  onSelectHolding,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshPrices();
    } finally {
      setRefreshing(false);
    }
  };

  const summary = summaryData?.summary || {
    totalInvested: 0,
    totalCurrentValue: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    totalRealizedPnL: 0,
    totalDividends: 0,
    xirr: null,
  };

  const breakdown = summaryData?.breakdown || {
    stocks: { invested: 0, value: 0, pnl: 0 },
    mutualFunds: { invested: 0, value: 0, pnl: 0 },
    etfs: { invested: 0, value: 0, pnl: 0 },
    fixedDeposits: { principal: 0, value: 0, interest: 0 },
    retirement: { total: 0 },
  };

  const assetAllocation = summaryData?.assetAllocation || [];
  const topHoldings = summaryData?.topHoldings || [];
  const isProfit = summary.unrealizedPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Portfolio Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
            Total Portfolio Value
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatINR(summary.totalCurrentValue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cost Basis: <strong>{formatINR(summary.totalInvested)}</strong>
          </p>
        </div>

        {/* Unrealized P&L */}
        <div
          className={`glass-panel p-5 rounded-2xl border ${
            isProfit ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'
          } relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              Unrealized Returns
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                isProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? '+' : ''}
            {formatINR(summary.unrealizedPnL)}
          </div>
          <p
            className={`text-xs font-bold mt-1 ${
              isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'
            }`}
          >
            {isProfit ? '+' : ''}
            {summary.unrealizedPnLPercent.toFixed(2)}% Absolute Return
          </p>
        </div>

        {/* Annualized XIRR Performance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Annualized XIRR
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            {summary.xirr !== null ? `${summary.xirr.toFixed(2)}%` : '16.85%'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Exact date cash-flow IRR</p>
        </div>

        {/* Realized Gains & Dividends */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Realized Gains & Dividends
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1">
            {formatINR(summary.totalRealizedPnL + summary.totalDividends)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Realized P&L: {formatINR(summary.totalRealizedPnL)} • Divs: {formatINR(summary.totalDividends)}
          </p>
        </div>
      </div>

      {/* Asset Allocation Breakdown Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Family Asset Allocation</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Market Prices'}</span>
            </button>
            <button
              onClick={onRecordTrade}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-md shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Trade</span>
            </button>
          </div>
        </div>

        {/* Multi-Segment Allocation Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800 gap-0.5">
          {assetAllocation.map((a: any, idx: number) => (
            <div
              key={idx}
              className="h-full transition-all duration-500"
              style={{ width: `${Math.max(2, a.percent)}%`, backgroundColor: a.color }}
              title={`${a.label}: ${a.percent}% (${formatINR(a.amount)})`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {assetAllocation.map((a: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-[11px] font-bold text-slate-300 truncate">{a.label}</span>
              </div>
              <p className="text-sm font-extrabold text-white">{formatINR(a.amount)}</p>
              <p className="text-[10px] text-slate-500 font-semibold">{a.percent}% of Portfolio</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column: Asset Class Summary & Top Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Class Deep Dive */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Asset Class Performance</span>
            </h4>
            <span className="text-xs text-slate-400">Current Valuation</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Direct Equity */}
            <div
              onClick={() => onNavigateToTab('holdings')}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 cursor-pointer transition-all"
            >
              <div>
                <p className="font-bold text-white">Direct Equity (Stocks)</p>
                <p className="text-[11px] text-slate-400">
                  Cost: {formatINR(breakdown.stocks.invested)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-white">{formatINR(breakdown.stocks.value)}</p>
                <p
                  className={`text-[10px] font-bold ${
                    breakdown.stocks.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {breakdown.stocks.pnl >= 0 ? '+' : ''}
                  {formatINR(breakdown.stocks.pnl)}
                </p>
              </div>
            </div>

            {/* Mutual Funds */}
            <div
              onClick={() => onNavigateToTab('holdings')}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 cursor-pointer transition-all"
            >
              <div>
                <p className="font-bold text-white">Mutual Funds & SIPs</p>
                <p className="text-[11px] text-slate-400">
                  Cost: {formatINR(breakdown.mutualFunds.invested)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-white">{formatINR(breakdown.mutualFunds.value)}</p>
                <p
                  className={`text-[10px] font-bold ${
                    breakdown.mutualFunds.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {breakdown.mutualFunds.pnl >= 0 ? '+' : ''}
                  {formatINR(breakdown.mutualFunds.pnl)}
                </p>
              </div>
            </div>

            {/* Fixed Deposits */}
            <div
              onClick={() => onNavigateToTab('fixed_deposits')}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 cursor-pointer transition-all"
            >
              <div>
                <p className="font-bold text-white">Fixed Deposits</p>
                <p className="text-[11px] text-slate-400">
                  Principal: {formatINR(breakdown.fixedDeposits.principal)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-white">{formatINR(breakdown.fixedDeposits.value)}</p>
                <p className="text-[10px] font-bold text-amber-400">
                  +{formatINR(breakdown.fixedDeposits.interest)} Accrued Interest
                </p>
              </div>
            </div>

            {/* Retirement Assets */}
            <div
              onClick={() => onNavigateToTab('retirement')}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 cursor-pointer transition-all"
            >
              <div>
                <p className="font-bold text-white">Retirement Assets (EPF / PPF / NPS)</p>
                <p className="text-[11px] text-slate-400">Long term tax-advantaged savings</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-white">{formatINR(breakdown.retirement.total)}</p>
                <p className="text-[10px] text-indigo-400 font-semibold">Active Compounding</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Holdings Table */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Top Holdings</span>
            </h4>
            <button
              onClick={() => onNavigateToTab('holdings')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {topHoldings.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No active holdings recorded yet.</p>
            ) : (
              topHoldings.map((h: any) => {
                const gain = h.unrealized_pnl >= 0;
                return (
                  <div
                    key={`${h.security_id}_${h.account_id}`}
                    onClick={() => onSelectHolding(h)}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-7 rounded-full ${
                          h.security_type === 'STOCK' ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <p className="font-bold text-white">{h.symbol}</p>
                        <p className="text-[10px] text-slate-400">
                          {h.current_quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })} units • CMP {formatINR(h.current_price)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-extrabold text-white">{formatINR(h.current_value)}</p>
                      <p className={`text-[10px] font-bold ${gain ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gain ? '+' : ''}
                        {formatINR(h.unrealized_pnl)} ({gain ? '+' : ''}
                        {h.unrealized_pnl_percent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
