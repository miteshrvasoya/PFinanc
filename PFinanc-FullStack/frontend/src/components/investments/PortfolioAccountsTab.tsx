import React, { useState } from 'react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import { Building, Layers, ShieldCheck, Wallet, Plus, Trash2, Eye } from 'lucide-react';

interface PortfolioAccountsTabProps {
  accounts: any[];
  holdings: any[];
  onRefresh: () => void;
  onRecordTrade: (type?: string) => void;
}

export const PortfolioAccountsTab: React.FC<PortfolioAccountsTabProps> = ({ accounts, holdings, onRefresh, onRecordTrade }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    institution_name: '',
    account_type: 'BROKERAGE',
    account_number: '',
    opening_balance: '',
  });

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'BROKERAGE': return <Building className="w-5 h-5 text-indigo-400" />;
      case 'MUTUAL_FUND': return <Layers className="w-5 h-5 text-emerald-400" />;
      case 'RETIREMENT': return <ShieldCheck className="w-5 h-5 text-amber-400" />;
      default: return <Wallet className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAccount({
        name: formData.name || formData.institution_name,
        institution_name: formData.institution_name,
        account_type: formData.account_type,
        account_number: formData.account_number,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      });

      if (res.success) {
        setShowAddForm(false);
        setFormData({ name: '', institution_name: '', account_type: 'BROKERAGE', account_number: '', opening_balance: '' });
        onRefresh();
      } else {
        alert(res.error?.message || 'Failed to create account');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating account');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white text-lg">Investment & Brokerage Accounts</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel p-5 rounded-xl border border-indigo-500/30">
          <h4 className="font-bold text-white text-sm mb-4">New Investment Account</h4>
          <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Type</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="BROKERAGE">Stock Broker (Demat)</option>
                  <option value="MUTUAL_FUND">Mutual Fund / AMC</option>
                  <option value="RETIREMENT">Retirement (EPF/PPF)</option>
                  <option value="OTHER">Other Investment</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Institution / Platform</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zerodha, Groww"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Nickname (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Demat"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Number / Folio (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 12345678"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Opening Cash Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-12 glass-panel rounded-xl border border-slate-800">
          <Wallet className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">No investment accounts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/50">
                      {getAccountIcon(acc.account_type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{acc.account_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  <p className="text-xs text-slate-300"><span className="text-slate-500">Platform:</span> {acc.institution_name || 'N/A'}</p>
                  <p className="text-xs text-slate-300"><span className="text-slate-500">ID/Folio:</span> {acc.account_number_masked || 'N/A'}</p>
                </div>

                {/* Account Holdings Summary */}
                {(() => {
                  const accHoldings = holdings.filter(h => h.account_id === acc.id);
                  if (accHoldings.length === 0) {
                    return (
                      <div className="mt-2 py-2 border-t border-slate-800/80">
                        <p className="text-[11px] text-slate-500 text-center">No active holdings recorded</p>
                      </div>
                    );
                  }

                  const totalInvested = accHoldings.reduce((sum, h) => sum + h.total_invested, 0);
                  const currentValue = accHoldings.reduce((sum, h) => sum + h.current_value, 0);
                  const pnl = currentValue - totalInvested;
                  const isProfit = pnl >= 0;

                  return (
                    <div className="mt-2 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Invested</p>
                        <p className="font-semibold text-slate-300">{formatINR(totalInvested)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Current Value</p>
                        <p className="font-bold text-white">{formatINR(currentValue)}</p>
                        <p className={`text-[10px] font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}{formatINR(pnl)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-4">
                <span className="text-[11px] font-semibold text-slate-400">Manage Assets</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRecordTrade('INITIAL')}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1.5 rounded-lg transition-colors border border-emerald-500/20"
                  >
                    + Initial Data
                  </button>
                  <button
                    onClick={() => onRecordTrade('BUY')}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Add Trade/SIP
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
