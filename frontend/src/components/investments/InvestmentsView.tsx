import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../lib/formatters';
import { PortfolioDashboard } from './PortfolioDashboard';
import { HoldingsTable } from './HoldingsTable';
import { SecurityDetailModal } from './SecurityDetailModal';
import { RecordTradeModal } from './RecordTradeModal';
import { FixedDepositsSection } from './FixedDepositsSection';
import { RetirementSection } from './RetirementSection';
import { InvestmentImportModal } from './InvestmentImportModal';
import {
  TrendingUp,
  PieChart,
  Layers,
  History,
  Building,
  ShieldCheck,
  Plus,
  UploadCloud,
  RefreshCw,
  Search,
} from 'lucide-react';

export type InvestmentSubTab = 'overview' | 'holdings' | 'fixed_deposits' | 'retirement' | 'transactions';

export const InvestmentsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InvestmentSubTab>('overview');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeModalType, setTradeModalType] = useState('BUY');
  const [tradeInitialSecurity, setTradeInitialSecurity] = useState<any>(null);

  const [selectedHoldingDetail, setSelectedHoldingDetail] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [sumRes, holdRes, txRes, accRes] = await Promise.all([
        api.getPortfolioSummary('household'),
        api.getHoldings(),
        api.getInvestmentTransactions({ limit: 50 }),
        api.getAccounts(),
      ]);

      if (sumRes.success && sumRes.data) setSummaryData(sumRes.data);
      if (holdRes.success && holdRes.data) setHoldings(holdRes.data);
      if (txRes.success && txRes.data) setTransactions(txRes.data.items || []);
      if (accRes.success && accRes.data) {
        const inv = accRes.data.filter((a: any) =>
          ['BROKERAGE', 'MUTUAL_FUND', 'OTHER'].includes(a.account_type)
        );
        setAccounts(inv.length > 0 ? inv : accRes.data);
      }
    } catch (err) {
      console.error('Failed to load investment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrices = async () => {
    try {
      await api.refreshMarketPrices();
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenTradeModal = (type = 'BUY', security: any = null) => {
    setTradeModalType(type);
    setTradeInitialSecurity(security);
    setShowTradeModal(true);
  };

  const handleVoidTx = async (id: string) => {
    if (!confirm('Are you sure you want to void this investment transaction?')) return;
    try {
      const res = await api.voidInvestmentTransaction(id);
      if (res.success) {
        loadAllData();
      } else {
        alert(res.error?.message || 'Failed to void transaction');
      }
    } catch (err: any) {
      alert(err.message || 'Error voiding transaction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Subnavigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Investment & Portfolio Manager</h2>
          <p className="text-xs text-slate-400">
            Real-time multi-asset positions, FIFO tax lot returns, and retirement wealth
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 font-semibold transition-all"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Import Statement</span>
          </button>
          <button
            onClick={() => handleOpenTradeModal('BUY')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Trade</span>
          </button>
        </div>
      </div>

      {/* Subnavigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/60 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Portfolio Overview', icon: PieChart },
          { id: 'holdings', label: `Holdings (${holdings.length})`, icon: Layers },
          { id: 'fixed_deposits', label: 'Fixed Deposits', icon: Building },
          { id: 'retirement', label: 'Retirement (EPF/PPF)', icon: ShieldCheck },
          { id: 'transactions', label: 'Trade History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as InvestmentSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
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
      {loading && !summaryData ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
          <span>Calculating Portfolio Positions...</span>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <PortfolioDashboard
              summaryData={summaryData}
              onRefreshPrices={handleRefreshPrices}
              onRecordTrade={() => handleOpenTradeModal('BUY')}
              onNavigateToTab={(tab: string) => setActiveTab(tab as InvestmentSubTab)}
              onSelectHolding={setSelectedHoldingDetail}
            />
          )}

          {activeTab === 'holdings' && (
            <HoldingsTable
              holdings={holdings}
              onSelectSecurity={setSelectedHoldingDetail}
              onRecordTrade={(sec) => handleOpenTradeModal('BUY', sec)}
            />
          )}

          {activeTab === 'fixed_deposits' && <FixedDepositsSection />}

          {activeTab === 'retirement' && <RetirementSection />}

          {activeTab === 'transactions' && (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="font-bold text-white text-xs">Complete Trade & Ledger Log</h4>
                <button
                  onClick={() => handleOpenTradeModal('BUY')}
                  className="text-xs text-indigo-400 font-semibold hover:text-indigo-300"
                >
                  + Add Trade
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Instrument</th>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4 text-right">Units</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-right">Net Value</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-16 text-slate-500">
                          No investment transactions found.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                            {formatDate(tx.transaction_date)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                tx.transaction_type === 'BUY' || tx.transaction_type === 'SIP'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : tx.transaction_type === 'SELL'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              }`}
                            >
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {tx.symbol || 'Cash Action'}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {tx.account_name}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-200">
                            {tx.quantity ? tx.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {tx.price_per_unit ? formatINR(tx.price_per_unit) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            {formatINR(tx.net_amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                tx.status === 'CONFIRMED'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {tx.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleVoidTx(tx.id)}
                                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                              >
                                Void
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trade Modal */}
      {showTradeModal && (
        <RecordTradeModal
          initialType={tradeModalType}
          initialSecurity={tradeInitialSecurity}
          onClose={() => setShowTradeModal(false)}
          onSuccess={() => {
            loadAllData();
          }}
        />
      )}

      {/* Security Detail Modal */}
      {selectedHoldingDetail && (
        <SecurityDetailModal
          holding={selectedHoldingDetail}
          onClose={() => setSelectedHoldingDetail(null)}
          onTrade={(sec) => handleOpenTradeModal('BUY', sec)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <InvestmentImportModal
          accounts={accounts}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadAllData();
          }}
        />
      )}
    </div>
  );
};
