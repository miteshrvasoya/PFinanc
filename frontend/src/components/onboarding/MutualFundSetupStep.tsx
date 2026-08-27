import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  Layers,
  Plus,
  ArrowRight,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface MutualFundSetupStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export const MutualFundSetupStep: React.FC<MutualFundSetupStepProps> = ({ onNext, onSkip }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [subAction, setSubAction] = useState<'CHOICE' | 'HOLDING' | null>(null);

  // MF Account Form
  const [accountForm, setAccountForm] = useState({
    name: '',
    institution_name: 'Groww Mutual Funds',
    account_number: '',
  });

  // Manual Holding Form
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSec, setSelectedSec] = useState<any>(null);
  const [holdingForm, setHoldingForm] = useState({
    units: '',
    average_nav: '',
    current_nav: '',
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
        api.getHoldings({ security_type: 'MUTUAL_FUND' }),
      ]);
      if (accRes.success && accRes.data) {
        const mfAccs = accRes.data.filter((a: any) =>
          ['MUTUAL_FUND', 'BROKERAGE'].includes(a.account_type)
        );
        setAccounts(mfAccs);
        if (mfAccs.length > 0 && !selectedAccount) {
          setSelectedAccount(mfAccs[0]);
        }
      }
      if (holdRes.success && holdRes.data) {
        setHoldings(holdRes.data.filter((h: any) => h.security_type === 'MUTUAL_FUND'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAccount({
        name: accountForm.name || accountForm.institution_name,
        institution_name: accountForm.institution_name,
        account_type: 'MUTUAL_FUND',
        account_number: accountForm.account_number,
        opening_balance: 0.00,
      });

      if (res.success && res.data) {
        setSelectedAccount(res.data);
        setShowAddAccount(false);
        setSubAction('CHOICE');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error creating account');
    }
  };

  const handleSearchFunds = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.searchSecurities(q);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMFHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !selectedSec) {
      alert('Please select a Mutual Fund scheme');
      return;
    }

    try {
      const units = parseFloat(holdingForm.units);
      const avgNav = parseFloat(holdingForm.average_nav);
      const curNav = parseFloat(holdingForm.current_nav) || avgNav;

      const res = await api.createInvestmentTransaction({
        investment_account_id: selectedAccount.id,
        security_id: selectedSec.id,
        transaction_type: 'SIP',
        transaction_date: holdingForm.as_of_date,
        quantity: units,
        price_per_unit: avgNav,
        gross_amount: units * avgNav,
        fees: 0,
        taxes: 0,
        net_amount: units * avgNav,
        notes: 'Initial Mutual Fund Position',
      });

      if (res.success) {
        if (curNav !== avgNav) {
          await api.setSecurityPrice(selectedSec.id, curNav, holdingForm.as_of_date);
        }
        setSubAction(null);
        setSelectedSec(null);
        setSearchQuery('');
        setHoldingForm({ units: '', average_nav: '', current_nav: '', as_of_date: new Date().toISOString().split('T')[0] });
        loadData();
      } else {
        alert(res.error?.message || 'Failed to save mutual fund');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving mutual fund');
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight">Step 3: Mutual Funds & SIPs</h3>
        <p className="text-xs text-slate-400">
          Track mutual fund folios, SIP accumulation, fractional units, and live AMFI NAV valuations.
        </p>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => (
          <div key={acc.id} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{acc.name}</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400">
                {acc.institution_name}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Folio: {acc.account_number_masked || 'XXXX'}</p>
            <button
              onClick={() => {
                setSelectedAccount(acc);
                setSubAction('HOLDING');
              }}
              className="mt-2 text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] block"
            >
              + Add Mutual Fund Holding
            </button>
          </div>
        ))}

        {!showAddAccount && !subAction && (
          <button
            type="button"
            onClick={() => setShowAddAccount(true)}
            className="p-5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/30 hover:bg-slate-900/60 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-emerald-600/20 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 mb-1 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs">+ Add Mutual Fund Account</span>
          </button>
        )}
      </div>

      {/* Add Account Form */}
      {showAddAccount && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-4 max-w-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white text-sm">Add Mutual Fund Account</h4>
            <button onClick={() => setShowAddAccount(false)} className="text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Platform / AMC</label>
                <input
                  type="text"
                  placeholder="e.g. Groww, Zerodha Coin, CAMS"
                  value={accountForm.institution_name}
                  onChange={(e) => setAccountForm({ ...accountForm, institution_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Parag Parikh Folio"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddAccount(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manual MF Holding Form */}
      {subAction === 'HOLDING' && selectedAccount && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-4 max-w-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="font-bold text-white text-sm">
              Add Mutual Fund Scheme to {selectedAccount.name}
            </h4>
            <button onClick={() => setSubAction(null)} className="text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveMFHolding} className="space-y-3">
            <div className="relative">
              <label className="block text-slate-300 font-semibold mb-1">Search Fund Name *</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Parag Parikh Flexi Cap, HDFC Top 100"
                  value={searchQuery}
                  onChange={(e) => handleSearchFunds(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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
                            average_nav: String(sec.latest_price),
                            current_nav: String(sec.latest_price),
                          }));
                        }
                      }}
                      className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-white text-xs">{sec.name}</p>
                        <p className="text-[10px] text-slate-400">{sec.symbol} • {sec.security_type}</p>
                      </div>
                      {sec.latest_price && (
                        <span className="font-bold text-emerald-400">NAV {formatINR(sec.latest_price)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedSec && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                Selected: <strong>{selectedSec.name}</strong>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Accumulated Units (e.g. 42.3011) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="42.3011"
                  value={holdingForm.units}
                  onChange={(e) => setHoldingForm({ ...holdingForm, units: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Average Cost NAV (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="55.00"
                  value={holdingForm.average_nav}
                  onChange={(e) => setHoldingForm({ ...holdingForm, average_nav: e.target.value })}
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Save Mutual Fund
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Holdings List */}
      {holdings.length > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block text-slate-400">
            Configured Mutual Fund Positions ({holdings.length})
          </span>
          <div className="divide-y divide-slate-800">
            {holdings.map((h) => (
              <div key={h.security_id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{h.name}</span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    {h.current_quantity.toFixed(4)} units @ {formatINR(h.average_cost)}
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
          Skip Mutual Funds for Now
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all"
        >
          <span>Continue to Other Assets & Gold</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
