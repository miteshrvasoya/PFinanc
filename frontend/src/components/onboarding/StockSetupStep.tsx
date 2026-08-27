import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  TrendingUp,
  Plus,
  UploadCloud,
  Layers,
  ArrowRight,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface StockSetupStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export const StockSetupStep: React.FC<StockSetupStepProps> = ({ onNext, onSkip }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddBroker, setShowAddBroker] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [subAction, setSubAction] = useState<'CHOICE' | 'HOLDING' | null>(null);

  // Broker Form
  const [brokerForm, setBrokerForm] = useState({
    name: '',
    institution_name: 'Zerodha',
    account_number: '',
  });

  // Manual Holding Form
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSec, setSelectedSec] = useState<any>(null);
  const [holdingForm, setHoldingForm] = useState({
    quantity: '',
    average_cost: '',
    current_price: '',
    as_of_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, holdRes] = await Promise.all([
        api.getAccounts(),
        api.getHoldings({ security_type: 'STOCK' }),
      ]);
      if (accRes.success && accRes.data) {
        const brokers = accRes.data.filter((a: any) => a.account_type === 'BROKERAGE');
        setAccounts(brokers);
        if (brokers.length > 0 && !selectedAccount) {
          setSelectedAccount(brokers[0]);
        }
      }
      if (holdRes.success && holdRes.data) {
        setHoldings(holdRes.data.filter((h: any) => h.security_type === 'STOCK'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAccount({
        name: brokerForm.name || `${brokerForm.institution_name} Demat`,
        institution_name: brokerForm.institution_name,
        account_type: 'BROKERAGE',
        account_number: brokerForm.account_number,
        opening_balance: 0.00,
      });

      if (res.success && res.data) {
        setSelectedAccount(res.data);
        setShowAddBroker(false);
        setSubAction('CHOICE');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error creating broker account');
    }
  };

  const handleSearchSecurities = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.searchSecurities(q);
      if (res.success && res.data) {
        setSearchResults(res.data.filter((s: any) => s.security_type === 'STOCK' || !s.security_type));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInitialHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !selectedSec) {
      alert('Please select a security');
      return;
    }

    try {
      const qty = parseFloat(holdingForm.quantity);
      const avgCost = parseFloat(holdingForm.average_cost);
      const curPrice = parseFloat(holdingForm.current_price) || avgCost;

      // Record trade as BUY (which populates holding lot)
      const res = await api.createInvestmentTransaction({
        investment_account_id: selectedAccount.id,
        security_id: selectedSec.id,
        transaction_type: 'BUY',
        transaction_date: holdingForm.as_of_date,
        quantity: qty,
        price_per_unit: avgCost,
        gross_amount: qty * avgCost,
        fees: 0,
        taxes: 0,
        net_amount: qty * avgCost,
        notes: 'Initial Opening Position',
      });

      if (res.success) {
        if (curPrice !== avgCost) {
          await api.setSecurityPrice(selectedSec.id, curPrice, holdingForm.as_of_date);
        }
        setSubAction(null);
        setSelectedSec(null);
        setSearchQuery('');
        setHoldingForm({ quantity: '', average_cost: '', current_price: '', as_of_date: new Date().toISOString().split('T')[0] });
        loadData();
      } else {
        alert(res.error?.message || 'Failed to save holding');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving holding');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight">Step 2: Stock & Broker Accounts</h3>
        <p className="text-xs text-slate-400">
          Connect Zerodha, Groww, Upstox, or other brokerages and enter your direct equity positions.
        </p>
      </div>

      {/* Broker Accounts List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => (
          <div key={acc.id} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{acc.name}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-500/15 text-indigo-400">
                {acc.institution_name}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Demat: {acc.account_number_masked || 'XXXX'}</p>
            <button
              onClick={() => {
                setSelectedAccount(acc);
                setSubAction('HOLDING');
              }}
              className="mt-2 text-indigo-400 hover:text-indigo-300 font-semibold text-[11px] block"
            >
              + Add Stock Holding
            </button>
          </div>
        ))}

        {!showAddBroker && !subAction && (
          <button
            type="button"
            onClick={() => setShowAddBroker(true)}
            className="p-5 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-slate-900/60 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-indigo-600/20 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 mb-1 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs">+ Add Broker Account</span>
          </button>
        )}
      </div>

      {/* Add Broker Form */}
      {showAddBroker && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-w-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white text-sm">Add Stock Broker Account</h4>
            <button onClick={() => setShowAddBroker(false)} className="text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateBroker} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Broker Platform</label>
                <select
                  value={brokerForm.institution_name}
                  onChange={(e) => setBrokerForm({ ...brokerForm, institution_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Zerodha">Zerodha (Kite)</option>
                  <option value="Groww">Groww</option>
                  <option value="Upstox">Upstox</option>
                  <option value="Angel One">Angel One</option>
                  <option value="ICICI Direct">ICICI Direct</option>
                  <option value="HDFC Securities">HDFC Securities</option>
                  <option value="Other">Other Broker</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Zerodha Primary"
                  value={brokerForm.name}
                  onChange={(e) => setBrokerForm({ ...brokerForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBroker(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Save Broker
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Stock Holdings Form */}
      {subAction === 'HOLDING' && selectedAccount && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-w-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white text-sm">
              Add Stock Holding to {selectedAccount.name}
            </h4>
            <button onClick={() => setSubAction(null)} className="text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveInitialHolding} className="space-y-3">
            {/* Search Security */}
            <div className="relative">
              <label className="block text-slate-300 font-semibold mb-1">Search Stock / Symbol *</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. RELIANCE, TCS, INFY, HDFCBANK"
                  value={searchQuery}
                  onChange={(e) => handleSearchSecurities(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-20 divide-y divide-slate-800">
                  {searchResults.map((sec) => (
                    <div
                      key={sec.id}
                      onClick={() => {
                        setSelectedSec(sec);
                        setSearchQuery(sec.name);
                        setSearchResults([]);
                        if (sec.latest_price) {
                          setHoldingForm((prev) => ({
                            ...prev,
                            average_cost: String(sec.latest_price),
                            current_price: String(sec.latest_price),
                          }));
                        }
                      }}
                      className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-white">{sec.symbol}</p>
                        <p className="text-[10px] text-slate-400">{sec.name}</p>
                      </div>
                      {sec.latest_price && (
                        <span className="font-bold text-emerald-400">{formatINR(sec.latest_price)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedSec && (
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
                Selected: <strong>{selectedSec.symbol}</strong> ({selectedSec.name})
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Quantity (Shares) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="20"
                  value={holdingForm.quantity}
                  onChange={(e) => setHoldingForm({ ...holdingForm, quantity: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Average Cost / Buy Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="1400.00"
                  value={holdingForm.average_cost}
                  onChange={(e) => setHoldingForm({ ...holdingForm, average_cost: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Save Stock Position
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Holdings List */}
      {holdings.length > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block text-slate-400">
            Configured Stock Positions ({holdings.length})
          </span>
          <div className="divide-y divide-slate-800">
            {holdings.map((h) => (
              <div key={h.security_id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{h.symbol}</span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    {h.current_quantity} shares @ {formatINR(h.average_cost)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">{formatINR(h.current_value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-slate-400 hover:text-slate-200 font-medium"
        >
          Skip Stock Accounts for Now
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all"
        >
          <span>Continue to Mutual Funds</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
