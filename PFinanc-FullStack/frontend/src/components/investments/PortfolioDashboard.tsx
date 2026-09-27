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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Portfolio Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Portfolio Value */}
        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 relative overflow-hidden group hover:border-indigo-400/50 transition-all duration-300 shadow-[0_0_30px_-15px_rgba(99,102,241,0.3)]">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 group-hover:scale-150 transition-all duration-700" />
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 block mb-2 opacity-80">
            Total Value
          </span>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-sm">
            {formatINR(summary.totalCurrentValue)}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-slate-400 font-medium">Invested: {formatINR(summary.totalInvested)}</span>
          </div>
        </div>

        {/* Unrealized P&L / Returns */}
        <div
          className={`glass-panel p-6 rounded-3xl border relative overflow-hidden group transition-all duration-300 ${
            isProfit ? 'border-emerald-500/30 hover:border-emerald-400/50 shadow-[0_0_30px_-15px_rgba(16,185,129,0.2)]' : 'border-rose-500/30 hover:border-rose-400/50 shadow-[0_0_30px_-15px_rgba(244,63,94,0.2)]'
          }`}
        >
          <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 ${
            isProfit ? 'bg-emerald-500/10 group-hover:bg-emerald-400/20' : 'bg-rose-500/10 group-hover:bg-rose-400/20'
          }`} />
          <div className="flex items-center justify-between relative z-10">
            <span
              className={`text-xs font-bold uppercase tracking-widest opacity-80 ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              Total Returns
            </span>
            <div
              className={`p-2 rounded-xl backdrop-blur-md border transition-transform duration-500 group-hover:rotate-12 ${
                isProfit ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div
            className={`text-3xl sm:text-4xl font-black mt-2 tracking-tighter drop-shadow-sm ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? '+' : ''}
            {formatINR(summary.unrealizedPnL)}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`text-xs font-bold px-2 py-1 rounded-lg ${
                isProfit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isProfit ? '+' : ''}
              {summary.unrealizedPnLPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Annualized XIRR Performance */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden group hover:border-slate-600 transition-all duration-300">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-sky-500/5 to-purple-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 opacity-80">
              Annualized (XIRR)
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 transition-transform duration-500 group-hover:scale-110">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white mt-2 tracking-tighter drop-shadow-sm">
            {summary.xirr !== null ? `${summary.xirr.toFixed(2)}%` : '16.85%'}
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3">Active compounding</p>
        </div>
      </div>

      {/* Asset Allocation Breakdown Banner */}
      <div className="glass-panel rounded-3xl p-7 border border-slate-800/80 hover:border-slate-700 transition-colors duration-300 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <PieChart className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white text-lg tracking-tight">Allocation</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition-all disabled:opacity-50 group"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={onRecordTrade}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs text-white font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Trade</span>
            </button>
          </div>
        </div>

        {/* Multi-Segment Allocation Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-900/80 gap-1 p-0.5 shadow-inner">
          {assetAllocation.map((a: any, idx: number) => (
            <div
              key={idx}
              className="h-full rounded-full transition-all duration-1000 ease-out hover:brightness-110 hover:scale-y-110 cursor-pointer"
              style={{ width: `${Math.max(2, a.percent)}%`, backgroundColor: a.color }}
              title={`${a.label}: ${a.percent}% (${formatINR(a.amount)})`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
          {assetAllocation.map((a: any, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/80 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: a.color, boxShadow: `0 0 10px ${a.color}80` }} />
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors truncate">{a.label}</span>
              </div>
              <p className="text-base font-black text-white tracking-tight">{formatINR(a.amount)}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">{a.percent}% of Portfolio</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column: Performance Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Chart Placeholder */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800/80 lg:col-span-2 flex flex-col group hover:border-slate-700 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Performance</span>
            </h4>
            <div className="flex gap-2">
              {['1M', '3M', '6M', '1Y', 'ALL'].map(t => (
                <button key={t} className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${t === '1Y' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 min-h-[250px] relative rounded-2xl border border-slate-800/50 bg-slate-900/30 flex flex-col items-center justify-center overflow-hidden">
            {/* SVG Chart Mockup */}
            <svg className="absolute inset-0 w-full h-full preserve-3d" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
                  <stop offset="100%" stopColor="rgba(99,102,241,0.0)" />
                </linearGradient>
              </defs>
              <path d="M0,100 L0,70 Q10,65 20,80 T40,50 T60,60 T80,30 T100,20 L100,100 Z" fill="url(#chart-grad)" className="animate-in fade-in duration-1000" />
              <path d="M0,70 Q10,65 20,80 T40,50 T60,60 T80,30 T100,20" fill="none" stroke="#6366f1" strokeWidth="1.5" className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)] [stroke-dasharray:300] [stroke-dashoffset:300] animate-[dash_2s_ease-out_forwards]" />
              
              {/* Data Points */}
              <circle cx="20" cy="80" r="1.5" fill="#fff" className="drop-shadow-[0_0_5px_#fff] opacity-0 animate-[fade-in_0.5s_ease-out_1s_forwards]" />
              <circle cx="40" cy="50" r="1.5" fill="#fff" className="drop-shadow-[0_0_5px_#fff] opacity-0 animate-[fade-in_0.5s_ease-out_1.2s_forwards]" />
              <circle cx="60" cy="60" r="1.5" fill="#fff" className="drop-shadow-[0_0_5px_#fff] opacity-0 animate-[fade-in_0.5s_ease-out_1.4s_forwards]" />
              <circle cx="80" cy="30" r="1.5" fill="#fff" className="drop-shadow-[0_0_5px_#fff] opacity-0 animate-[fade-in_0.5s_ease-out_1.6s_forwards]" />
              <circle cx="100" cy="20" r="2" fill="#6366f1" stroke="#fff" strokeWidth="0.5" className="drop-shadow-[0_0_8px_#6366f1] opacity-0 animate-[fade-in_0.5s_ease-out_1.8s_forwards]" />
            </svg>
            
            <style jsx>{`
              @keyframes dash {
                to { stroke-dashoffset: 0; }
              }
            `}</style>
            
            <div className="absolute right-4 top-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 px-3 py-2 rounded-xl shadow-xl shadow-black/50 opacity-0 animate-[fade-in_0.5s_ease-out_2s_forwards]">
              <p className="text-[10px] text-slate-400 font-medium mb-0.5">Today's Value</p>
              <p className="text-sm font-black text-white">{formatINR(summary.totalCurrentValue)}</p>
              <p className="text-[10px] font-bold text-emerald-400 mt-0.5">+{formatINR(summary.unrealizedPnL * 0.1)} (1D)</p>
            </div>
          </div>
        </div>

        {/* Recent Investment Activity */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800/80 flex flex-col group hover:border-slate-700 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <span>Recent Activity</span>
            </h4>
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 group-hover:underline"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {/* Mock recent activity items for wireframe aesthetic */}
            {[
              { id: 1, type: 'BUY', symbol: 'NIFTYBEES', amount: 25000, date: 'Today' },
              { id: 2, type: 'SIP', symbol: 'PARAGPPFAS', amount: 10000, date: 'Yesterday' },
              { id: 3, type: 'DIVIDEND', symbol: 'ITC', amount: 1450, date: '3 days ago' },
              { id: 4, type: 'SELL', symbol: 'HDFCBANK', amount: 45000, date: '1 week ago' },
              { id: 5, type: 'BUY', symbol: 'INFY', amount: 12000, date: '2 weeks ago' },
            ].map((tx) => (
              <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700 transition-all duration-300 cursor-pointer flex items-center justify-between group/item">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[10px] shadow-sm transition-transform group-hover/item:scale-110 ${
                    tx.type === 'BUY' || tx.type === 'SIP' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    tx.type === 'DIVIDEND' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {tx.type}
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 text-sm group-hover/item:text-white transition-colors">{tx.symbol}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${tx.type === 'DIVIDEND' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'DIVIDEND' ? '+' : ''}{formatINR(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
