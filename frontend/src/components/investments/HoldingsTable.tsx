import React, { useState } from 'react';
import { formatINR } from '../../lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';

interface HoldingsTableProps {
  holdings: any[];
  onSelectSecurity: (security: any) => void;
  onRecordTrade: (security?: any) => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  onSelectSecurity,
  onRecordTrade,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetClass, setSelectedAssetClass] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState('ALL');

  const assetClasses = ['ALL', 'EQUITY', 'MUTUAL_FUND', 'ETF', 'OTHER'];
  const uniqueAccounts = Array.from(new Set(holdings.map((h) => h.account_name).filter(Boolean)));

  const filteredHoldings = holdings.filter((h) => {
    if (selectedAssetClass !== 'ALL' && h.asset_class !== selectedAssetClass && h.security_type !== selectedAssetClass) {
      return false;
    }
    if (selectedAccount !== 'ALL' && h.account_name !== selectedAccount) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.symbol.toLowerCase().includes(q) ||
        (h.isin && h.isin.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search holdings by name, symbol, or ISIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Asset Class Filter */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            {assetClasses.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedAssetClass(cls)}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedAssetClass === cls
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cls === 'ALL'
                  ? 'All Assets'
                  : cls === 'EQUITY'
                  ? 'Stocks'
                  : cls === 'MUTUAL_FUND'
                  ? 'Mutual Funds'
                  : cls}
              </button>
            ))}
          </div>

          {/* Account Filter */}
          {uniqueAccounts.length > 1 && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Accounts</option>
              {uniqueAccounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Holdings Grid Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Avg Cost</th>
                <th className="py-3 px-4 text-right">CMP / NAV</th>
                <th className="py-3 px-4 text-right">Invested</th>
                <th className="py-3 px-4 text-right">Current Value</th>
                <th className="py-3 px-4 text-right">Unrealized P&L</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHoldings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500">
                    No holdings match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredHoldings.map((h) => {
                  const isProfit = h.unrealized_pnl >= 0;
                  return (
                    <tr
                      key={`${h.security_id}_${h.account_id}`}
                      onClick={() => onSelectSecurity(h)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Instrument */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-2 h-8 rounded-full ${
                              h.security_type === 'STOCK'
                                ? 'bg-indigo-500'
                                : h.security_type === 'MUTUAL_FUND'
                                ? 'bg-emerald-500'
                                : 'bg-cyan-500'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                                {h.symbol}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                  h.security_type === 'STOCK'
                                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                    : h.security_type === 'MUTUAL_FUND'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                }`}
                              >
                                {h.security_type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{h.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-slate-200">{h.account_name}</p>
                        <p className="text-[10px] text-slate-500">{h.owner_name}</p>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-200">
                        {h.current_quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                      </td>

                      {/* Avg Cost */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {formatINR(h.average_cost)}
                      </td>

                      {/* Current Price */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-white">{formatINR(h.current_price)}</span>
                        {h.is_stale && (
                          <span className="block text-[9px] text-amber-400/80 font-normal">Stale</span>
                        )}
                      </td>

                      {/* Invested Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
                        {formatINR(h.total_invested)}
                      </td>

                      {/* Current Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-white">
                        {formatINR(h.current_value)}
                      </td>

                      {/* Unrealized P&L */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1 font-bold ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>
                            {isProfit ? '+' : ''}
                            {formatINR(h.unrealized_pnl)}
                          </span>
                        </div>
                        <span
                          className={`block text-[10px] font-semibold ${
                            isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'
                          }`}
                        >
                          ({isProfit ? '+' : ''}
                          {h.unrealized_pnl_percent.toFixed(2)}%)
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRecordTrade(h);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white font-semibold text-[11px] transition-all"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
